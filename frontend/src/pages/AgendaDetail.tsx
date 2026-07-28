import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import AgendaHeader from '../components/AgendaHeader';
import AgendaAttendees from '../components/AgendaAttendees';
import AgendaTimeline from '../components/AgendaTimeline';
import UserIdentificationModal from '../components/UserIdentificationModal';
import {
  getCachedAgenda,
  setCachedAgenda,
  enqueueAction,
  processOfflineQueue,
  subscribeOfflineSync
} from '../services/offlineSync';

export default function AgendaDetail() {
  const { id } = useParams();
  const [agenda, setAgenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState<boolean | undefined>(undefined);
  
  // Offline state tracking
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchAgenda = useCallback(async () => {
    if (!id) return;
    try {
      if (navigator.onLine) {
        const response = await fetch(`/api/agendas/${id}`);
        if (response.ok) {
          const data = await response.json();
          setAgenda(data);
          setCachedAgenda(id, data);
          return;
        }
      }
      // Fallback to cache if offline or fetch failed
      const cached = getCachedAgenda(id);
      if (cached) {
        setAgenda(cached);
      } else {
        setAgenda(null);
      }
    } catch (err) {
      console.error('Fetch agenda error, checking cache:', err);
      const cached = getCachedAgenda(id);
      if (cached) {
        setAgenda(cached);
      } else {
        setAgenda(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  // Subscribe to offline sync state changes & process queue when reconnected
  useEffect(() => {
    const unsubscribe = subscribeOfflineSync((online, pending) => {
      setIsOnline(online);
      setPendingCount(pending);
    });

    if (navigator.onLine) {
      processOfflineQueue((syncedAgendaId, updatedAgenda) => {
        if (syncedAgendaId === id) {
          setAgenda(updatedAgenda);
        }
      });
    }

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (agenda?.title) {
      document.title = agenda.title;
    }
  }, [agenda?.title]);

  // Periodic polling to fetch fresh agenda data when online
  useEffect(() => {
    if (!id || !isOnline) return;
    const pollInterval = setInterval(() => {
      fetchAgenda();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [id, isOnline, fetchAgenda]);

  // Ping server periodically to update current user's lastSeen timestamp
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId || !id || !isOnline) return;

    const pingServer = async () => {
      try {
        const response = await fetch(`/api/agendas/${id}/attendees/${userId}/ping`, {
          method: 'PUT'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.lastSeen) {
            setAgenda((prev: any) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                attendees: (prev.attendees || []).map((att: any) => {
                  const attId = att._id || att.id;
                  if (attId === userId || att.name === currentUser.name) {
                    return { ...att, lastSeen: data.lastSeen };
                  }
                  return att;
                })
              };
              setCachedAgenda(id, updated);
              return updated;
            });
          }
        }
      } catch (err) {
        console.error('Failed to ping lastSeen', err);
      }
    };

    pingServer();
    const interval = setInterval(pingServer, 15000);
    return () => clearInterval(interval);
  }, [currentUser, id, isOnline]);

  const userId = currentUser?._id || currentUser?.id;

  const isCreator = !!(
    currentUser && agenda && (
      (agenda.createdBy && (
        agenda.createdBy === currentUser.id ||
        agenda.createdBy === currentUser._id ||
        agenda.createdBy === currentUser.name
      )) ||
      localStorage.getItem(`flashagenda_created_${id}`) === 'true' ||
      (!agenda.createdBy && agenda.attendees && agenda.attendees.length > 0 && (
        agenda.attendees[0].id === currentUser.id ||
        agenda.attendees[0]._id === currentUser._id ||
        agenda.attendees[0].name === currentUser.name
      ))
    )
  );

  useEffect(() => {
    if (agenda && currentUser && !agenda.createdBy && isCreator && isOnline) {
      const creatorId = currentUser.id || currentUser._id || currentUser.name;
      handleUpdateAgenda({ createdBy: creatorId });
    }
  }, [agenda?.createdBy, currentUser, isCreator, isOnline]);

  const handleUpdateAgenda = async (updates: any) => {
    if (!id) return;
    const payload = { ...updates };
    if (userId && !payload.userId) {
      payload.userId = userId;
    }

    // Optimistic UI update & Cache update
    const updatedLocal = { ...agenda, ...payload };
    setAgenda(updatedLocal);
    setCachedAgenda(id, updatedLocal);

    if (!navigator.onLine) {
      const queueType = updates.items !== undefined ? 'UPDATE_ITEMS' : 'UPDATE_AGENDA';
      const queuePayload = updates.items !== undefined ? updates.items : payload;
      enqueueAction(id, queueType, queuePayload);
      return;
    }

    try {
      const response = await fetch(`/api/agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        setAgenda(data);
        setCachedAgenda(id, data);
      } else {
        const queueType = updates.items !== undefined ? 'UPDATE_ITEMS' : 'UPDATE_AGENDA';
        const queuePayload = updates.items !== undefined ? updates.items : payload;
        enqueueAction(id, queueType, queuePayload);
      }
    } catch (err) {
      console.error('Failed to update agenda online, queueing offline action', err);
      const queueType = updates.items !== undefined ? 'UPDATE_ITEMS' : 'UPDATE_AGENDA';
      const queuePayload = updates.items !== undefined ? updates.items : payload;
      enqueueAction(id, queueType, queuePayload);
    }
  };

  const handleAddAttendee = async (newAttendee: any) => {
    try {
      if (navigator.onLine) {
        const response = await fetch(`/api/agendas/${id}/attendees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAttendee),
        });
        if (response.ok) {
          const data = await response.json();
          setAgenda(data);
          setCachedAgenda(id!, data);
          const added = (data.attendees || []).find((a: any) => a.name === newAttendee.name || a.id === newAttendee.id);
          return added || newAttendee;
        }
      }
    } catch (err) {
      console.error('Failed to add attendee online', err);
    }
    
    // Offline / fallback addition
    const updatedAttendees = [...(agenda?.attendees || []), newAttendee];
    await handleUpdateAgenda({ attendees: updatedAttendees });
    return newAttendee;
  };

  const handleUpdateItems = async (newItems: any[]) => {
    await handleUpdateAgenda({ items: newItems });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-comic-red text-white flex justify-content-center align-items-center">
        <i className="pi pi-spin pi-spinner text-yellow-500 text-6xl"></i>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-comic-red text-white flex justify-content-center align-items-center flex-column">
        <i className="pi pi-exclamation-triangle text-yellow-500 text-6xl mb-4"></i>
        <h2 className="text-2xl">Agenda nicht gefunden</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-comic-red text-white p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-x-hidden">
      {/* Subtle background element - disabled on mobile screens for GPU speed */}
      <div className="hidden md:block fixed top-0 right-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 right-0 w-30rem h-30rem bg-yellow-500 border-circle blur-8xl" style={{ transform: 'translate(30%, -30%)' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-1">
        {/* Offline & Sync Status Banners */}
        {!isOnline && (
          <div className="mb-4 p-3 border-round-xl border-3 border-black flex align-items-center justify-content-between bg-yellow-500 text-black font-bold shadow-2 gap-2 flex-wrap">
            <div className="flex align-items-center gap-2">
              <i className="pi pi-wifi text-xl" />
              <span>Offline-Modus {pendingCount > 0 ? `(${pendingCount} Änderung(en) ausstehend)` : ''}</span>
            </div>
            <span className="text-xs bg-black text-yellow-400 px-2 py-1 border-round font-semibold">Lokal gespeichert</span>
          </div>
        )}

        {isOnline && pendingCount > 0 && (
          <div className="mb-4 p-3 border-round-xl border-3 border-black flex align-items-center justify-content-between bg-blue-600 text-white font-bold shadow-2 gap-2">
            <div className="flex align-items-center gap-2">
              <i className="pi pi-spin pi-spinner text-xl" />
              <span>Synchronisiere {pendingCount} ausstehende Änderung(en)...</span>
            </div>
          </div>
        )}

        <AgendaHeader 
          agenda={agenda} 
          onUpdate={handleUpdateAgenda}
          currentUser={currentUser}
          isCreator={isCreator}
        />

        <div className="border-top-1 border-gray-700 my-4 sm:my-6"></div>

        <AgendaAttendees 
          attendees={agenda.attendees || []} 
          items={agenda.items || []}
          currentUser={currentUser}
          onAdd={handleAddAttendee} 
          onUpdateAgenda={handleUpdateAgenda}
          onSwitchUser={() => setShowUserModal(true)}
        />

        <div className="border-top-1 border-gray-700 my-4 sm:my-6"></div>

        <AgendaTimeline 
          agenda={agenda}
          items={agenda.items || []} 
          attendees={agenda.attendees || []}
          currentUser={currentUser}
          isCreator={isCreator}
          onUpdate={handleUpdateItems}
          onUpdateAgenda={handleUpdateAgenda}
        />
      </div>

      <UserIdentificationModal 
        agendaId={agenda._id}
        attendees={agenda.attendees || []}
        onIdentified={setCurrentUser}
        onAddAttendee={handleAddAttendee}
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />

      {/* App Version Footer */}
      <div className="text-center mt-6 text-xs text-yellow-400 font-bold opacity-60">
        FlashAgenda v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
      </div>
    </div>
  );
}
