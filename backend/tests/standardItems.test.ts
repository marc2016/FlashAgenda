import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { applyStandardItems } from '../src/routes/agenda';

let mockAgendaState: any;

vi.mock('../src/services/socketService', () => ({
  broadcastAgendaEvent: vi.fn(),
  initSocketService: vi.fn()
}));

vi.mock('../src/models/Agenda', () => {
  const MockAgendaClass = function (data: any) {
    return {
      ...data,
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
      markModified: vi.fn()
    };
  } as any;

  MockAgendaClass.findById = vi.fn(() => Promise.resolve(mockAgendaState));

  return { default: MockAgendaClass };
});

const AGENDA_ID = '507f1f77bcf86cd799439011';

describe('Standard agenda items (Begrüßung, Neuer Termin, Location)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgendaState = {
      _id: AGENDA_ID,
      title: 'Standard Items Agenda',
      createdBy: 'creator-id',
      isArchived: false,
      includeStandardItems: false,
      liveMeetingActive: false,
      attendees: [{ id: 'creator-id', name: 'Creator' }],
      items: [{ _id: 'item-1', title: 'Normaler Punkt', createdBy: 'creator-id', author: 'Creator' }],
      auditLogs: [],
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
      markModified: vi.fn()
    };
  });

  describe('applyStandardItems', () => {
    it('prepends the three system items in fixed order', () => {
      const agenda: any = { items: [{ title: 'A' }], markModified: vi.fn() };
      applyStandardItems(agenda, true);

      expect(agenda.items.map((i: any) => i.title)).toEqual(['Begrüßung', 'Neuer Termin', 'Location', 'A']);
      for (const item of agenda.items.slice(0, 3)) {
        expect(item.author).toBe('System');
        expect(item.createdBy).toBe('system');
        expect(item.pinned).toBe(true);
      }
      expect(agenda.markModified).toHaveBeenCalledWith('items');
    });

    it('does not duplicate items when enabled twice', () => {
      const agenda: any = { items: [] };
      applyStandardItems(agenda, true);
      applyStandardItems(agenda, true);
      expect(agenda.items).toHaveLength(3);
    });

    it('removes only the system items when disabled', () => {
      const agenda: any = { items: [{ title: 'A' }] };
      applyStandardItems(agenda, true);
      applyStandardItems(agenda, false);
      expect(agenda.items).toEqual([{ title: 'A' }]);
    });
  });

  it('creates standard items on POST /api/agendas when requested', async () => {
    const res = await request(app)
      .post('/api/agendas')
      .send({ title: 'Neu', createdBy: 'creator-id', includeStandardItems: true });

    expect(res.status).toBe(201);
    expect(res.body.includeStandardItems).toBe(true);
    expect(res.body.items.map((i: any) => i.systemKey)).toEqual(['welcome', 'next_meeting', 'location']);
  });

  it('does not create standard items on POST by default', async () => {
    const res = await request(app).post('/api/agendas').send({ title: 'Neu' });

    expect(res.status).toBe(201);
    expect(res.body.items).toEqual([]);
  });

  it('lets the creator enable and disable standard items via PUT', async () => {
    const enable = await request(app)
      .put(`/api/agendas/${AGENDA_ID}`)
      .send({ includeStandardItems: true, userId: 'creator-id', userName: 'Creator' });

    expect(enable.status).toBe(200);
    expect(enable.body.items.map((i: any) => i.title)).toEqual(['Begrüßung', 'Neuer Termin', 'Location', 'Normaler Punkt']);
    expect(mockAgendaState.auditLogs.some((l: any) => l.details.includes('Standardpunkte aktiviert'))).toBe(true);

    const disable = await request(app)
      .put(`/api/agendas/${AGENDA_ID}`)
      .send({ includeStandardItems: false, userId: 'creator-id', userName: 'Creator' });

    expect(disable.status).toBe(200);
    expect(disable.body.items.map((i: any) => i.title)).toEqual(['Normaler Punkt']);
  });

  it('rejects toggling standard items by a non-creator', async () => {
    const res = await request(app)
      .put(`/api/agendas/${AGENDA_ID}`)
      .send({ includeStandardItems: true, userId: 'other-id', userName: 'Other' });

    expect(res.status).toBe(403);
    expect(mockAgendaState.items).toHaveLength(1);
  });

  it('rejects toggling standard items during an active live meeting', async () => {
    mockAgendaState.liveMeetingActive = true;
    const res = await request(app)
      .put(`/api/agendas/${AGENDA_ID}`)
      .send({ includeStandardItems: true, userId: 'creator-id', userName: 'Creator' });

    expect(res.status).toBe(400);
    expect(mockAgendaState.items).toHaveLength(1);
  });

  it('prevents a non-creator from deleting a system item', async () => {
    applyStandardItems(mockAgendaState, true);
    mockAgendaState.items = mockAgendaState.items.map((i: any, idx: number) => ({ ...i, _id: i._id || `sys-${idx}` }));
    const remaining = mockAgendaState.items.filter((i: any) => i.systemKey !== 'welcome');

    const res = await request(app)
      .put(`/api/agendas/${AGENDA_ID}`)
      .send({ items: remaining, userId: 'other-id', userName: 'Other' });

    expect(res.status).toBe(403);
  });
});
