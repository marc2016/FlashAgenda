import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ActiveUser {
  user: string;
  name: string;
}

interface UseAgendaSocketOptions {
  agendaId?: string;
  currentUser?: { id?: string; user?: string; name?: string } | null;
  onAgendaUpdated?: (agenda: any) => void;
}

export function useAgendaSocket({ agendaId, currentUser, onAgendaUpdated }: UseAgendaSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!agendaId) return;

    // Guard flag: prevents setState and double-disconnect when React Strict Mode
    // unmounts the component before the WebSocket connection is established.
    let destroyed = false;

    // Use polling first so the Socket.IO handshake completes reliably;
    // the client will upgrade to WebSocket automatically once connected.
    const socket = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    const userName = currentUser?.name || currentUser?.user || 'Unbekannt';
    const userId = currentUser?.id || currentUser?.user || userName;

    socket.on('connect', () => {
      if (destroyed) return;
      setIsConnected(true);
      socket.emit('join_agenda', {
        agendaId,
        user: userId,
        name: userName,
      });
    });

    socket.on('disconnect', () => {
      if (destroyed) return;
      setIsConnected(false);
    });

    socket.on('presence_updated', (data: { agendaId: string; activeCount: number; activeUsers: ActiveUser[] }) => {
      if (destroyed) return;
      if (data.agendaId === agendaId) {
        setActiveCount(data.activeCount);
        setActiveUsers(data.activeUsers);
      }
    });

    socket.on('agenda_updated', (data: { agendaId: string; agenda?: any }) => {
      if (destroyed) return;
      if (data.agendaId === agendaId && onAgendaUpdated && data.agenda) {
        onAgendaUpdated(data.agenda);
      }
    });

    return () => {
      destroyed = true;
      // Only emit leave if the socket is actually connected to avoid errors
      if (socket.connected) {
        socket.emit('leave_agenda', { agendaId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [agendaId, currentUser?.id, currentUser?.name]);

  return {
    isConnected,
    activeUsers,
    activeCount,
  };
}
