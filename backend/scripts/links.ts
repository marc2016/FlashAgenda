import Agenda from '../src/models/Agenda';
import { connectLocalDb, formatAgendaLink, runScript } from './devDb';

// Lists all agendas of the local dev database with their links (read-only)
runScript(async () => {
  await connectLocalDb();
  const agendas = await Agenda.find({}, { title: 1, date: 1 }).sort({ updatedAt: -1 }).lean();

  if (agendas.length === 0) {
    console.log('Keine Agenden vorhanden. Beispiele anlegen mit: npm run reset');
    return;
  }
  console.log(`${agendas.length} Agenden:`);
  for (const agenda of agendas) console.log(formatAgendaLink(agenda as any));
});
