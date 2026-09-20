import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { broadcastAgendaEvent } from '../src/services/socketService';

let mockAgendaState: any;

vi.mock('../src/services/socketService', () => ({
  broadcastAgendaEvent: vi.fn(),
  initSocketService: vi.fn()
}));

vi.mock('../src/models/Agenda', () => {
  const MockAgendaClass = function (data: any) {
    return {
      ...data,
      save: vi.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      markModified: vi.fn()
    };
  } as any;

  MockAgendaClass.findById = vi.fn((id: string) => {
    if (!mockAgendaState) return Promise.resolve(null);
    return Promise.resolve(mockAgendaState);
  });

  return { default: MockAgendaClass };
});

describe('Live Meeting Multi-Device Synchronization API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgendaState = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Sync Test Agenda',
      liveMeetingActive: false,
      liveMeetingStatus: 'not_started',
      liveMeetingPhase: 'intro',
      liveMeetingCurrentItemIndex: 0,
      liveMeetingCurrentAttendeeIndex: 0,
      liveMeetingElapsedSeconds: 0,
      liveMeetingPaused: false,
      attendees: [],
      items: [
        { _id: 'item-1', title: 'TOP 1', completed: false },
        { _id: 'item-2', title: 'TOP 2', completed: false }
      ],
      auditLogs: [],
      markModified: vi.fn(),
      save: vi.fn().mockImplementation(function () {
        return Promise.resolve(this);
      })
    };
  });

  it('PUT /api/agendas/:id updates liveMeetingActive, phase, and item index', async () => {
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({
        liveMeetingActive: true,
        liveMeetingStatus: 'in_progress',
        liveMeetingPhase: 'agenda_items',
        liveMeetingCurrentItemIndex: 1
      });

    expect(res.status).toBe(200);
    expect(res.body.liveMeetingActive).toBe(true);
    expect(res.body.liveMeetingPhase).toBe('agenda_items');
    expect(res.body.liveMeetingCurrentItemIndex).toBe(1);

    expect(broadcastAgendaEvent).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'agenda_updated',
      expect.objectContaining({
        agenda: expect.objectContaining({
          liveMeetingActive: true,
          liveMeetingPhase: 'agenda_items',
          liveMeetingCurrentItemIndex: 1
        })
      })
    );
  });

  it('PUT /api/agendas/:id updates liveMeetingPaused state and broadcasts update', async () => {
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({
        liveMeetingPaused: true,
        liveMeetingElapsedSeconds: 120
      });

    expect(res.status).toBe(200);
    expect(res.body.liveMeetingPaused).toBe(true);
    expect(res.body.liveMeetingElapsedSeconds).toBe(120);

    expect(broadcastAgendaEvent).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'agenda_updated',
      expect.objectContaining({
        agenda: expect.objectContaining({
          liveMeetingPaused: true,
          liveMeetingElapsedSeconds: 120
        })
      })
    );
  });

  it('PUT /api/agendas/:id updates liveMeetingStartedAt and liveMeetingItemStartedAt server timestamps', async () => {
    const startIso = new Date().toISOString();
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({
        liveMeetingStartedAt: startIso,
        liveMeetingItemStartedAt: startIso,
        liveMeetingCurrentItemElapsedSeconds: 45
      });

    expect(res.status).toBe(200);
    expect(res.body.liveMeetingStartedAt).toBe(startIso);
    expect(res.body.liveMeetingItemStartedAt).toBe(startIso);
    expect(res.body.liveMeetingCurrentItemElapsedSeconds).toBe(45);
  });
});
