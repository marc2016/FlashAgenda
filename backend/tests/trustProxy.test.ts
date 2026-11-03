import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/socketService', () => ({ broadcastAgendaEvent: vi.fn(), initSocketService: vi.fn() }));

import app, { parseTrustProxy } from '../src/app';
import Agenda from '../src/models/Agenda';

describe('parseTrustProxy', () => {
  it('defaults to one proxy and understands numbers, booleans and keywords', () => {
    expect(parseTrustProxy(undefined)).toBe(1);
    expect(parseTrustProxy('')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('loopback')).toBe('loopback');
  });
});

describe('Per-IP limits behind a proxy', () => {
  it('counts clients by X-Forwarded-For, not by the proxy address', async () => {
    vi.spyOn(Agenda, 'findOne').mockImplementation((async () => null) as any);
    vi.spyOn(Agenda, 'find').mockImplementation((() => ({ sort: () => ({ limit: async () => [] }) })) as any);
    expect(app.get('trust proxy')).toBe(1);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/agendas/login-by-code').set('X-Forwarded-For', '10.0.0.1').send({ code: '9999' });
      expect(res.status).toBe(404);
    }
    expect((await request(app).post('/api/agendas/login-by-code').set('X-Forwarded-For', '10.0.0.1').send({ code: '9999' })).status).toBe(429);
    // another client behind the same proxy is not locked
    expect((await request(app).post('/api/agendas/login-by-code').set('X-Forwarded-For', '10.0.0.2').send({ code: '9999' })).status).toBe(404);
  });
});
