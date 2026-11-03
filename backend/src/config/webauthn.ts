// Passkey (WebAuthn) relying-party settings. Defaults work for local development only.
export interface WebAuthnConfig {
  rpID: string;
  rpName: string;
  origins: string[];
}

export function loadWebAuthnConfig(env: NodeJS.ProcessEnv = process.env): WebAuthnConfig {
  const rpID = (env.WEBAUTHN_RP_ID || 'localhost').trim();
  const rpName = (env.WEBAUTHN_RP_NAME || 'FlashAgenda').trim();
  const originsRaw = env.WEBAUTHN_ORIGIN || 'http://localhost:5188,http://localhost:3188';
  const origins = originsRaw
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return { rpID, rpName, origins };
}

export const webauthnConfig: WebAuthnConfig = loadWebAuthnConfig();
