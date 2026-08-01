import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { isSafeImageUrl } from '../src/routes/agenda';

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

  MockAgendaClass.find = vi.fn().mockImplementation(() => {
    const resArr = [mockAgendaData];
    const promise = Promise.resolve(resArr);
    (promise as any).sort = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(resArr)
    });
    return promise;
  });

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

  it('should return user agendas for valid user queries', async () => {
    const res = await request(app)
      .get('/api/agendas/user-agendas?user=test-user-123');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return user agendas when valid security code is provided', async () => {
    const res = await request(app)
      .get('/api/agendas/user-agendas?user=test-user-123&code=1234');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
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

  it('should validate and reject malicious image URLs, scripts, and virus payloads', () => {
    // Safe URLs
    expect(isSafeImageUrl('https://example.com/image.png')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')).toBe(true);

    // Malicious URLs / Scripts / Viruses
    expect(isSafeImageUrl('javascript:alert("XSS")')).toBe(false);
    expect(isSafeImageUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
    expect(isSafeImageUrl('data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA')).toBe(false); // PE/EXE executable payload
    expect(isSafeImageUrl('https://example.com/image.png<script>alert(1)</script>')).toBe(false);

    // SVG Base64 containing script
    const svgScript = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert("virus")</script></svg>').toString('base64');
    expect(isSafeImageUrl(`data:image/svg+xml;base64,${svgScript}`)).toBe(false);
  });

  it('should login user by 4-digit security code successfully', async () => {
    const res = await request(app)
      .post('/api/agendas/login-by-code')
      .send({ code: '1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toContain('Max Mustermann');
  });

  it('should reject login with invalid security code', async () => {
    const res = await request(app)
      .post('/api/agendas/login-by-code')
      .send({ code: '9999' });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Ungültiger Code');
  });
});
