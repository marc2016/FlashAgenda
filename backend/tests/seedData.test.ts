import { describe, it, expect } from 'vitest';
import Agenda from '../src/models/Agenda';
import { isAgendaClosed } from '../src/routes/agenda';
import { buildSeedAgendas, isLocalMongoUri, SEED_AGENDA_IDS, SEED_PEOPLE } from '../scripts/seedData';

describe('Dev seed data', () => {
  const now = new Date('2026-10-27T12:00:00.000Z').getTime();
  const agendas = buildSeedAgendas(now);

  it('uses exactly the fixed seed ids', () => {
    expect(agendas.map((a) => a._id)).toEqual(SEED_AGENDA_IDS);
  });

  it('every seed agenda passes the Agenda schema validation', async () => {
    for (const data of agendas) {
      await expect(new Agenda(data).validate(), data.title).resolves.toBeUndefined();
    }
  });

  it('covers the main app states', () => {
    const [stammtisch, retro, streetFestival, grillabend] = agendas as any[];

    expect(stammtisch.includeStandardItems).toBe(true);
    expect(stammtisch.items.some((i: any) => i.poll)).toBe(true);
    expect(isAgendaClosed(stammtisch)).toBe(false);

    expect(retro.liveMeetingStatus).toBe('completed');
    expect(retro.items.some((i: any) => i.comments?.some((c: any) => c.text.startsWith('📝')))).toBe(true);

    expect(streetFestival.liveMeetingActive).toBe(true);
    expect(streetFestival.title).toContain('ß');

    expect(isAgendaClosed(grillabend)).toBe(true);
    expect(grillabend.items.some((i: any) => i.transferredTo?.status === 'pending')).toBe(true);
  });

  it('only references known people and unique login codes', () => {
    const ids = Object.values(SEED_PEOPLE).map((p) => p.id);
    const codes = Object.values(SEED_PEOPLE).map((p) => p.securityCode);
    expect(new Set(codes).size).toBe(codes.length);

    for (const agenda of agendas as any[]) {
      expect(ids).toContain(agenda.createdBy);
      for (const item of agenda.items) {
        if (item.createdBy !== 'system') expect(ids).toContain(item.createdBy);
        for (const voter of item.upvotes) expect(ids).toContain(voter);
      }
    }
  });

  it('only allows local MongoDB URIs by default', () => {
    expect(isLocalMongoUri('mongodb://localhost:27017/flashagenda')).toBe(true);
    expect(isLocalMongoUri('mongodb://127.0.0.1:30303/flashagenda')).toBe(true);
    expect(isLocalMongoUri('mongodb://mongodb:27017/flashagenda')).toBe(false);
    expect(isLocalMongoUri('mongodb+srv://user:pw@cluster0.example.net/prod')).toBe(false);
    expect(isLocalMongoUri('kaputt')).toBe(false);
  });
});
