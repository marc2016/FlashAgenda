import { describe, it, expect } from 'vitest';
import PasskeyCredential, { publicPasskey } from '../src/models/PasskeyCredential';
import { loadWebAuthnConfig } from '../src/config/webauthn';

describe('PasskeyCredential model', () => {
  it('validates a complete credential and applies defaults', async () => {
    const doc = new PasskeyCredential({
      credentialId: 'abc',
      personId: 'anna',
      personName: 'Anna',
      publicKey: Buffer.from([1, 2, 3])
    });
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.counter).toBe(0);
    expect(doc.deviceType).toBe('singleDevice');
    expect(doc.label).toBe('Passkey');
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a credential without owner or key', async () => {
    await expect(new PasskeyCredential({ credentialId: 'abc' }).validate()).rejects.toBeTruthy();
  });

  it('exposes only the public shape to the owner', () => {
    const shape = publicPasskey({ credentialId: 'abc', label: 'Handy', deviceType: 'multiDevice', backedUp: true, createdAt: new Date(0) } as any);
    expect(Object.keys(shape).sort()).toEqual(['backedUp', 'createdAt', 'deviceType', 'id', 'label', 'lastUsedAt']);
    expect(shape.id).toBe('abc');
  });
});

describe('WebAuthn config', () => {
  it('uses localhost defaults and parses origin lists', () => {
    expect(loadWebAuthnConfig({})).toEqual({ rpID: 'localhost', rpName: 'FlashAgenda', origins: ['http://localhost:5188', 'http://localhost:3188'] });
    expect(loadWebAuthnConfig({ WEBAUTHN_RP_ID: ' agenda.example.org ', WEBAUTHN_ORIGIN: 'https://agenda.example.org/, https://www.example.org' }))
      .toEqual({ rpID: 'agenda.example.org', rpName: 'FlashAgenda', origins: ['https://agenda.example.org', 'https://www.example.org'] });
  });
});
