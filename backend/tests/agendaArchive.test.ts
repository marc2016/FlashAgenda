import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { canManageAgenda } from '../src/routes/agenda';

const AGENDA_ID = '507f1f77bcf86cd799439011';

let mockAgendaState: any;

vi.mock('../src/models/Agenda', () => {
  const MockAgendaClass = function (data: any) {
    return { ...data, save: vi.fn().mockResolvedValue(true), markModified: vi.fn() };
  } as any;

  MockAgendaClass.findById = vi.fn((id: string) =>
    Promise.resolve(mockAgendaState && mockAgendaState._id === id ? mockAgendaState : null)
  );
  MockAgendaClass.findOne = vi.fn(() => Promise.resolve(mockAgendaState));
  MockAgendaClass.find = vi.fn(() => Promise.resolve([mockAgendaState]));

  return { default: MockAgendaClass };
});

function makeAgenda(overrides: Record<string, unknown> = {}) {
  const agenda: any = {
    _id: AGENDA_ID,
    title: 'Stammtisch',
    createdBy: 'creator-id',
    isArchived: false,
    items: [],
    auditLogs: [],
    attendees: [
      { id: 'creator-id', name: 'Erika Ersteller' },
      { id: 'guest-id', name: 'Gustav Gast' }
    ],
    ...overrides
  };
  agenda.save = vi.fn().mockImplementation(() => Promise.resolve(agenda));
  agenda.markModified = vi.fn();
  agenda.toObject = () => {
    const { save, markModified, toObject, ...plain } = agenda;
    return plain;
  };
  return agenda;
}

const archive = (body: Record<string, unknown>, id = AGENDA_ID) =>
  request(app).put(`/api/agendas/${id}/archive`).send(body);

describe('canManageAgenda', () => {
  const agenda = {
    createdBy: 'creator-id',
    attendees: [{ id: 'first-id', _id: 'mongo-first', name: 'Erika Ersteller' }, { id: 'other', name: 'Gustav' }]
  };

  it('accepts the creator and the first attendee by ID or name', () => {
    expect(canManageAgenda(agenda, 'creator-id')).toBe(true);
    expect(canManageAgenda(agenda, 'first-id')).toBe(true);
    expect(canManageAgenda(agenda, 'mongo-first')).toBe(true);
    expect(canManageAgenda(agenda, undefined, '  erika ersteller ')).toBe(true);
    expect(canManageAgenda({ createdBy: 'Erika', attendees: [] }, undefined, 'ERIKA')).toBe(true);
  });

  it('rejects other attendees and empty identities', () => {
    expect(canManageAgenda(agenda, 'other', 'Gustav')).toBe(false);
    expect(canManageAgenda(agenda, '', '')).toBe(false);
    expect(canManageAgenda(agenda)).toBe(false);
  });

  it('without a stored creator only the first attendee matches', () => {
    const noCreator = { attendees: agenda.attendees };
    expect(canManageAgenda(noCreator, 'first-id')).toBe(true);
    expect(canManageAgenda(noCreator, 'other')).toBe(false);
  });
});

describe('PUT /api/agendas/:id/archive', () => {
  beforeEach(() => {
    mockAgendaState = makeAgenda();
  });

  it('lets the creator archive and returns the summary', async () => {
    const res = await archive({ archived: true, userId: 'creator-id', userName: 'Erika Ersteller' });
    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(true);
    expect(res.body._id).toBe(AGENDA_ID);
    expect(res.body.auditLogs).toBeUndefined();
    expect(mockAgendaState.isArchived).toBe(true);
    expect(mockAgendaState.save).toHaveBeenCalled();
  });

  it('lets the first attendee archive when they are not the creator', async () => {
    mockAgendaState = makeAgenda({ createdBy: 'someone-else' });
    const res = await archive({ archived: true, userId: 'creator-id' });
    expect(res.status).toBe(200);
    expect(mockAgendaState.isArchived).toBe(true);
  });

  it('rejects other attendees with 403 and keeps the status', async () => {
    const res = await archive({ archived: true, userId: 'guest-id', userName: 'Gustav Gast' });
    expect(res.status).toBe(403);
    expect(mockAgendaState.isArchived).toBe(false);
    expect(mockAgendaState.save).not.toHaveBeenCalled();
  });

  it('restores an archived agenda', async () => {
    mockAgendaState = makeAgenda({ isArchived: true });
    const res = await archive({ archived: false, userId: 'creator-id', userName: 'Erika Ersteller' });
    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(false);
    expect(mockAgendaState.isArchived).toBe(false);
  });

  it('writes audit entries with the person name for archive and restore', async () => {
    await archive({ archived: true, userId: 'creator-id', userName: 'Erika Ersteller' });
    await archive({ archived: false, userId: 'creator-id', userName: 'Erika Ersteller' });
    const logs = mockAgendaState.auditLogs.map((l: any) => [l.action, l.user]);
    expect(logs).toEqual([
      ['AGENDA_ARCHIVED', 'Erika Ersteller'],
      ['AGENDA_UNARCHIVED', 'Erika Ersteller']
    ]);
  });

  it('is idempotent: repeating the same value adds no audit entry', async () => {
    await archive({ archived: true, userId: 'creator-id', userName: 'Erika Ersteller' });
    const res = await archive({ archived: true, userId: 'creator-id', userName: 'Erika Ersteller' });
    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(true);
    expect(mockAgendaState.auditLogs).toHaveLength(1);
  });

  it('validates the request', async () => {
    expect((await archive({ archived: 'yes', userId: 'creator-id' })).status).toBe(400);
    expect((await archive({ archived: true, userId: 'creator-id' }, 'not-an-id')).status).toBe(400);
    expect((await archive({ archived: true, userId: 'creator-id' }, '507f1f77bcf86cd799439012')).status).toBe(404);
  });

  it('keeps archived agendas read-only until they are restored', async () => {
    mockAgendaState = makeAgenda({ isArchived: true });
    const blocked = await request(app).put(`/api/agendas/${AGENDA_ID}`).send({ title: 'Neu' });
    expect(blocked.status).toBe(403);

    await archive({ archived: false, userId: 'creator-id', userName: 'Erika Ersteller' });
    const allowed = await request(app).put(`/api/agendas/${AGENDA_ID}`).send({ title: 'Neu' });
    expect(allowed.status).toBe(200);
  });
});
