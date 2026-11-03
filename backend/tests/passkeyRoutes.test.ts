import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/socketService', () => ({ broadcastAgendaEvent: vi.fn(), initSocketService: vi.fn() }));

// In-memory stand-in for the PasskeyCredential collection
const store = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('../src/models/PasskeyCredential', async (importOriginal) => {
  const original: any = await importOriginal();
  const matches = (row: any, q: any) => Object.entries(q).every(([k, v]) => row[k] === v);
  return {
    ...original,
    default: {
      find: vi.fn(async (q: any) => store.rows.filter(r => matches(r, q))),
      findOne: vi.fn(async (q: any) => store.rows.find(r => matches(r, q)) || null),
      create: vi.fn(async (data: any) => {
        if (store.rows.some(r => r.credentialId === data.credentialId)) throw Object.assign(new Error('dup'), { code: 11000 });
        const row = { createdAt: new Date(), ...data };
        store.rows.push(row);
        return row;
      }),
      updateOne: vi.fn(async (q: any, update: any) => {
        const row = store.rows.find(r => matches(r, q));
        if (row) Object.assign(row, update.$set);
        return { modifiedCount: row ? 1 : 0 };
      }),
      deleteOne: vi.fn(async (q: any) => {
        const before = store.rows.length;
        store.rows = store.rows.filter(r => !matches(r, q));
        return { deletedCount: before - store.rows.length };
      })
    }
  };
});

import app from '../src/app';
import Agenda from '../src/models/Agenda';
import { resetVerifyFailures } from '../src/routes/agenda';
import { resetPasskeyState, CHALLENGE_TTL_MS } from '../src/routes/passkeys';
import { webauthnConfig } from '../src/config/webauthn';
import { FakeAuthenticator } from './helpers/fakeAuthenticator';

const ORIGIN = webauthnConfig.origins[0];
const RP = webauthnConfig.rpID;
const anna = { id: 'anna', name: 'Anna', securityCode: '4711', secretGuid: 'guid-anna', isRegistered: true, cardColor: '#8b0000' };
const tom = { id: 'tom', name: 'Tom', securityCode: '2222', secretGuid: 'guid-tom', isRegistered: true };
let agendaDoc: any;

beforeEach(() => {
  store.rows = [];
  resetVerifyFailures();
  resetPasskeyState();
  agendaDoc = new Agenda({ _id: '507f1f77bcf86cd799439011', title: 'T', attendees: [anna, tom], items: [] });
  vi.spyOn(Agenda, 'find').mockImplementation(((query: any) => {
    const personId = query?.['attendees.id'];
    const hit = agendaDoc.attendees.some((a: any) => a.id === personId) ? [agendaDoc] : [];
    const p: any = Promise.resolve(hit);
    p.sort = () => ({ limit: async () => hit });
    return p;
  }) as any);
});

async function registerFor(person: { id: string; securityCode: string }, auth: FakeAuthenticator, label = 'Handy') {
  const opt = await request(app).post('/api/passkeys/register/options').send({ personId: person.id, code: person.securityCode });
  expect(opt.status).toBe(200);
  return request(app).post('/api/passkeys/register/verify')
    .send({ challengeToken: opt.body.challengeToken, response: auth.register(opt.body.options.challenge), label });
}

async function loginWith(auth: FakeAuthenticator, mutate?: (challenge: string) => any) {
  const opt = await request(app).post('/api/passkeys/login/options').send({});
  expect(opt.status).toBe(200);
  const response = mutate ? mutate(opt.body.options.challenge) : auth.authenticate(opt.body.options.challenge);
  return request(app).post('/api/passkeys/login/verify').send({ challengeToken: opt.body.challengeToken, response });
}

describe('Passkey registration', () => {
  it('registers a passkey after proving the person by code', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    const res = await registerFor(anna, auth);
    expect(res.status).toBe(201);
    expect(res.body.credential).toMatchObject({ id: auth.id, label: 'Handy' });
    expect(JSON.stringify(res.body)).not.toContain('publicKey');
    expect(store.rows[0]).toMatchObject({ personId: 'anna', personName: 'Anna', counter: 0 });
  });

  it('refuses options without a valid code and counts the failure', async () => {
    expect((await request(app).post('/api/passkeys/register/options').send({ personId: 'anna', code: '0000' })).status).toBe(401);
    expect((await request(app).post('/api/passkeys/register/options').send({ personId: 'anna' })).status).toBe(400);
    expect((await request(app).post('/api/passkeys/register/options').send({ personId: 'nobody', code: '1' })).status).toBe(404);
    expect(store.rows).toHaveLength(0);
  });

  it('locks registration for a person after 5 wrong codes', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/passkeys/register/options').send({ personId: 'anna', code: `100${i}` });
    }
    expect((await request(app).post('/api/passkeys/register/options').send({ personId: 'anna', code: '4711' })).status).toBe(429);
  });

  it('rejects a registration from a foreign origin', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    const opt = await request(app).post('/api/passkeys/register/options').send({ personId: 'anna', code: '4711' });
    const res = await request(app).post('/api/passkeys/register/verify')
      .send({ challengeToken: opt.body.challengeToken, response: auth.register(opt.body.options.challenge, 'https://evil.example') });
    expect(res.status).toBe(400);
    expect(store.rows).toHaveLength(0);
  });

  it('allows several passkeys per person', async () => {
    expect((await registerFor(anna, new FakeAuthenticator(RP, ORIGIN, anna.id), 'Handy')).status).toBe(201);
    expect((await registerFor(anna, new FakeAuthenticator(RP, ORIGIN, anna.id), 'Laptop')).status).toBe(201);
    expect(store.rows.filter(r => r.personId === 'anna')).toHaveLength(2);
  });
});

