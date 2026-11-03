import mongoose, { Schema, Document } from 'mongoose';

// One passkey (WebAuthn credential) of a person. personId is the stable attendee id that a
// person keeps across agendas; there is no global user collection.
export interface IPasskeyCredential extends Document {
  credentialId: string;      // base64url
  personId: string;
  personName: string;
  publicKey: Buffer;
  counter: number;
  transports: string[];
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  label: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

const PasskeyCredentialSchema = new Schema<IPasskeyCredential>({
  credentialId: { type: String, required: true, unique: true },
  personId: { type: String, required: true, index: true },
  personName: { type: String, required: true },
  publicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true, default: 0 },
  transports: { type: [String], default: [] },
  deviceType: { type: String, enum: ['singleDevice', 'multiDevice'], default: 'singleDevice' },
  backedUp: { type: Boolean, default: false },
  label: { type: String, default: 'Passkey' },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date }
});

// What the owner sees in their passkey list (never the public key)
export function publicPasskey(c: Pick<IPasskeyCredential, 'credentialId' | 'label' | 'deviceType' | 'backedUp' | 'createdAt' | 'lastUsedAt'>) {
  return {
    id: c.credentialId,
    label: c.label,
    deviceType: c.deviceType,
    backedUp: c.backedUp,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt
  };
}

export default mongoose.model<IPasskeyCredential>('PasskeyCredential', PasskeyCredentialSchema);
