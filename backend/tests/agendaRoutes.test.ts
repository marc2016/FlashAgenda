import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';

vi.mock('../src/models/Agenda', () => {
  const mockAgendaData = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Backend Test Agenda',
    isArchived: false,
    items: [
      {
        _id: 'item-1',
        title: 'Intro Task',
        createdBy: 'test-user-123',
        author: 'Max Mustermann'
      }
    ],
    attendees: [
      {
        id: 'test-user-123',
        name: 'Max Mustermann',
        email: 'max@beispiel.de',
        cardColor: '#0a4b7c',
        securityCode: '1234',
        secretGuid: '550e8400-e29b-41d4-a716-446655440000'
      }
    ],
    save: vi.fn().mockResolvedValue(true)
  };

  const MockAgendaClass = function() {
    return mockAgendaData;
  } as any;

  MockAgendaClass.findById = vi.fn((id) => {
    if (id === '507f1f77bcf86cd799439099') {
      return Promise.resolve({
        ...mockAgendaData,
        _id: '507f1f77bcf86cd799439099',
        isArchived: true,
        save: vi.fn()
      });
    }
    return Promise.resolve({ ...mockAgendaData });
  });

  MockAgendaClass.find = vi.fn().mockReturnValue(
    Object.assign(Promise.resolve([mockAgendaData]), {
      sort: vi.fn().mockResolvedValue([mockAgendaData])
    })
  );

  return {
    default: MockAgendaClass
  };
});

describe('Agenda API Routes Unit Tests', () => {
  it('should fetch agenda details by ID', async () => {
    const res = await request(app).get('/api/agendas/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Backend Test Agenda');
  });

  it('should prevent modifying archived agendas with HTTP 403 Read-Only error', async () => {
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439099')
      .send({ title: 'Modified Title' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('archiviert und kann nicht mehr geändert werden');
  });

  it('should return user stats for valid user queries', async () => {
    const res = await request(app)
      .get('/api/agendas/user-stats?user=test-user-123&name=Max%20Mustermann');

    expect(res.status).toBe(200);
    expect(res.body.agendasCount).toBeDefined();
    expect(res.body.totalItemsContributed).toBeDefined();
  });

  it('should update user profile across agendas on PUT /api/agendas/user-profile', async () => {
    const res = await request(app)
      .put('/api/agendas/user-profile')
      .send({
        userId: 'test-user-123',
        name: 'Max Mustermann (Updated)',
        email: 'max.new@beispiel.de',
        cardColor: '#8b0000'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('User profile updated across agendas');
  });
});
