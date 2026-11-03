import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { generateKeyPairSync, randomBytes } from 'crypto';

// Passkeys run against Chromium's virtual authenticator (CDP). The server is mocked:
// it hands out fixed WebAuthn options and accepts whatever the authenticator signs.
test.describe('FlashAgenda - Passkeys', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'virtual authenticator needs Chromium');

  const AGENDA_ID = 'mock-agenda-pk';
  const ANNA_PUBLIC = { id: 'anna-1', name: 'Anna Schmidt', cardColor: '#8b0000', isRegistered: true };
  const ANNA = { ...ANNA_PUBLIC, securityCode: '4711', secretGuid: 'guid-anna' };
  const TOM = { id: 'tom-1', name: 'Tom Neu', cardColor: '#2f6b2f', isRegistered: false };

  const b64u = (b: Buffer) => b.toString('base64url');
  const regOptions = () => ({
    rp: { name: 'FlashAgenda', id: 'localhost' },
    user: { id: b64u(Buffer.from('anna-1')), name: 'Anna Schmidt', displayName: 'Anna Schmidt' },
    challenge: b64u(randomBytes(32)),
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: [],
    authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' }
  });
  const loginOptions = () => ({
    challenge: b64u(randomBytes(32)),
    rpId: 'localhost',
    allowCredentials: [],
    userVerification: 'preferred',
    timeout: 60000
  });

  interface MockState { passkeys: { id: string; label: string; createdAt: string }[]; agenda: any; }

  async function mockServer(page: Page, state: MockState) {
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = req.url();
      const path = new URL(url).pathname;
      const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

      if (path === '/api/passkeys/register/options') return json(200, { options: regOptions(), challengeToken: 'reg-token' });
      if (path === '/api/passkeys/register/verify') {
        const body = req.postDataJSON();
        const credential = { id: body.response.id, label: body.label || 'Passkey', createdAt: new Date().toISOString() };
        state.passkeys.push(credential);
        return json(201, { success: true, credential });
      }
      if (path === '/api/passkeys/login/options') return json(200, { options: loginOptions(), challengeToken: 'login-token' });
      if (path === '/api/passkeys/login/verify') {
        const body = req.postDataJSON();
        if (state.passkeys.some(p => p.id === body.response?.id)) return json(200, { success: true, user: ANNA });
        return json(401, { message: 'Unbekannter Passkey.' });
      }
      if (path === '/api/passkeys/list') return json(200, state.passkeys);
      if (path.startsWith('/api/passkeys/') && req.method() === 'DELETE') {
        const id = decodeURIComponent(path.split('/').pop() || '');
        state.passkeys = state.passkeys.filter(p => p.id !== id);
        return json(200, { success: true });
      }

      if (path.endsWith('/verify') && path.includes('/attendees/')) {
        const code = req.postDataJSON()?.code;
        return code === '4711' ? json(200, { success: true, user: ANNA }) : json(401, { message: 'Falscher Code' });
      }
      if (path.includes('/attendees') && req.method() === 'POST') {
        const body = req.postDataJSON();
        if (!state.agenda.attendees.some((a: any) => a.id === body.id)) {
          state.agenda.attendees.push({ id: body.id, name: body.name, cardColor: body.cardColor, isRegistered: !!body.isRegistered });
        }
        return json(201, state.agenda);
      }
      if (path.includes('/achievements')) return json(200, { teamMilestones: [], personalAchievements: [], dynamicLeaders: [], milestonesUnlocked: 0, totalMilestones: 0 });
      if (path.includes('/user-achievements')) return json(200, { rank: {}, achievements: [] });
      if (path.includes('/audits') || path.includes('/user-agendas')) return json(200, []);
      if (path.includes('/user-stats')) return json(200, { agendasCount: 1, totalItemsContributed: 0 });
      if (path.includes('/user-profile')) return json(200, { success: true });
      return json(200, state.agenda);
    });
  }

  function freshState(withAnna = true): MockState {
    return {
      passkeys: [],
      agenda: { _id: AGENDA_ID, title: 'Passkey-Test', items: [], attendees: withAnna ? [ANNA_PUBLIC, TOM] : [TOM] }
    };
  }

  async function virtualAuthenticator(page: Page): Promise<{ cdp: CDPSession; authenticatorId: string }> {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable', { enableUI: false });
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true }
    });
    return { cdp, authenticatorId };
  }

  /** Puts a discoverable credential for Anna onto the virtual authenticator and registers it with the mock server. */
  async function seedCredential(cdp: CDPSession, authenticatorId: string, state: MockState) {
    const credentialId = randomBytes(16);
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    await cdp.send('WebAuthn.addCredential', {
      authenticatorId,
      credential: {
        credentialId: credentialId.toString('base64'),
        isResidentCredential: true,
        rpId: 'localhost',
        privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
        userHandle: Buffer.from('anna-1').toString('base64'),
        signCount: 0
      }
    });
    state.passkeys.push({ id: b64u(credentialId), label: 'Handy', createdAt: new Date().toISOString() });
  }

  const storedUser = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
  const signedInAsAnna = (page: Page) => page.addInitScript((user) => {
    localStorage.setItem('flashagenda_last_user', JSON.stringify(user));
    localStorage.setItem('flashagenda_passkey_hint_dismissed', 'true');
  }, ANNA);

  test('no passkey button in a browser without WebAuthn', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    await page.addInitScript(() => { delete (window as any).PublicKeyCredential; });
    await page.goto(`/agenda/${AGENDA_ID}`);
    await expect(page.locator('text=Wer bist du?')).toBeVisible();
    await expect(page.getByTestId('passkey-login')).toHaveCount(0);
  });

  test('sets up and deletes a passkey in the profile', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    await signedInAsAnna(page);
    await virtualAuthenticator(page);
    await page.goto('/');
    await page.locator('button[title="Mein Benutzerprofil & Pass"]').click();

    const section = page.getByTestId('passkey-section');
    await expect(section).toBeVisible();
    await expect(page.getByTestId('passkey-empty')).toBeVisible();

    await page.getByTestId('passkey-register').click();
    await expect(page.getByTestId('passkey-item')).toHaveCount(1);
    expect(state.passkeys).toHaveLength(1);

    await page.getByTestId('passkey-delete').click();
    await expect(page.getByTestId('passkey-empty')).toBeVisible();
    expect(state.passkeys).toHaveLength(0);
  });

  test('signs in with a passkey in the "Wer bist du?" dialog', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    const { cdp, authenticatorId } = await virtualAuthenticator(page);
    await seedCredential(cdp, authenticatorId, state);
    await page.goto(`/agenda/${AGENDA_ID}`);
    await expect(page.locator('text=Wer bist du?')).toBeVisible();

    await page.getByTestId('passkey-login').click();
    await expect(page.locator('text=Wer bist du?')).toBeHidden();
    expect(await storedUser(page, `flashagenda_${AGENDA_ID}_user`)).toMatchObject({ id: 'anna-1', securityCode: '4711', secretGuid: 'guid-anna' });
    await expect(page.locator('text=Das bist du')).toBeVisible();
  });

  test('signs in with a passkey on the home page', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    const { cdp, authenticatorId } = await virtualAuthenticator(page);
    await seedCredential(cdp, authenticatorId, state);
    await page.goto('/');
    await page.locator('#code-login-header-btn').click();
    await page.getByTestId('passkey-login').click();
    await expect(page.getByTestId('agenda-overview')).toBeVisible();
    await expect(page.getByTestId('agenda-overview')).toContainText('Anna Schmidt');
    expect(await storedUser(page, 'flashagenda_last_user')).toMatchObject({ id: 'anna-1', securityCode: '4711' });
  });

  test('joins the agenda when the passkey person is not listed yet', async ({ page }) => {
    const state = freshState(false);
    await mockServer(page, state);
    const { cdp, authenticatorId } = await virtualAuthenticator(page);
    await seedCredential(cdp, authenticatorId, state);
    await page.goto(`/agenda/${AGENDA_ID}`);
    await page.getByTestId('passkey-login').click();
    await expect(page.locator('text=Wer bist du?')).toBeHidden();
    expect(state.agenda.attendees.map((a: any) => a.id)).toContain('anna-1');
    expect(await storedUser(page, `flashagenda_${AGENDA_ID}_user`)).toMatchObject({ id: 'anna-1', securityCode: '4711' });
  });

  test('shows a hint when the passkey prompt is cancelled and keeps the code path', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    await page.addInitScript(() => {
      navigator.credentials.get = () => Promise.reject(new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError'));
    });
    await page.goto(`/agenda/${AGENDA_ID}`);
    await page.getByTestId('passkey-login').click();
    await expect(page.getByTestId('passkey-error')).toContainText('abgebrochen');
    await expect(page.locator('text=Wer bist du?')).toBeVisible();
    await expect(page.locator('button:has-text("Anna Schmidt")')).toBeVisible();
  });

  test('offers a passkey once after signing in by code, and not again after dismissing', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    await virtualAuthenticator(page);
    await page.goto(`/agenda/${AGENDA_ID}`);
    await page.locator('button:has-text("Anna Schmidt")').click();
    const dialog = page.locator('.p-dialog:has-text("Sicherheitscode bestätigen")');
    await dialog.locator('input').fill('4711');
    await dialog.locator('button:has-text("Bestätigen")').click();

    const hint = page.getByTestId('passkey-hint');
    await expect(hint).toBeVisible();
    await page.getByTestId('passkey-hint-dismiss').click();
    await expect(hint).toBeHidden();
    await page.reload();
    await expect(page.locator('text=Das bist du')).toBeVisible();
    await expect(hint).toHaveCount(0);
  });

  test('sets up the passkey straight from the hint', async ({ page }) => {
    const state = freshState();
    await mockServer(page, state);
    await page.addInitScript((user) => localStorage.setItem(`flashagenda_mock-agenda-pk_user`, JSON.stringify(user)), ANNA);
    await virtualAuthenticator(page);
    await page.goto(`/agenda/${AGENDA_ID}`);
    const hint = page.getByTestId('passkey-hint');
    await expect(hint).toBeVisible();
    await page.getByTestId('passkey-hint-register').click();
    await expect(hint).toContainText('Passkey eingerichtet');
    expect(state.passkeys).toHaveLength(1);
    await page.reload();
    await expect(page.locator('text=Das bist du')).toBeVisible();
    await expect(hint).toHaveCount(0);
  });
});
