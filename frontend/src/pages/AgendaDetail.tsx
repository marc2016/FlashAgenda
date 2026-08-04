import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import AgendaHeader from '../components/AgendaHeader';
import AgendaAttendees from '../components/AgendaAttendees';
import AgendaTimeline from '../components/AgendaTimeline';
import UserIdentificationModal from '../components/UserIdentificationModal';
import AuditLogModal from '../components/AuditLogModal';
import { notifyNewItem } from '../services/notificationService';
import {
  getCachedAgenda,
  setCachedAgenda,
  enqueueAction,
  processOfflineQueue,
  subscribeOfflineSync
} from '../services/offlineSync';
import { useAgendaSocket } from '../hooks/useAgendaSocket';

export default function AgendaDetail() {
  const { id } = useParams();
  const [agenda, setAgenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (!id) return null;
    const stored = localStorage.getItem(`flashagenda_${id}_user`);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return null;
  });
  const [showUserModal, setShowUserModal] = useState<boolean | undefined>(undefined);
  const [showAuditModal, setShowAuditModal] = useState(false);
  
  // Offline state tracking
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [, setPendingCount] = useState<number>(0);
  const prevItemsRef = useRef<any[] | null>(null);
  const agendaRef = useRef<any>(agenda);

  useEffect(() => {
    agendaRef.current = agenda;
  }, [agenda]);

  const fetchAgenda = useCallback(async () => {
    if (!id || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      if (navigator.onLine) {
        const response = await fetch(`/api/agendas/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data?.items && prevItemsRef.current !== null) {
            const newItems = data.items.filter((item: any) => {
              return !prevItemsRef.current?.some((prev: any) => (prev._id || prev.id) === (item._id || item.id));
            });
            newItems.forEach((newItem: any) => {
              const authorId = newItem.createdBy;
              const authorName = newItem.author;
              const isSelf = currentUser && (authorId === currentUser.id || authorId === currentUser._id || authorName === currentUser.name);
              if (!isSelf) {
                notifyNewItem(newItem.title, authorName);
              }
            });
          }
          if (data?.items) {
            prevItemsRef.current = data.items;
          }

          // Skip state update if data JSON is identical to current state
          if (agendaRef.current && JSON.stringify(data) === JSON.stringify(agendaRef.current)) {
            return;
          }

          // Defensive merge: if the local state has images for an item but the server
          // response doesn't (e.g. large Base64 not yet persisted, or stripped during transit),
          // keep the local images rather than overwriting them with empty values.
          if (data?.items && agendaRef.current?.items) {
            data.items = data.items.map((serverItem: any) => {
              const localItem = agendaRef.current.items.find(
                (li: any) => (li._id || li.id) === (serverItem._id || serverItem.id)
              );
              if (!localItem) return serverItem;

              const serverHasImages =
                (serverItem.imageUrl && serverItem.imageUrl !== '') ||
                (serverItem.imageUrls && serverItem.imageUrls.length > 0);
              const localHasImages =
                (localItem.imageUrl && localItem.imageUrl !== '') ||
                (localItem.imageUrls && localItem.imageUrls.length > 0);

              if (localHasImages && !serverHasImages) {
                // Server lost/hasn't persisted the images yet — keep local copies
                return {
                  ...serverItem,
                  imageUrl: localItem.imageUrl,
                  imageUrls: localItem.imageUrls,
                };
              }
              return serverItem;
            });
          }

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
  }, [id, currentUser]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const handleLiveAgendaUpdate = useCallback((updatedData: any) => {
    if (!updatedData) return;
    if (updatedData.items && prevItemsRef.current !== null) {
      const newItems = updatedData.items.filter((item: any) => {
        return !prevItemsRef.current?.some((prev: any) => (prev._id || prev.id) === (item._id || item.id));
      });
      newItems.forEach((newItem: any) => {
        const authorId = newItem.createdBy;
        const authorName = newItem.author;
        const isSelf = currentUser && (authorId === currentUser.id || authorId === currentUser._id || authorName === currentUser.name);
        if (!isSelf) {
          notifyNewItem(newItem.title, authorName);
        }
      });
    }
    if (updatedData.items) {
      prevItemsRef.current = updatedData.items;
    }

    // Detect if the broadcast payload has stripped image placeholders (e.g. '[base64]', '[2 images]').
    // In that case the socket payload is incomplete — re-fetch the full agenda from the server
    // so images don't get replaced with placeholders.
    const hasStrippedImages = updatedData.items?.some((item: any) =>
      item.imageUrl === '[base64]' || (Array.isArray(item.imageUrls) && item.imageUrls[0]?.startsWith('['))
    );

    if (hasStrippedImages) {
      // Re-fetch so the client gets the full data including images
      fetchAgenda();
      return;
    }

    setAgenda(updatedData);
    if (id) setCachedAgenda(id, updatedData);
  }, [id, currentUser, fetchAgenda]);

  const { isConnected, activeCount, activeUsers } = useAgendaSocket({
    agendaId: id,
    currentUser,
    onAgendaUpdated: handleLiveAgendaUpdate
  });

  // Banner state machine: 'OFFLINE' | 'SYNC' | 'ONLINE' | 'HIDDEN'
  const [bannerState, setBannerState] = useState<'OFFLINE' | 'SYNC' | 'ONLINE' | 'HIDDEN'>(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'HIDDEN';
  });

  // Subscribe to offline sync state changes & process queue when reconnected
  useEffect(() => {
    let hideTimer: any = null;

    const unsubscribe = subscribeOfflineSync((online, pending) => {
      setIsOnline(online);
      setPendingCount(pending);

      if (!online) {
        setBannerState('OFFLINE');
      } else if (pending > 0) {
        setBannerState('SYNC');
      } else {
        setBannerState((prev) => {
          if (prev === 'OFFLINE' || prev === 'SYNC') {
            hideTimer = setTimeout(() => {
              setBannerState('HIDDEN');
            }, 3000);
            return 'ONLINE';
          }
          return prev;
        });
      }
    });

    if (navigator.onLine) {
      processOfflineQueue((syncedAgendaId, updatedAgenda) => {
        if (syncedAgendaId === id) {
          setAgenda(updatedAgenda);
        }
      });
    }

    return () => {
      unsubscribe();
      if (hideTimer) clearTimeout(hideTimer);
    };
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
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchAgenda();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        fetchAgenda();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, isOnline, fetchAgenda]);

  const currentUserId = currentUser?._id || currentUser?.id || currentUser?.name;

  // Ping server periodically to update current user's lastSeen timestamp
  useEffect(() => {
    if (!currentUserId || !id || !isOnline) return;

    const pingServer = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const response = await fetch(`/api/agendas/${id}/attendees/${currentUserId}/ping`, {
          method: 'PUT'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.lastSeen) {
            setAgenda((prev: any) => {
              if (!prev) return prev;
              let changed = false;
              const updatedAttendees = (prev.attendees || []).map((att: any) => {
                const attId = att._id || att.id;
                if (attId === currentUserId || (currentUser?.name && att.name === currentUser.name)) {
                  if (att.lastSeen === data.lastSeen) return att;
                  changed = true;
                  return { ...att, lastSeen: data.lastSeen };
                }
                return att;
              });
              if (!changed) return prev;
              const updated = { ...prev, attendees: updatedAttendees };
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
  }, [currentUserId, id, isOnline]);

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
    if (currentUser?.name && !payload.userName) {
      payload.userName = currentUser.name;
    }

    // Optimistic UI update & Cache update
    const updatedLocal = { ...agenda, ...payload };
    setAgenda(updatedLocal);
    setCachedAgenda(id, updatedLocal);

    if (!navigator.onLine) {
      const queueType = updates.items !== undefined ? 'UPDATE_ITEMS' : 'UPDATE_AGENDA';
      enqueueAction(id, queueType, payload);
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
        console.warn(`[AgendaDetail] PUT /api/agendas/${id} failed: HTTP ${response.status}`, await response.text().catch(() => ''));
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

  const handleUpdateAttendee = async (updatedAttendee: any) => {
    if (!agenda) return;
    const updatedAttendees = (agenda.attendees || []).map((att: any) => {
      const match = (updatedAttendee.id && att.id === updatedAttendee.id) ||
                    (updatedAttendee._id && att._id === updatedAttendee._id) ||
                    (updatedAttendee._id && updatedAttendee.id && att._id === updatedAttendee.id) ||
                    (updatedAttendee.name && att.name && att.name.trim().toLowerCase() === updatedAttendee.name.trim().toLowerCase());
      if (match) {
        return { ...att, ...updatedAttendee };
      }
      return att;
    });
    await handleUpdateAgenda({ attendees: updatedAttendees });
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

  const renderFloatingBanderole = () => {
    if (bannerState === 'HIDDEN') return null;

    const bgColor =
      bannerState === 'OFFLINE'
        ? '#dc2626'
        : bannerState === 'SYNC'
        ? '#ea580c'
        : '#16a34a';

    return (
      <div
        className="fixed top-0 left-0 flex align-items-center gap-2 font-bold px-3 py-2 uppercase tracking-wider"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 20000,
          backgroundColor: bgColor,
          color: '#ffffff',
          borderBottom: '3px solid #000000',
          borderRight: '3px solid #000000',
          borderBottomRightRadius: '16px',
          boxShadow: '3px 3px 0px #000000',
          fontSize: '0.85rem'
        }}
      >
        {bannerState === 'OFFLINE' && (
          <>
            <i className="pi pi-wifi text-base" />
            <span>OFFLINE</span>
          </>
        )}
        {bannerState === 'SYNC' && (
          <>
            <i className="pi pi-spin pi-spinner text-base" />
            <span>SYNC...</span>
          </>
        )}
        {bannerState === 'ONLINE' && (
          <>
            <i className="pi pi-check-circle text-base" />
            <span>ONLINE</span>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-comic-red text-white flex justify-content-center align-items-center relative">
        {renderFloatingBanderole()}
        <i className="pi pi-spin pi-spinner text-yellow-500 text-6xl"></i>
      </div>
    );
  }

  const handleExportICS = () => {
    if (!agenda) return;
    const formatDateToICS = (date: Date): string => {
      const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
      return (
        date.getUTCFullYear() +
        pad(date.getUTCMonth() + 1) +
        pad(date.getUTCDate()) +
        'T' +
        pad(date.getUTCHours()) +
        pad(date.getUTCMinutes()) +
        pad(date.getUTCSeconds()) +
        'Z'
      );
    };

    const startDate = agenda.date ? new Date(agenda.date) : new Date();
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    const now = new Date();
    const dtStamp = formatDateToICS(now);
    const dtStart = formatDateToICS(startDate);
    const dtEnd = formatDateToICS(endDate);

    const title = agenda.title || 'FlashAgenda Termin';
    const location = agenda.location?.name || '';
    const agendaUrl = window.location.href;

    const attendees = (agenda as any).attendees || [];
    let attendeesDescriptionText = '';
    if (attendees.length > 0) {
      attendeesDescriptionText = '\\n\\nTeilnehmer:\\n' + attendees.map((att: any) => {
        return att.email ? `- ${att.name} (${att.email})` : `- ${att.name}`;
      }).join('\\n');
    }

    let descriptionText = `Link zur Agenda: ${agendaUrl}${attendeesDescriptionText}`;
    if (agenda.items && agenda.items.length > 0) {
      descriptionText += `\\n\\nAgendapunkte:\\n` + agenda.items.map((it: any) => `- ${it.title}`).join('\\n');
    }

    const escapedTitle = title.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
    const escapedLocation = location.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

    const attendeeIcsLines: string[] = [];
    attendees.forEach((att: any) => {
      const name = (att.name || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
      if (att.email && att.email.trim()) {
        attendeeIcsLines.push(`ATTENDEE;CN=${name}:mailto:${att.email.trim()}`);
      } else {
        attendeeIcsLines.push(`ATTENDEE;CN=${name}:mailto:unbekannt@flashagenda`);
      }
    });

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FlashAgenda//NONSGML v1.0//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:flashagenda-${agenda._id || Date.now()}@flashagenda`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapedTitle}`,
      `LOCATION:${escapedLocation}`,
      ...attendeeIcsLines,
      `DESCRIPTION:${descriptionText}`,
      `URL:${agendaUrl}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const icsContent = icsLines.join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const sanitizeFilename = (title || 'agenda').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('download', `${sanitizeFilename}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!agenda) {
    return (
      <div className="min-h-screen bg-comic-red text-white flex justify-content-center align-items-center flex-column relative">
        {renderFloatingBanderole()}
        <i className="pi pi-exclamation-triangle text-yellow-500 text-6xl mb-4"></i>
        <h2 className="text-2xl">Agenda nicht gefunden</h2>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-comic-red text-white p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-x-hidden transition-all duration-300"
      style={!currentUser ? { filter: 'blur(20px)', WebkitFilter: 'blur(20px)', pointerEvents: 'none', userSelect: 'none' } : {}}
    >
      {renderFloatingBanderole()}
      {/* Subtle background element - disabled on mobile screens for GPU speed */}
      <div className="hidden md:block fixed top-0 right-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 right-0 w-30rem h-30rem bg-yellow-500 border-circle blur-8xl" style={{ transform: 'translate(30%, -30%)' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-1">
        {agenda.isArchived && (
          <div className="bg-yellow-500-alpha-20 border-2 border-yellow-400 border-round-xl p-3 mb-4 flex align-items-center justify-content-center gap-3 text-center shadow-4">
            <i className="pi pi-lock text-yellow-400 text-2xl" />
            <div>
              <span className="font-bold text-yellow-400 text-lg block">Diese Agenda ist archiviert</span>
              <span className="text-xs text-gray-300">Sie ist schreibgeschützt und kann nicht mehr verändert werden.</span>
            </div>
          </div>
        )}

        <AgendaHeader 
          agenda={agenda} 
          onUpdate={handleUpdateAgenda}
          currentUser={currentUser}
          isCreator={isCreator}
          isConnected={isConnected}
          activeCount={activeCount}
          activeUsers={activeUsers}
        />

        <div className="border-top-1 border-gray-700 my-4 sm:my-6"></div>

        <AgendaAttendees 
          agendaId={agenda._id}
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

        {/* Bottom Footer & Buttons */}
        <div className="mt-3 sm:mt-4 mb-4 flex flex-column sm:flex-row align-items-center justify-content-between gap-3 border-top-1 border-gray-700 pt-4">
          <div className="flex align-items-center gap-2 flex-wrap justify-content-center sm:justify-content-start">
            <Button
              icon="pi pi-calendar-plus"
              label="Kalender (.ics)"
              onClick={handleExportICS}
              className="comic-button-secondary p-button-sm flex align-items-center gap-2 font-bold"
              title="Agenda in Kalender exportieren (.ics)"
            />
            <Button
              icon="pi pi-history"
              label="Audit-Log"
              onClick={() => setShowAuditModal(true)}
              className="comic-button-secondary p-button-sm flex align-items-center gap-2 font-bold"
              title="Agenda Audit-Protokoll anzeigen"
            />
          </div>
          <div className="text-xs text-yellow-400 font-bold opacity-60">
            FlashAgenda v{import.meta.env.VITE_APP_VERSION || '3.2.0'}
          </div>
        </div>
      </div>

      <UserIdentificationModal 
        agendaId={agenda._id}
        attendees={agenda.attendees || []}
        currentUser={currentUser}
        onIdentified={setCurrentUser}
        onAddAttendee={handleAddAttendee}
        onUpdateAttendee={handleUpdateAttendee}
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />

      <AuditLogModal
        agendaId={agenda._id}
        visible={showAuditModal}
        onHide={() => setShowAuditModal(false)}
      />
    </div>
  );
}
