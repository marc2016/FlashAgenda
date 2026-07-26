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

  useEffect(() => {
    if (currentUser && agenda) {
      // Ping to update lastSeen
      fetch(`/api/agendas/${id}/attendees/${currentUser.id}/ping`, {
        method: 'PUT'
      }).catch(err => console.error('Failed to ping lastSeen', err));
    }
  }, [currentUser, id, agenda]);

  const handleUpdateAgenda = async (updates: any) => {
    try {
      const response = await fetch(`/api/agendas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      setAgenda(data);
    } catch (err) {
      console.error('Failed to update agenda', err);
    }
  };

  const handleAddAttendee = async (newAttendee: any) => {
    const updatedAttendees = [...(agenda.attendees || []), newAttendee];
    await handleUpdateAgenda({ attendees: updatedAttendees });
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
    <div className="min-h-screen bg-comic-red text-white p-4 md:p-6 lg:p-8 relative overflow-x-hidden">
      {/* Subtle background element */}
      <div className="fixed top-0 right-0 w-full h-full pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 right-0 w-30rem h-30rem bg-yellow-500 border-circle blur-8xl" style={{ transform: 'translate(30%, -30%)' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-1">
        
        <AgendaHeader 
          agenda={agenda} 
          onUpdate={handleUpdateAgenda} 
        />

        <div className="border-top-1 border-gray-700 my-6"></div>

        <AgendaAttendees 
          attendees={agenda.attendees || []} 
          items={agenda.items || []}
          onAdd={handleAddAttendee} 
        />

        <div className="border-top-1 border-gray-700 my-6"></div>

        <AgendaTimeline 
          items={agenda.items || []} 
          attendees={agenda.attendees || []}
          currentUser={currentUser}
          onUpdate={handleUpdateItems} 
        />

      </div>

      <UserIdentificationModal 
        agendaId={agenda._id}
        attendees={agenda.attendees || []}
        onIdentified={setCurrentUser}
        onAddAttendee={handleAddAttendee}
      />
    </div>
  );
}
