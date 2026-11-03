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

describe('Writing attendee lists keeps stored secrets', () => {
  const stored = () => doc.toObject().attendees.find((a: any) => a.id === 'anna');

  it('saving the list without secrets keeps codes', async () => {
    const res = await request(app).put(`/api/agendas/${AGENDA_ID}`).send({
      userName: 'Anna',
      attendees: [
        { id: 'tom', name: 'Tom', isRegistered: false },
        { id: 'anna', name: 'Anna', isRegistered: true, cardColor: '#000000' }
      ]
    });
    expect(res.status).toBe(200);
    noSecrets(res.body);
    expect(stored()).toMatchObject({ securityCode: '4711', secretGuid: 'guid-anna', cardColor: '#000000', isRegistered: true });
  });

  it('a code in the body does not overwrite the stored one', async () => {
    await request(app).put(`/api/agendas/${AGENDA_ID}`).send({
      userName: 'Mallory',
      attendees: [{ id: 'anna', name: 'Anna', securityCode: '0000', secretGuid: 'evil', isRegistered: true }, { id: 'tom', name: 'Tom' }]
    });
    expect(stored()).toMatchObject({ securityCode: '4711', secretGuid: 'guid-anna' });
  });

  it('new people from a list start unregistered without secrets', async () => {
    await request(app).put(`/api/agendas/${AGENDA_ID}`).send({
      userName: 'Anna',
      attendees: [{ id: 'anna', name: 'Anna' }, { id: 'tom', name: 'Tom' }, { id: 'eve', name: 'Eve', securityCode: '1234', isRegistered: true }]
    });
    const eve = doc.toObject().attendees.find((a: any) => a.id === 'eve');
    expect(eve.isRegistered).toBe(false);
    expect(eve.securityCode).toBeUndefined();
  });
});

describe('Adding attendees', () => {
  const find = (id: string) => doc.toObject().attendees.find((a: any) => a.id === id);

  it('a person added for someone else starts unregistered without stored code', async () => {
    const res = await request(app).post(`/api/agendas/${AGENDA_ID}/attendees`)
      .send({ id: 'lena', name: 'Lena', securityCode: '9999', secretGuid: 'chosen-by-adder' });
    expect(res.status).toBe(201);
    noSecrets(res.body);
    expect(find('lena').isRegistered).toBe(false);
    expect(find('lena').securityCode).toBeUndefined();
    expect(find('lena').secretGuid).toBeUndefined();
  });

  it('a device registering itself keeps its own code across agendas', async () => {
    const res = await request(app).post(`/api/agendas/${AGENDA_ID}/attendees`)
      .send({ id: 'max', name: 'Max', securityCode: '1111', secretGuid: 'guid-max', isRegistered: true });
    expect(res.status).toBe(201);
    noSecrets(res.body);
    expect(find('max')).toMatchObject({ isRegistered: true, securityCode: '1111', secretGuid: 'guid-max' });
  });

  it('a self-registering device without secrets gets server-generated ones', async () => {
    await request(app).post(`/api/agendas/${AGENDA_ID}/attendees`).send({ id: 'neu', name: 'Neu', isRegistered: true });
    expect(find('neu').securityCode).toMatch(/^\d{4}$/);
    expect(find('neu').secretGuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('re-joining an existing person cannot change secrets or registration', async () => {
    const res = await request(app).post(`/api/agendas/${AGENDA_ID}/attendees`)
      .send({ id: 'anna', name: 'Anna', securityCode: '0000', secretGuid: 'evil', isRegistered: false });
    expect(res.status).toBe(200);
    expect(find('anna')).toMatchObject({ isRegistered: true, securityCode: '4711', secretGuid: 'guid-anna' });
  });
});

describe('Legacy attendees without secrets', () => {
  it('GET fills missing secrets of registered people once and does not return them', async () => {
    doc = makeAgenda({ attendees: [{ id: 'old', name: 'Alt', isRegistered: true }, { id: 'tom', name: 'Tom', isRegistered: false }] });
    const res = await request(app).get(`/api/agendas/${AGENDA_ID}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/securityCode|secretGuid/);
    const old = doc.toObject().attendees.find((a: any) => a.id === 'old');
    const tom = doc.toObject().attendees.find((a: any) => a.id === 'tom');
    expect(old.securityCode).toMatch(/^\d{4}$/);
    expect(old.secretGuid).toBeTruthy();
    expect(tom.securityCode).toBeUndefined();
    expect(doc.save).toHaveBeenCalledTimes(1);

    await request(app).get(`/api/agendas/${AGENDA_ID}`);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });
});
