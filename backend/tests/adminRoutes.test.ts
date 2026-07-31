import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';

vi.mock('../src/models/Agenda', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Sprint Planning',
          isArchived: false,
          items: [],
          attendees: []
        }
      ])
    }),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn()
  }
}));

vi.mock('../src/models/AdminSetting', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(null)
    })
  }
}));

describe('Admin API Routes Unit Tests', () => {
  it('should reject login request with wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Falsches Admin-Passwort');
  });

  it('should accept login request with correct password and return token', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should reject /api/admin/agendas request without Bearer token', async () => {
    const res = await request(app).get('/api/admin/agendas');
    expect(res.status).toBe(401);
  });

  it('should return agendas list for authenticated admin request', async () => {
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ password: 'admin123' });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/admin/agendas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('Sprint Planning');
  });
});
