import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { broadcast } = vi.hoisted(() => ({ broadcast: vi.fn() }));
vi.mock('../src/services/socketService', () => ({
  broadcastAgendaEvent: broadcast,
  initSocketService: vi.fn()
}));

import app from '../src/app';
import Agenda from '../src/models/Agenda';

const AGENDA_ID = '507f1f77bcf86cd799439011';
let doc: any;

function makeAgenda(overrides: any = {}) {
  const agenda: any = new Agenda({
    _id: AGENDA_ID,
    title: 'Geheim',
    createdBy: 'anna',
    attendees: [
      { id: 'anna', name: 'Anna', securityCode: '4711', secretGuid: 'guid-anna', isRegistered: true, cardColor: '#8b0000' },
      { id: 'tom', name: 'Tom', isRegistered: false }
    ],
    items: [],
    ...overrides
  });
  agenda.save = vi.fn(async () => agenda);
  return agenda;
}

beforeEach(() => {
  broadcast.mockClear();
  doc = makeAgenda();
  vi.spyOn(Agenda, 'findById').mockImplementation((async () => doc) as any);
  vi.spyOn(Agenda, 'find').mockImplementation((() => {
    const p: any = Promise.resolve([doc]);
    p.sort = () => ({ limit: async () => [doc] });
    return p;
  }) as any);
});

const noSecrets = (value: unknown) => {
  const json = JSON.stringify(value);
  expect(json).not.toContain('securityCode');
  expect(json).not.toContain('secretGuid');
  expect(json).not.toContain('4711');
  expect(json).not.toContain('guid-anna');
};

describe('Agenda responses hide attendee secrets', () => {
  it('GET /api/agendas/:id', async () => {
    const res = await request(app).get(`/api/agendas/${AGENDA_ID}`);
    expect(res.status).toBe(200);
    noSecrets(res.body);
    expect(res.body.attendees[0].isRegistered).toBe(true);
  });

  it('socket payload after adding an item', async () => {
    const res = await request(app).post(`/api/agendas/${AGENDA_ID}/items`).send({ title: 'Neu', author: 'Anna' });
    expect(res.status).toBe(201);
    noSecrets(res.body);
    expect(broadcast).toHaveBeenCalled();
    for (const call of broadcast.mock.calls) noSecrets(call[2]);
  });
});

describe('Endpoints that hand a device its own secrets', () => {
  it('login-by-code still returns the matched person with their own secrets', async () => {
    vi.spyOn(Agenda, 'findOne').mockImplementation((async () => doc) as any);
    const res = await request(app).post('/api/agendas/login-by-code').send({ code: '4711' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'anna', name: 'Anna', securityCode: '4711', secretGuid: 'guid-anna' });
  });
});
