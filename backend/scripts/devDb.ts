import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { isLocalMongoUri } from './seedData';

dotenv.config();

export const mongoUri: string = process.env.MONGO_URI || 'mongodb://localhost:27017/flashagenda';
export const frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:5188';

// Connect only to a local database unless explicitly forced, so dev scripts never touch production data
export async function connectLocalDb(): Promise<void> {
  if (!isLocalMongoUri(mongoUri) && process.env.SEED_FORCE !== '1') {
    console.error(`Abbruch: MONGO_URI zeigt nicht auf eine lokale Datenbank (${mongoUri}).`);
    console.error('Wenn das wirklich gewollt ist, mit SEED_FORCE=1 erneut starten.');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
}

export function formatAgendaLink(agenda: { _id: unknown; title: string; date?: string }): string {
  const date = agenda.date ? new Date(agenda.date).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–';
  return `  - ${agenda.title.padEnd(32)} ${date.padEnd(18)} ${frontendUrl}/agenda/${String(agenda._id)}`;
}

export function runScript(main: () => Promise<void>): void {
  main()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error('Fehlgeschlagen:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
