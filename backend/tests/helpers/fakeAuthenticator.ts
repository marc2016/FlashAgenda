// A minimal software authenticator for tests: produces real WebAuthn registration and
// authentication responses (ES256, attestation "none") that @simplewebauthn/server accepts.
import { createHash, generateKeyPairSync, sign, randomBytes, KeyObject } from 'crypto';
import { isoCBOR, isoBase64URL } from '@simplewebauthn/server/helpers';

const b64u = (b: Uint8Array | Buffer) => isoBase64URL.fromBuffer(new Uint8Array(b));
const sha256 = (b: Uint8Array | Buffer) => createHash('sha256').update(b).digest();

export class FakeAuthenticator {
  readonly credentialId: Buffer;
  private readonly privateKey: KeyObject;
  private readonly cosePublicKey: Uint8Array;
  counter = 0;

  constructor(readonly rpID: string, readonly origin: string, readonly userHandle = 'user') {
    this.credentialId = randomBytes(16);
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    this.privateKey = privateKey;
    const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
    const cose = new Map<number, number | Uint8Array>([
      [1, 2],   // kty: EC2
      [3, -7],  // alg: ES256
      [-1, 1],  // crv: P-256
      [-2, Buffer.from(jwk.x, 'base64url')],
      [-3, Buffer.from(jwk.y, 'base64url')]
    ]);
    this.cosePublicKey = isoCBOR.encode(cose);
  }

  get id(): string {
    return b64u(this.credentialId);
  }

  private authData(flags: number, withCredential: boolean): Buffer {
    const counterBuf = Buffer.alloc(4);
    counterBuf.writeUInt32BE(this.counter);
    const parts = [sha256(Buffer.from(this.rpID)), Buffer.from([flags]), counterBuf];
    if (withCredential) {
      const len = Buffer.alloc(2);
      len.writeUInt16BE(this.credentialId.length);
      parts.push(Buffer.alloc(16), len, this.credentialId, Buffer.from(this.cosePublicKey));
    }
    return Buffer.concat(parts);
  }

  private clientData(type: 'webauthn.create' | 'webauthn.get', challenge: string, origin = this.origin): Buffer {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }

  register(challenge: string, origin?: string) {
    const authData = this.authData(0x01 | 0x04 | 0x40, true); // UP, UV, AT
    const attestationObject = isoCBOR.encode(new Map<string, unknown>([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      clientExtensionResults: {},
      response: {
        clientDataJSON: b64u(this.clientData('webauthn.create', challenge, origin)),
        attestationObject: b64u(attestationObject),
        transports: ['internal']
      }
    };
  }

  authenticate(challenge: string, origin?: string, privateKey: KeyObject = this.privateKey) {
    this.counter += 1;
    const authData = this.authData(0x01 | 0x04, false); // UP, UV
    const clientDataJSON = this.clientData('webauthn.get', challenge, origin);
    const signature = sign('sha256', Buffer.concat([authData, sha256(clientDataJSON)]), privateKey);
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      clientExtensionResults: {},
      response: {
        clientDataJSON: b64u(clientDataJSON),
        authenticatorData: b64u(authData),
        signature: b64u(signature),
        userHandle: b64u(Buffer.from(this.userHandle))
      }
    };
  }

  /** An assertion signed with a different key: looks valid, verifies as forged. */
  forged(challenge: string) {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    return this.authenticate(challenge, undefined, privateKey);
  }
}
