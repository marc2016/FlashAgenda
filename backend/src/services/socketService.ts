import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

interface UserPresence {
  socketId: string;
  user: string;
  name: string;
}

let io: SocketIOServer | null = null;
const roomPresence = new Map<string, Map<string, UserPresence>>();

export function initSocketService(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    // Raise buffer limit to accommodate large agenda payloads (images, etc.)
    maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB
  });

  io.on('connection', (socket: Socket) => {
    let currentAgendaId: string | null = null;
    let currentUser: string | null = null;

    socket.on('join_agenda', (data: { agendaId: string; user?: string; name?: string }) => {
      const { agendaId, user, name } = data;
      if (!agendaId) return;

      currentAgendaId = agendaId;
      currentUser = user || 'Unbekannt';
      const roomName = `agenda:${agendaId}`;

      socket.join(roomName);

      // Track presence
      if (!roomPresence.has(agendaId)) {
        roomPresence.set(agendaId, new Map());
      }
      roomPresence.get(agendaId)!.set(socket.id, {
        socketId: socket.id,
        user: currentUser,
        name: name || currentUser,
      });

      broadcastPresence(agendaId);
    });

    socket.on('leave_agenda', (data: { agendaId: string }) => {
      const { agendaId } = data;
      if (!agendaId) return;

      socket.leave(`agenda:${agendaId}`);
      removeUserFromPresence(agendaId, socket.id);
      broadcastPresence(agendaId);
    });

    socket.on('disconnect', () => {
      if (currentAgendaId) {
        removeUserFromPresence(currentAgendaId, socket.id);
        broadcastPresence(currentAgendaId);
      }
    });
  });

  return io;
}

function removeUserFromPresence(agendaId: string, socketId: string) {
  if (roomPresence.has(agendaId)) {
    const map = roomPresence.get(agendaId)!;
    map.delete(socketId);
    if (map.size === 0) {
      roomPresence.delete(agendaId);
    }
  }
}

function broadcastPresence(agendaId: string) {
  if (!io) return;

  const usersMap = roomPresence.get(agendaId);
  const activeUsers: { user: string; name: string }[] = [];

  if (usersMap) {
    const seen = new Set<string>();
    for (const item of usersMap.values()) {
      if (!seen.has(item.user)) {
        seen.add(item.user);
        activeUsers.push({ user: item.user, name: item.name });
      }
    }
  }

  io.to(`agenda:${agendaId}`).emit('presence_updated', {
    agendaId,
    activeCount: activeUsers.length,
    activeUsers,
  });
}

export function broadcastAgendaEvent(agendaId: string, event: string, payload?: any) {
  if (!io) return;

  // Strip large Base64 image data from items before broadcasting.
  // Clients that need the full data will re-fetch via HTTP.
  let broadcastPayload = payload;
  if (payload?.agenda?.items) {
    const strippedItems = payload.agenda.items.map((item: any) => {
      const { imageUrl, imageUrls, ...rest } = item;
      return {
        ...rest,
        // Keep a flag so the client knows images exist but aren't in the payload
        imageUrl: imageUrl ? '[base64]' : undefined,
        imageUrls: imageUrls?.length ? [`[${imageUrls.length} images]`] : undefined,
      };
    });
    broadcastPayload = {
      ...payload,
      agenda: { ...payload.agenda, items: strippedItems },
    };
  }

  io.to(`agenda:${agendaId}`).emit(event, {
    agendaId,
    timestamp: new Date().toISOString(),
    ...broadcastPayload,
  });
}
