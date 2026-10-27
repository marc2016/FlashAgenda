import Agenda from '../src/models/Agenda';
import { buildSeedAgendas, SEED_AGENDA_IDS, SEED_PEOPLE } from './seedData';
import { connectLocalDb, formatAgendaLink, runScript } from './devDb';

// Inserts the example agendas; replaces only the seed documents and keeps everything else
export async function insertSeedAgendas(): Promise<void> {
  const agendas = buildSeedAgendas();
  await Agenda.deleteMany({ _id: { $in: SEED_AGENDA_IDS } });
  await Agenda.insertMany(agendas);

  console.log(`${agendas.length} Beispiel-Agenden angelegt:`);
  for (const agenda of agendas) console.log(formatAgendaLink(agenda));
  console.log('\nLogin auf der Startseite per Code:');
  for (const person of Object.values(SEED_PEOPLE)) {
    console.log(`  - ${person.name.padEnd(16)} ${person.securityCode}`);
  }
}

if (require.main === module) {
  runScript(async () => {
    await connectLocalDb();
    await insertSeedAgendas();
  });
}
