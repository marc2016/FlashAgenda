import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import AdminLoginModal from '../components/AdminLoginModal';
import UserProfileModal from '../components/UserProfileModal';
import UserCodeLoginModal from '../components/UserCodeLoginModal';
import AchievementModal from '../components/AchievementModal';
import PwaInstallBanner from '../components/PwaInstallBanner';
import AgendaOverview from '../components/AgendaOverview';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [myAgendas, setMyAgendas] = useState<any[]>([]);
  const [agendasLoading, setAgendasLoading] = useState(false);

  const handleTogglePin = async (achId: string) => {
    if (!userState) return;
    const currentPins: string[] = userState.pinnedAchievements || [];
    let updatedPins: string[];
    if (currentPins.includes(achId)) {
      updatedPins = currentPins.filter(id => id !== achId);
    } else {
      if (currentPins.length >= 3) {
        updatedPins = [...currentPins.slice(1), achId];
      } else {
        updatedPins = [...currentPins, achId];
      }
    }

    const updatedUser = { ...userState, pinnedAchievements: updatedPins };
    setUserState(updatedUser);
    localStorage.setItem('flashagenda_last_user', JSON.stringify(updatedUser));

    try {
      await fetch('/api/agendas/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userState.id || userState._id,
          oldName: userState.name,
          name: userState.name,
          pinnedAchievements: updatedPins
        })
      });
    } catch (err) {
      console.error('Failed to sync pinned achievements from home:', err);
    }
  };
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
        const userCode = currentUser.securityCode || currentUser.secretGuid || '';
        const response = await fetch(`/api/agendas/user-agendas?user=${encodeURIComponent(userId)}&name=${encodeURIComponent(userName)}&code=${encodeURIComponent(userCode)}`);
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

  // Archive or restore an agenda from the overview. State only changes once the server confirmed it.
  const handleToggleArchive = async (agendaId: string, archived: boolean): Promise<void> => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/agendas/${agendaId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived,
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Fehler beim Ändern des Archiv-Status');
      }
      const updated = await response.json();
      setMyAgendas(prev => prev.map(a => (a._id === updated._id ? { ...a, ...updated } : a)));
    } catch (err: any) {
      alert(err?.message || 'Fehler beim Ändern des Archiv-Status');
    }
  };

  const handleStartAgenda = async () => {
    setLoading(true);
    try {
      const payload: any = { title: 'Neue Agenda' };
      if (currentUser) {
        payload.createdBy = currentUser.id || currentUser._id;
        payload.userName = currentUser.name || 'Ersteller';
        payload.attendees = [{
          id: currentUser.id || currentUser._id || 'user-creator',
          name: currentUser.name || 'Ersteller',
          email: currentUser.email || '',
          avatarUrl: currentUser.avatarUrl || '',
          securityCode: currentUser.securityCode || '',
          secretGuid: currentUser.secretGuid || '',
          isRegistered: true
        }];
      }

      const response = await fetch('/api/agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
          <>
            <Button
              id="trophy-header-btn"
              icon="mdi mdi-trophy text-xl text-yellow-400"
              onClick={() => setShowAchievementModal(true)}
              className="p-button-rounded p-button-warning p-button-text p-button-sm opacity-90 hover:opacity-100 transition-opacity"
              title="Meine Trophäen & Erfolge"
            />
            <Button
              icon="pi pi-id-card text-xl"
              onClick={() => setShowProfileModal(true)}
              className="p-button-rounded p-button-warning p-button-text p-button-sm opacity-80 hover:opacity-100 transition-opacity"
              title="Mein Benutzerprofil & Pass"
            />
          </>
        )}
        <Button
          id="code-login-header-btn"
          icon="pi pi-key text-xl"
          onClick={() => setShowCodeModal(true)}
          className="p-button-rounded p-button-warning p-button-text p-button-sm opacity-80 hover:opacity-100 transition-opacity"
          title="Mit Einmal-Code / PIN anmelden"
        />
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

        {/* User agenda overview (only shown if logged in) */}
        {currentUser && (currentUser.id || currentUser.name) && (
          <AgendaOverview
            agendas={myAgendas}
            loading={agendasLoading}
            userName={currentUser.name}
            currentUser={currentUser}
            onOpen={(id) => navigate(`/agenda/${id}`)}
            onToggleArchive={handleToggleArchive}
          />
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
        onTogglePin={handleTogglePin}
      />

      <UserCodeLoginModal
        visible={showCodeModal}
        onHide={() => setShowCodeModal(false)}
        onLoginSuccess={(user) => {
          setUserState(user);
        }}
      />

      <AchievementModal
        visible={showAchievementModal}
        onHide={() => setShowAchievementModal(false)}
        currentUser={currentUser}
        onTogglePin={handleTogglePin}
        pinnedAchievements={currentUser?.pinnedAchievements || []}
        initialTab="global"
      />

      <PwaInstallBanner />
    </div>
  );
}
