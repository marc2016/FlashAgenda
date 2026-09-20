import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

let mockAgendaState: any;

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
    if (!mockAgendaState || (mockAgendaState._id !== id && id !== '507f1f77bcf86cd799439011')) {
      return Promise.resolve(null);
    }
    return Promise.resolve(mockAgendaState);
  });

  MockAgendaClass.findOne = vi.fn(() => Promise.resolve(mockAgendaState));
  MockAgendaClass.find = vi.fn(() => Promise.resolve([mockAgendaState]));

  return { default: MockAgendaClass };
});

describe('Attendee Removal, Sorting Lock & Meeting Lifecycle API', () => {
  beforeEach(() => {
    mockAgendaState = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Meeting Test Agenda',
      sortMode: 'date',
      sortOrder: 'asc',
      liveMeetingActive: false,
      liveMeetingStatus: 'not_started',
      liveMeetingElapsedSeconds: 0,
      attendees: [
        {
          id: 'user-1',
          name: 'Erika Musterfrau',
          email: 'erika@beispiel.de'
        },
        {
          id: 'user-2',
          name: 'Max Mustermann',
          email: 'max@beispiel.de'
        }
      ],
      items: [
        {
          _id: 'item-1',
          title: 'TOP 1',
          durationSeconds: 0
        }
      ],
      auditLogs: [],
      save: vi.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      markModified: vi.fn()
    };
  });

  it('DELETE /api/agendas/:id/attendees/:attendeeId removes attendee and adds audit log', async () => {
    const res = await request(app)
      .delete('/api/agendas/507f1f77bcf86cd799439011/attendees/user-1')
      .send({ user: 'Admin' });

    expect(res.status).toBe(200);
    expect(mockAgendaState.attendees.length).toBe(1);
    expect(mockAgendaState.attendees[0].id).toBe('user-2');
    expect(mockAgendaState.auditLogs.length).toBeGreaterThan(0);
    expect(mockAgendaState.auditLogs[0].action).toBe('Teilnehmer entfernt');
  });

  it('DELETE /api/agendas/:id/attendees/:attendeeId returns 404 for unknown attendee', async () => {
    const res = await request(app)
      .delete('/api/agendas/507f1f77bcf86cd799439011/attendees/non-existent-user');

    expect(res.status).toBe(404);
  });

  it('PUT /api/agendas/:id blocks sorting changes if liveMeetingActive is true', async () => {
    mockAgendaState.liveMeetingActive = true;

    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({ sortMode: 'rating' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Sortierung ist während einer laufenden Sitzung gesperrt');
  });

  it('PUT /api/agendas/:id allows sorting change if liveMeetingActive is being set to false', async () => {
    mockAgendaState.liveMeetingActive = true;

    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({ sortMode: 'rating', liveMeetingActive: false });

    expect(res.status).toBe(200);
    expect(mockAgendaState.sortMode).toBe('rating');
  });

  it('PUT /api/agendas/:id blocks restarting completed meetings', async () => {
    mockAgendaState.liveMeetingStatus = 'completed';

    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({ liveMeetingStatus: 'in_progress' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Eine bereits abgeschlossene Sitzung kann nicht erneut gestartet');
  });

  it('PUT /api/agendas/:id/items/:itemId updates durationSeconds', async () => {
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011/items/item-1')
      .send({ durationSeconds: 195 });

    expect(res.status).toBe(200);
    expect(mockAgendaState.items[0].durationSeconds).toBe(195);
  });

  it('PUT /api/agendas/:id persists liveMeetingPhase, liveMeetingCurrentItemIndex, and liveMeetingCurrentAttendeeIndex', async () => {
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011')
      .send({
        liveMeetingPhase: 'agenda_items',
        liveMeetingCurrentItemIndex: 2,
        liveMeetingCurrentAttendeeIndex: 1
      });

    expect(res.status).toBe(200);
    expect(mockAgendaState.liveMeetingPhase).toBe('agenda_items');
    expect(mockAgendaState.liveMeetingCurrentItemIndex).toBe(2);
    expect(mockAgendaState.liveMeetingCurrentAttendeeIndex).toBe(1);
  });
});
