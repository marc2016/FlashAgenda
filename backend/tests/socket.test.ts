import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { initSocketService, broadcastAgendaEvent } from '../src/services/socketService';

describe('Socket.io Real-Time Service', () => {
  let server: http.Server;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    initSocketService(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should allow a client to connect and join an agenda room with presence tracking', async () => {
    clientSocket = ClientIO(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
    });

    const presencePromise = new Promise<any>((resolve) => {
      clientSocket.on('presence_updated', (data) => {
        resolve(data);
      });
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('join_agenda', {
          agendaId: 'test-agenda-123',
          user: 'test-user-1',
          name: 'Max Mustermann',
        });
        resolve();
      });
    });

    const presenceData = await presencePromise;
    expect(presenceData.agendaId).toBe('test-agenda-123');
    expect(presenceData.activeCount).toBe(1);
    expect(presenceData.activeUsers[0].name).toBe('Max Mustermann');
  });

  it('should broadcast agenda_updated event to all clients in the room', async () => {
    const updatePromise = new Promise<any>((resolve) => {
      clientSocket.on('agenda_updated', (data) => {
        resolve(data);
      });
    });

    broadcastAgendaEvent('test-agenda-123', 'agenda_updated', {
      agenda: { _id: 'test-agenda-123', title: 'Live Updated Title' },
    });

    const updateData = await updatePromise;
    expect(updateData.agendaId).toBe('test-agenda-123');
    expect(updateData.agenda.title).toBe('Live Updated Title');
  });
});
