import { startRegistration, startAuthentication, browserSupportsWebAuthn, WebAuthnError } from '@simplewebauthn/browser';
import { getTotpCode } from './totpService';

/**
 * Passkeys (WebAuthn) as a third proof of identity next to the fixed code and TOTP.
 * Logging in hands this device the person's own secrets, exactly like login-by-code.
 */

export type PasskeyErrorKind = 'cancelled' | 'unsupported' | 'locked' | 'config' | 'failed';

export class PasskeyError extends Error {
  readonly kind: PasskeyErrorKind;
  readonly status?: number;
  constructor(kind: PasskeyErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'PasskeyError';
    this.kind = kind;
    this.status = status;
  }
}

export interface PasskeyInfo {
  id: string;
  label: string;
  deviceType?: 'singleDevice' | 'multiDevice';
  backedUp?: boolean;
  createdAt?: string;
  lastUsedAt?: string;
}

interface OwnUser {
  id?: string;
  _id?: string;
  name?: string;
  securityCode?: string;
  secretGuid?: string;
}

export const PASSKEY_MESSAGES: Record<PasskeyErrorKind, string> = {
  cancelled: 'Passkey-Anmeldung abgebrochen.',
  unsupported: 'Dein Browser unterstützt keine Passkeys.',
  locked: 'Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.',
  config: 'Passkeys sind auf dieser Domain nicht eingerichtet.',
  failed: 'Das hat mit dem Passkey nicht geklappt. Du kannst weiterhin deinen Code nutzen.'
};

export function isPasskeySupported(): boolean {
  try {
    return typeof window !== 'undefined' && browserSupportsWebAuthn();
  } catch {
    return false;
  }
}

/** The device proves it is this person with its own stored code (fixed code, otherwise the current TOTP). */
export function ownProofCode(user: OwnUser | null | undefined): string {
  if (!user) return '';
  if (user.securityCode) return String(user.securityCode).trim();
  if (user.secretGuid) return getTotpCode(user.secretGuid, 300).code;
  return '';
}

/** A label for a new passkey, derived from the device so the list stays readable. */
export function suggestPasskeyLabel(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android-Gerät';
  if (/Windows/i.test(ua)) return 'Windows-PC';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux-PC';
  return 'Gerät';
}

export function describePasskeyError(err: unknown): string {
  if (err instanceof PasskeyError) return PASSKEY_MESSAGES[err.kind];
  return PASSKEY_MESSAGES[classifyBrowserError(err)];
}

function classifyBrowserError(err: unknown): PasskeyErrorKind {
  const anyErr = err as { name?: string; code?: string; message?: string } | null;
  const code = anyErr?.code || '';
  const name = anyErr?.name || '';
  if (err instanceof WebAuthnError) {
    if (code === 'ERROR_CEREMONY_ABORTED' || name === 'NotAllowedError') return 'cancelled';
    if (code.includes('INVALID_RP_ID') || code.includes('INVALID_DOMAIN')) return 'config';
    if (code === 'ERROR_AUTHENTICATOR_GENERAL_ERROR' || code.includes('NOT_SUPPORTED')) return 'unsupported';
    return 'failed';
  }
  if (name === 'NotAllowedError' || name === 'AbortError') return 'cancelled';
  if (name === 'SecurityError') return 'config';
  if (name === 'NotSupportedError') return 'unsupported';
  return 'failed';
}

async function call(path: string, init: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch {
    throw new PasskeyError('failed', 'network');
  }
  if (res.status === 429) throw new PasskeyError('locked', 'locked', 429);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PasskeyError('failed', data?.message || `HTTP ${res.status}`, res.status);
  return data;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export async function registerPasskey(user: OwnUser, label: string = suggestPasskeyLabel()): Promise<PasskeyInfo> {
  if (!isPasskeySupported()) throw new PasskeyError('unsupported', 'unsupported');
  const personId = user.id || user._id;
  const code = ownProofCode(user);
  if (!personId || !code) throw new PasskeyError('failed', 'no identity on this device');

  const { options, challengeToken } = await call('/api/passkeys/register/options', json({ personId, code }));
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (err) {
    throw new PasskeyError(classifyBrowserError(err), (err as Error)?.message || 'registration failed');
  }
  const data = await call('/api/passkeys/register/verify', json({ challengeToken, response, label }));
  return data.credential as PasskeyInfo;
}

export async function loginWithPasskey(): Promise<any> {
  if (!isPasskeySupported()) throw new PasskeyError('unsupported', 'unsupported');
  const { options, challengeToken } = await call('/api/passkeys/login/options', json({}));
  let response;
  try {
    response = await startAuthentication({ optionsJSON: options });
  } catch (err) {
    throw new PasskeyError(classifyBrowserError(err), (err as Error)?.message || 'authentication failed');
  }
  const data = await call('/api/passkeys/login/verify', json({ challengeToken, response }));
  if (!data?.user) throw new PasskeyError('failed', 'no user in response');
  return data.user;
}

export async function listPasskeys(user: OwnUser): Promise<PasskeyInfo[]> {
  const personId = user.id || user._id;
  const code = ownProofCode(user);
  if (!personId || !code) return [];
  const params = new URLSearchParams({ personId: String(personId), code });
  const data = await call(`/api/passkeys/list?${params.toString()}`, { method: 'GET' });
  if (!Array.isArray(data)) throw new PasskeyError('failed', 'unexpected list response');
  return data;
}

export async function deletePasskey(user: OwnUser, id: string): Promise<void> {
  const personId = user.id || user._id;
  const code = ownProofCode(user);
  if (!personId || !code) throw new PasskeyError('failed', 'no identity on this device');
  await call(`/api/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ personId, code }) });
}
