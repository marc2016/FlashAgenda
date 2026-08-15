import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

const mockAgendaData: any = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Transfer Test Agenda',
  createdBy: 'creator-1',
  isArchived: false,
  auditLogs: [],
  items: [
    {
      _id: 'item-101',
      title: 'Strategie Präsentation',
      createdBy: 'user-alice',
      author: 'Alice',
      transferredTo: undefined
    }
  ],
  attendees: [
    { id: 'user-alice', name: 'Alice' },
    { id: 'user-bob', name: 'Bob' }
  ],
  save: vi.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this);
  })
};

vi.mock('../src/models/Agenda', () => {
  const MockAgendaClass = function() {
    return mockAgendaData;
  } as any;

  MockAgendaClass.findById = vi.fn((id: string) => {
    return Promise.resolve(mockAgendaData);
  });

  return {
    default: MockAgendaClass
  };
});

describe('Item Transfer Backend Endpoints', () => {
  beforeEach(() => {
    mockAgendaData.items = [
      {
        _id: 'item-101',
        title: 'Strategie Präsentation',
        createdBy: 'user-alice',
        author: 'Alice',
        transferredTo: undefined
      }
    ];
    mockAgendaData.auditLogs = [];
  });

  it('initiates item transfer to another attendee with pending status', async () => {
    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011/items/item-101')
      .send({
        userName: 'Alice',
        transferredTo: {
          toUserId: 'user-bob',
          toUserName: 'Bob',
          fromUserId: 'user-alice',
          fromUserName: 'Alice',
          status: 'pending'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0].transferredTo).toBeDefined();
    expect(res.body.items[0].transferredTo.status).toBe('pending');
    expect(res.body.items[0].transferredTo.toUserName).toBe('Bob');
  });

  it('accepts item transfer and updates status to accepted', async () => {
    mockAgendaData.items[0].transferredTo = {
      toUserId: 'user-bob',
      toUserName: 'Bob',
      fromUserId: 'user-alice',
      fromUserName: 'Alice',
      status: 'pending'
    };

    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011/items/item-101')
      .send({
        userName: 'Bob',
        transferredTo: {
          toUserId: 'user-bob',
          toUserName: 'Bob',
          fromUserId: 'user-alice',
          fromUserName: 'Alice',
          status: 'accepted'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0].transferredTo.status).toBe('accepted');
  });

  it('rejects item transfer and updates status to rejected', async () => {
    mockAgendaData.items[0].transferredTo = {
      toUserId: 'user-bob',
      toUserName: 'Bob',
      fromUserId: 'user-alice',
      fromUserName: 'Alice',
      status: 'pending'
    };

    const res = await request(app)
      .put('/api/agendas/507f1f77bcf86cd799439011/items/item-101')
      .send({
        userName: 'Bob',
        transferredTo: {
          toUserId: 'user-bob',
          toUserName: 'Bob',
          fromUserId: 'user-alice',
          fromUserName: 'Alice',
          status: 'rejected'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0].transferredTo.status).toBe('rejected');
  });
});
