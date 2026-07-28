import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AgendaHeader from '../components/AgendaHeader';
import AgendaAttendees from '../components/AgendaAttendees';
import AgendaTimeline from '../components/AgendaTimeline';
import UserIdentificationModal from '../components/UserIdentificationModal';

export default function AgendaDetail() {
  const { id } = useParams();
  const [agenda, setAgenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState<boolean | undefined>(undefined);

  const fetchAgenda = async () => {
    try {
      const response = await fetch(`/api/agendas/${id}`);
      if (!response.ok) throw new Error('Not found');
      const data = await response.json();
      setAgenda(data);
    } catch (err) {
      console.error(err);
      setAgenda(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda();
  }, [id]);

  useEffect(() => {
    if (agenda?.title) {
      document.title = agenda.title;
    }
  }, [agenda?.title]);

  // Periodic polling to fetch fresh agenda data (e.g. attendee online status updates)
  useEffect(() => {
    if (!id) return;
    const pollInterval = setInterval(() => {
      fetchAgenda();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [id]);

  // Ping server periodically to update current user's lastSeen timestamp
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId || !id) return;

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
              return {
                ...prev,
                attendees: (prev.attendees || []).map((att: any) => {
                  const attId = att._id || att.id;
                  if (attId === userId || att.name === currentUser.name) {
                    return { ...att, lastSeen: data.lastSeen };
                  }
                  return att;
                })
              };
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
  }, [currentUser, id]);

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
    if (agenda && currentUser && !agenda.createdBy && isCreator) {
      const creatorId = currentUser.id || currentUser._id || currentUser.name;
      handleUpdateAgenda({ createdBy: creatorId });
    }
  }, [agenda?.createdBy, currentUser, isCreator]);

  const handleUpdateAgenda = async (updates: any) => {
    try {
      const payload = { ...updates };
      if (userId && !payload.userId) {
        payload.userId = userId;
      }
      const response = await fetch(`/api/agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setAgenda(data);
    } catch (err) {
      console.error('Failed to update agenda', err);
    }
  };

  const handleAddAttendee = async (newAttendee: any) => {
    try {
      const response = await fetch(`/api/agendas/${id}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAttendee),
      });
      if (response.ok) {
        const data = await response.json();
        setAgenda(data);
        const added = (data.attendees || []).find((a: any) => a.name === newAttendee.name || a.id === newAttendee.id);
        return added || newAttendee;
      }
    } catch (err) {
      console.error('Failed to add attendee', err);
      // Fallback
      const updatedAttendees = [...(agenda.attendees || []), newAttendee];
      await handleUpdateAgenda({ attendees: updatedAttendees });
    }
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
    </div>
  );
}