describe('Passkey login', () => {
  it('signs in and returns only the own person with secrets', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    await registerFor(anna, auth);
    const res = await loginWith(auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'anna', name: 'Anna', securityCode: '4711', secretGuid: 'guid-anna', isRegistered: true });
    expect(JSON.stringify(res.body)).not.toContain('guid-tom');
    expect(store.rows[0].counter).toBe(1);
    expect(store.rows[0].lastUsedAt).toBeInstanceOf(Date);
  });

  it('rejects unknown and forged assertions without secrets', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    const unknown = await loginWith(auth);
    expect(unknown.status).toBe(401);

    await registerFor(anna, auth);
    const forged = await loginWith(auth, c => auth.forged(c));
    expect(forged.status).toBe(401);
    expect(JSON.stringify(forged.body)).not.toContain('4711');
  });

  it('rejects a challenge used twice', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    await registerFor(anna, auth);
    const opt = await request(app).post('/api/passkeys/login/options').send({});
    const body = { challengeToken: opt.body.challengeToken, response: auth.authenticate(opt.body.options.challenge) };
    expect((await request(app).post('/api/passkeys/login/verify').send(body)).status).toBe(200);
    expect((await request(app).post('/api/passkeys/login/verify').send(body)).status).toBe(400);
  });

  it('rejects an expired challenge', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    await registerFor(anna, auth);
    const opt = await request(app).post('/api/passkeys/login/options').send({});
    const response = auth.authenticate(opt.body.options.challenge);
    vi.useFakeTimers({ now: Date.now() + CHALLENGE_TTL_MS + 1000, toFake: ['Date'] });
    try {
      const res = await request(app).post('/api/passkeys/login/verify').send({ challengeToken: opt.body.challengeToken, response });
      expect(res.status).toBe(400);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a login from a foreign origin', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    await registerFor(anna, auth);
    const res = await loginWith(auth, c => auth.authenticate(c, 'https://evil.example'));
    expect(res.status).toBe(401);
  });

  it('answers 404 when the person is in no agenda anymore', async () => {
    const auth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    await registerFor(anna, auth);
    agendaDoc.attendees = [tom];
    const res = await loginWith(auth);
    expect(res.status).toBe(404);
  });
});

describe('Passkey management', () => {
  it('lists own passkeys and deletes only own ones', async () => {
    const annaAuth = new FakeAuthenticator(RP, ORIGIN, anna.id);
    const tomAuth = new FakeAuthenticator(RP, ORIGIN, tom.id);
    await registerFor(anna, annaAuth, 'Handy');
    await registerFor(tom, tomAuth, 'Tom-Laptop');

    const list = await request(app).get('/api/passkeys/list').query({ personId: 'anna', code: '4711' });
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: annaAuth.id, label: 'Handy' });
    expect(JSON.stringify(list.body)).not.toContain('publicKey');

    const foreign = await request(app).delete(`/api/passkeys/${tomAuth.id}`).send({ personId: 'anna', code: '4711' });
    expect(foreign.status).toBe(404);
    expect(store.rows).toHaveLength(2);

    const own = await request(app).delete(`/api/passkeys/${annaAuth.id}`).send({ personId: 'anna', code: '4711' });
    expect(own.status).toBe(200);
    expect(store.rows.map(r => r.credentialId)).toEqual([tomAuth.id]);
    expect((await loginWith(annaAuth)).status).toBe(401);
  });

  it('requires the code to list and delete', async () => {
    expect((await request(app).get('/api/passkeys/list').query({ personId: 'anna', code: '0000' })).status).toBe(401);
    expect((await request(app).delete('/api/passkeys/x').send({ personId: 'anna', code: '0000' })).status).toBe(401);
  });
});

describe('Passkey login rate limit', () => {
  it('blocks the 11th failed login from one IP', async () => {
    for (let i = 0; i < 10; i++) {
      const opt = await request(app).post('/api/passkeys/login/options').send({});
      const res = await request(app).post('/api/passkeys/login/verify').set('X-Forwarded-For', '10.9.9.9')
        .send({ challengeToken: opt.body.challengeToken, response: { id: 'nope' } });
      expect(res.status).toBe(401);
    }
    const opt = await request(app).post('/api/passkeys/login/options').send({});
    const res = await request(app).post('/api/passkeys/login/verify').set('X-Forwarded-For', '10.9.9.9')
      .send({ challengeToken: opt.body.challengeToken, response: { id: 'nope' } });
    expect(res.status).toBe(429);
  });
});
