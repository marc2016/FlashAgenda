import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import AdminLoginModal from '../components/AdminLoginModal';
import UserProfileModal from '../components/UserProfileModal';
import PwaInstallBanner from '../components/PwaInstallBanner';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myAgendas, setMyAgendas] = useState<any[]>([]);
  const [agendasLoading, setAgendasLoading] = useState(false);
  const [userState, setUserState] = useState<any>(() => {
    try {
      const str = localStorage.getItem('flashagenda_last_user');
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'FlashAgenda';
  }, []);

  // Handle QR code transfer parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const transferParam = searchParams.get('userTransfer');
    if (transferParam) {
      try {
        const transferredUser = JSON.parse(decodeURIComponent(transferParam));
        if (transferredUser && (transferredUser.name || transferredUser.id)) {
          const claimedUser = { ...transferredUser, isRegistered: true };
          localStorage.setItem('flashagenda_last_user', JSON.stringify(claimedUser));
          setUserState(claimedUser);

          // Clean URL parameter without page reload
          const url = new URL(window.location.href);
          url.searchParams.delete('userTransfer');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (err) {
        console.error('Failed to parse userTransfer parameter:', err);
      }
    }
  }, []);

  const currentUser = userState;

  useEffect(() => {
    if (!currentUser) return;
    const fetchUserAgendas = async () => {
      setAgendasLoading(true);
      try {
        const userId = currentUser.id || currentUser._id || '';
        const userName = currentUser.name || '';
        const response = await fetch(`/api/agendas/user-agendas?user=${encodeURIComponent(userId)}&name=${encodeURIComponent(userName)}`);
        if (response.ok) {
          const data = await response.json();
          setMyAgendas(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch user agendas:', err);
      } finally {
        setAgendasLoading(false);
      }
    };

    fetchUserAgendas();
  }, [currentUser]);

  const handleStartAgenda = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      if (!data?._id) {
        throw new Error('No agenda ID returned from server');
      }
      localStorage.setItem(`flashagenda_created_${data._id}`, 'true');
      navigate(`/agenda/${data._id}`);
    } catch (error) {
      console.error('Failed to create agenda', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-column align-items-center justify-content-center min-h-screen relative overflow-hidden bg-comic-red text-white py-6">
      {/* Top right admin entry & profile buttons */}
      <div className="absolute top-0 right-0 m-3 z-3 flex align-items-center gap-2">
        {currentUser && (
          <Button
            icon="pi pi-id-card text-xl"
            onClick={() => setShowProfileModal(true)}
            className="p-button-rounded p-button-warning p-button-text p-button-sm opacity-80 hover:opacity-100 transition-opacity"
            title="Mein Benutzerprofil & Pass"
          />
        )}
        <Button
          icon="pi pi-shield text-xl"
          onClick={() => setShowAdminModal(true)}
          className="p-button-rounded p-button-warning p-button-text p-button-sm opacity-60 hover:opacity-100 transition-opacity"
          title="Admin-Verwaltung"
        />
      </div>

      {/* Background glowing effects for comic feel */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 hidden sm:block">
        <div className="absolute top-50 left-50 w-30rem h-30rem bg-yellow-400 border-circle filter-blur blur-8xl" style={{ transform: 'translate(-50%, -50%)', opacity: 0.4 }}></div>
      </div>

      <div className="z-1 text-center p-3 sm:p-6 flex flex-column align-items-center max-w-full w-full">
        <div className="mb-2 sm:mb-4 css-logo-container">
          <img src="/favicon.svg" alt="FlashAgenda Icon" className="css-logo-icon" />
          <h1 className="comic-font comic-text-shadow css-logo-text">FlashAgenda</h1>
        </div>

        <Button 
          id="start-agenda-btn"
          label="AGENDA STARTEN!" 
          icon="pi pi-bolt font-bold" 
          size="large"
          loading={loading}
          onClick={handleStartAgenda}
          className={classNames(
            "text-xl sm:text-2xl px-4 sm:px-5 py-3",
            "bg-yellow-500 text-white comic-button"
          )}
          style={{ marginTop: 'clamp(2rem, 6vh, 5rem)' }}
        />

        {/* User Agendas List */}
        {currentUser && (
          <div className="mt-5 w-full max-w-28rem flex flex-column gap-2 text-left z-2 px-3">
            <div className="flex align-items-center justify-content-between px-1 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex align-items-center gap-2">
                <i className="pi pi-list text-xs" />
                <span>Deine Agenden ({myAgendas.length})</span>
              </span>
              {currentUser.name && (
                <span className="text-xs text-gray-300 font-bold opacity-80">
                  {currentUser.name}
                </span>
              )}
            </div>

            {agendasLoading ? (
              <div className="text-center p-3 text-gray-300 text-xs font-bold">
                <i className="pi pi-spin pi-spinner text-yellow-400 mr-2" />
                Lade deine Agenden...
              </div>
            ) : myAgendas.length === 0 ? (
              <div className="text-center p-3 bg-black-alpha-30 border-round text-xs text-gray-400 font-bold">
                Noch keine Agenden vorhanden.
              </div>
            ) : (
              <div className="flex flex-column gap-2 max-h-18rem overflow-y-auto pr-1">
                {myAgendas.map(agenda => (
                  <div
                    key={agenda._id}
                    onClick={() => navigate(`/agenda/${agenda._id}`)}
                    className="bg-black-alpha-50 hover:bg-black-alpha-80 border-1 border-yellow-400 border-round-lg p-3 flex align-items-center justify-content-between cursor-pointer transition-all shadow-3 group"
                  >
                    <div className="overflow-hidden mr-2">
                      <div className="font-bold text-white text-sm sm:text-base overflow-hidden text-overflow-ellipsis white-space-nowrap group-hover:text-yellow-400 transition-colors">
                        {agenda.title || 'Unbenannte Agenda'}
                      </div>
                      <div className="text-xs text-gray-300 flex align-items-center gap-3 mt-1 opacity-90">
                        <span>
                          <i className="pi pi-users text-xs text-yellow-400 mr-1" />
                          {agenda.attendees?.length || 0} Personen
                        </span>
                        <span>
                          <i className="pi pi-check-square text-xs text-yellow-400 mr-1" />
                          {agenda.items?.length || 0} Punkte
                        </span>
                      </div>
                    </div>

                    <i className="pi pi-chevron-right text-yellow-400 text-sm group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 right-0 m-3 z-2 text-xs font-bold opacity-60 text-yellow-400">
        v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
      </div>

      <AdminLoginModal
        visible={showAdminModal}
        onHide={() => setShowAdminModal(false)}
      />

      <UserProfileModal
        visible={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUpdateUser={(updated) => setUserState(updated)}
      />

      <PwaInstallBanner />
    </div>
  );
}
