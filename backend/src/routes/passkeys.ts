import express, { Request, Response, Router } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import PasskeyCredential, { publicPasskey } from '../models/PasskeyCredential';
import { webauthnConfig } from '../config/webauthn';
import {
  findAttendeeAcrossAgendas,
  isCodeValidFor,
  currentFailures,
  recordFailure,
  ownUserResponse,
  VERIFY_MAX_FAILURES
} from './agenda';

const router: Router = express.Router();

// Challenges live in memory for one instance, are single-use and expire after 5 minutes.
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
interface PendingChallenge { challenge: string; personId?: string; personName?: string; expiresAt: number }
const challenges = new Map<string, PendingChallenge>();

function putChallenge(challenge: string, person?: { id: string; name: string }, now: number = Date.now()): string {
  for (const [token, entry] of challenges) {
    if (entry.expiresAt <= now) challenges.delete(token);
  }
  const token = randomUUID();
  challenges.set(token, { challenge, personId: person?.id, personName: person?.name, expiresAt: now + CHALLENGE_TTL_MS });
  return token;
}

function takeChallenge(token: unknown, now: number = Date.now()): PendingChallenge | null {
  if (typeof token !== 'string') return null;
  const entry = challenges.get(token);
  challenges.delete(token);
  if (!entry || entry.expiresAt <= now) return null;
  return entry;
}

export function resetPasskeyState(): void {
  challenges.clear();
}

// Registering, listing and deleting passkeys requires proof of being that person: their own code.
async function provePerson(req: Request, res: Response): Promise<any | null> {
  const source = req.method === 'GET' ? req.query : (req.body || {});
  const personId = typeof source.personId === 'string' ? source.personId.trim() : '';
  const code = typeof source.code === 'string' ? source.code.trim() : '';
  if (!personId || !code) {
    res.status(400).json({ message: 'personId und code sind erforderlich' });
    return null;
  }
  const attendee = await findAttendeeAcrossAgendas(personId);
  if (!attendee) {
    res.status(404).json({ message: 'Person nicht gefunden' });
    return null;
  }
  const key = `passkey:${personId}`;
  const now = Date.now();
  if (currentFailures(key, now) >= VERIFY_MAX_FAILURES) {
    res.status(429).json({ message: 'Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.' });
    return null;
  }
  if (!isCodeValidFor(attendee, code)) {
    recordFailure(key, now);
    res.status(401).json({ message: 'Falscher Code' });
    return null;
  }
  return attendee;
}

router.post('/register/options', async (req: Request, res: Response): Promise<void> => {
  try {
    const attendee = await provePerson(req, res);
    if (!attendee) return;
    const existing = await PasskeyCredential.find({ personId: attendee.id });
    const options = await generateRegistrationOptions({
      rpName: webauthnConfig.rpName,
      rpID: webauthnConfig.rpID,
      userID: new TextEncoder().encode(attendee.id),
      userName: attendee.name,
      userDisplayName: attendee.name,
      attestationType: 'none',
      excludeCredentials: existing.map(c => ({ id: c.credentialId, transports: c.transports })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
    });
    const challengeToken = putChallenge(options.challenge, { id: attendee.id, name: attendee.name });
    res.json({ options, challengeToken });
  } catch (error) {
    console.error('Error POST /passkeys/register/options:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const pending = takeChallenge(req.body?.challengeToken);
    if (!pending || !pending.personId) {
      res.status(400).json({ message: 'Die Anfrage ist abgelaufen. Bitte versuche es erneut.' });
      return;
    }
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: req.body?.response,
        expectedChallenge: pending.challenge,
        expectedOrigin: webauthnConfig.origins,
        expectedRPID: webauthnConfig.rpID,
        requireUserVerification: false
      });
    } catch (err: any) {
      res.status(400).json({ message: `Passkey konnte nicht geprüft werden: ${err?.message || 'unbekannter Fehler'}` });
      return;
    }
    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ message: 'Passkey konnte nicht geprüft werden.' });
      return;
    }
    const info = verification.registrationInfo;
    const label = typeof req.body?.label === 'string' && req.body.label.trim() ? req.body.label.trim().slice(0, 60) : 'Passkey';
    try {
      const created = await PasskeyCredential.create({
        credentialId: info.credential.id,
        personId: pending.personId,
        personName: pending.personName || '',
        publicKey: Buffer.from(info.credential.publicKey),
        counter: info.credential.counter,
        transports: info.credential.transports || [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
        label
      });
      res.status(201).json({ success: true, credential: publicPasskey(created) });
    } catch (err: any) {
      if (err?.code === 11000) {
        res.status(409).json({ message: 'Dieser Passkey ist bereits registriert.' });
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error('Error POST /passkeys/register/verify:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login/options', async (_req: Request, res: Response): Promise<void> => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: webauthnConfig.rpID,
      allowCredentials: [],
      userVerification: 'preferred'
    });
    const challengeToken = putChallenge(options.challenge);
    res.json({ options, challengeToken });
  } catch (error) {
    console.error('Error POST /passkeys/login/options:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.' }
});

// Signing in with a passkey hands this device the person's own secrets, exactly like login-by-code.
router.post('/login/verify', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const pending = takeChallenge(req.body?.challengeToken);
    if (!pending) {
      res.status(400).json({ message: 'Die Anfrage ist abgelaufen. Bitte versuche es erneut.' });
      return;
    }
    const response = req.body?.response;
    const credentialId = typeof response?.id === 'string' ? response.id : '';
    const stored = credentialId ? await PasskeyCredential.findOne({ credentialId }) : null;
    if (!stored) {
      res.status(401).json({ message: 'Unbekannter Passkey.' });
      return;
    }
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: webauthnConfig.origins,
        expectedRPID: webauthnConfig.rpID,
        credential: {
          id: stored.credentialId,
          publicKey: new Uint8Array(stored.publicKey),
          counter: stored.counter,
          transports: stored.transports
        },
        requireUserVerification: false
      });
    } catch (err: any) {
      res.status(401).json({ message: `Passkey-Anmeldung fehlgeschlagen: ${err?.message || 'unbekannter Fehler'}` });
      return;
    }
    if (!verification.verified) {
      res.status(401).json({ message: 'Passkey-Anmeldung fehlgeschlagen.' });
      return;
    }
    await PasskeyCredential.updateOne(
      { credentialId: stored.credentialId },
      { $set: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() } }
    );
    const attendee = await findAttendeeAcrossAgendas(stored.personId);
    if (!attendee) {
      res.status(404).json({ message: 'Diese Person ist in keiner Agenda mehr eingetragen.' });
      return;
    }
    res.json({ success: true, user: ownUserResponse(attendee) });
  } catch (error) {
    console.error('Error POST /passkeys/login/verify:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const attendee = await provePerson(req, res);
    if (!attendee) return;
    const list = await PasskeyCredential.find({ personId: attendee.id });
    res.json(list.map(publicPasskey));
  } catch (error) {
    console.error('Error GET /passkeys/list:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:credentialId', async (req: Request, res: Response): Promise<void> => {
  try {
    const attendee = await provePerson(req, res);
    if (!attendee) return;
    const result = await PasskeyCredential.deleteOne({ credentialId: req.params.credentialId, personId: attendee.id });
    if (!result.deletedCount) {
      res.status(404).json({ message: 'Passkey nicht gefunden.' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error DELETE /passkeys/:credentialId:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
