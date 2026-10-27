import readline from 'readline/promises';
import Agenda from '../src/models/Agenda';
import { connectLocalDb, mongoUri, runScript } from './devDb';
import { insertSeedAgendas } from './seed';

// Wipes all agendas of the local dev database and re-creates the example agendas.
// Admin settings (e.g. the admin password) are kept.
runScript(async () => {
  await connectLocalDb();

  const count = await Agenda.countDocuments();
  if (!process.argv.includes('--yes') && count > 0) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`${count} Agenden in ${mongoUri} werden gelöscht. Fortfahren? (j/N) `);
    rl.close();
    if (!['j', 'ja', 'y', 'yes'].includes(answer.trim().toLowerCase())) {
      console.log('Abgebrochen, nichts gelöscht.');
      return;
    }
  }

  const { deletedCount } = await Agenda.deleteMany({});
  console.log(`${deletedCount} Agenden gelöscht.\n`);
  await insertSeedAgendas();
});
