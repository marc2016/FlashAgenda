import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { QRCodeSVG } from 'qrcode.react';
import { getTotpCode } from '../services/totpService';
import { CARD_COLOR_PALETTE } from './AgendaAttendees';

interface Props {
  visible: boolean;
  onHide: () => void;
  currentUser: any;
  onUpdateUser?: (updatedUser: any) => void;
}

export default function UserProfileModal({ visible, onHide, currentUser, onUpdateUser }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cardColor, setCardColor] = useState('#0a4b7c');
  
  // Modals / Toggles
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCardColor, setEditCardColor] = useState('#0a4b7c');

  const [stats, setStats] = useState({ agendasCount: 0, totalItemsContributed: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // TOTP state
  const [totp, setTotp] = useState(() => {
    if (currentUser?.secretGuid) {
      return getTotpCode(currentUser.secretGuid, 300);
    }
    return { code: currentUser?.securityCode || '----', remainingSeconds: 300 };
  });

  useEffect(() => {
    if (!currentUser?.secretGuid) return;
    const interval = setInterval(() => {
      setTotp(getTotpCode(currentUser.secretGuid, 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.secretGuid]);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setCardColor(currentUser.cardColor || '#0a4b7c');
    }
  }, [currentUser, visible]);

  useEffect(() => {
    if (!currentUser || !visible) return;
    const fetchUserStats = async () => {
      setStatsLoading(true);
      try {
        const userId = currentUser.id || currentUser._id || '';
        const userName = currentUser.name || '';
        const response = await fetch(`/api/agendas/user-stats?user=${encodeURIComponent(userId)}&name=${encodeURIComponent(userName)}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch user stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchUserStats();
  }, [currentUser, visible]);

  if (!currentUser) return null;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleOpenEdit = () => {
    setEditName(name);
    setEditEmail(email);
    setEditAvatar(avatarUrl);
    setEditCardColor(cardColor || '#0a4b7c');
    setEditModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!editName.trim()) return;
    setSaving(true);

    const updatedUser = {
      ...currentUser,
      name: editName.trim(),
      email: editEmail.trim() || undefined,
      avatarUrl: editAvatar.trim() || undefined,
      cardColor: editCardColor
    };

    setName(updatedUser.name);
    setEmail(updatedUser.email || '');
    setAvatarUrl(updatedUser.avatarUrl || '');
    setCardColor(updatedUser.cardColor);

    try {
      await fetch('/api/agendas/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || currentUser._id,
          oldName: currentUser.name,
          name: updatedUser.name,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl,
          cardColor: updatedUser.cardColor
        })
      });
    } catch (err) {
      console.error('Failed to update profile server side:', err);
    }

    localStorage.setItem('flashagenda_last_user', JSON.stringify(updatedUser));
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setEditModalVisible(false);
    setSaving(false);
  };

  const rawAvatar = avatarUrl || currentUser.avatarUrl || '';
  const cleanAvatar = rawAvatar.startsWith('data:') ? undefined : rawAvatar;

  const qrData = JSON.stringify({
    id: currentUser.id || currentUser._id,
    name: name || currentUser.name,
    email: email || currentUser.email,
    avatarUrl: cleanAvatar,
    cardColor: cardColor || currentUser.cardColor,
    securityCode: currentUser.securityCode,
    secretGuid: currentUser.secretGuid
  });

  const transferUrl = `${window.location.origin}?userTransfer=${encodeURIComponent(qrData)}`;

  return (
    <>
      <Dialog
        visible={visible}
        onHide={onHide}
        showHeader={false}
        style={{ width: '95vw', maxWidth: '480px', border: 'none', background: 'transparent', boxShadow: 'none' }}
        contentStyle={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none', overflow: 'visible' }}
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)' }}
        modal
        dismissableMask
      >
        <div className="relative flex flex-column align-items-center">
          
          {/* Exact Agenda Person Card - Credit Card Aspect Ratio (1.586:1) */}
          <div 
            className="relative overflow-hidden w-full select-none flex flex-column justify-content-between transition-all"
            style={{ 
              maxWidth: '480px', 
              aspectRatio: '85.6 / 54',
              height: 'auto',
              background: cardColor || '#0a4b7c', 
              fontFamily: 'system-ui, -apple-system, sans-serif',
              border: '4px solid #000',
              boxShadow: '8px 8px 0px #000',
              borderRadius: '16px'
            }}
          >
            {/* Corner Banderole */}
            <div className="corner-banderole" style={{ fontSize: '0.75rem', padding: '0.35rem 2rem' }}>
              {showQr ? 'Geräteübertragung' : 'Das bist du'}
            </div>

            {showQr ? (
              /* Card QR Code Mode */
              <div className="flex flex-column align-items-center justify-content-center h-full p-3 sm:p-4 text-center text-white gap-2">
                <div className="bg-white p-2 border-round-xl border-2 border-black shadow-4">
                  <QRCodeSVG value={transferUrl} size={150} level="M" />
                </div>
                <span className="text-3xs sm:text-xs opacity-90 max-w-20rem">
                  Scanne diesen Code mit deinem Smartphone, um dich auf dem neuen Gerät anzumelden.
                </span>
                <Button
                  label="Zurück zur Karte"
                  icon="pi pi-arrow-left"
                  onClick={() => setShowQr(false)}
                  className="p-button-warning p-button-sm font-bold text-xs p-button-outlined border-1 py-1 px-3 mt-1"
                />
              </div>
            ) : (
              /* Card Standard Mode */
              <div className="flex h-full text-white p-4 sm:p-5 align-items-center">
                
                {/* Left: Profile Avatar */}
                <div className="relative flex align-items-center justify-content-center border-right-1 border-white-alpha-30 pr-3 sm:pr-4 mr-3 sm:mr-4 flex-shrink-0">
                  <div className="relative flex align-items-center justify-content-center">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={name} 
                        style={{ width: '5.2rem', height: '5.2rem', objectFit: 'cover' }} 
                        className="border-circle border-2 border-white-alpha-40 shadow-3" 
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '5.2rem', height: '5.2rem' }} className="text-white-alpha-90">
                        <path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z" />
                      </svg>
                    )}

                    {/* Camera edit button */}
                    <button
                      onClick={handleOpenEdit}
                      className="absolute bottom-0 right-0 bg-yellow-500 text-black border-circle border-1 border-black p-1 flex align-items-center justify-content-center cursor-pointer hover:scale-110 transition-transform shadow-2"
                      style={{ width: '2rem', height: '2rem', margin: '0 0.25rem -0.25rem 0' }}
                      title="Profilbild ändern"
                    >
                      <i className="pi pi-camera text-xs font-bold" />
                    </button>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="flex flex-column flex-1 justify-content-center m-0 p-0 min-w-0">
                  <div className="flex justify-content-between align-items-start mb-2 gap-2">
                    <div className="font-bold text-xl sm:text-2xl overflow-hidden text-overflow-ellipsis white-space-nowrap text-white flex-1 min-w-0">
                      {name || 'Unbekannt'}
                    </div>
                    
                    {/* Action Buttons: QR Code & Pencil */}
                    <div className="flex align-items-center gap-2 flex-shrink-0 mr-4">
                      <button
                        onClick={() => setShowQr(!showQr)}
                        className={`bg-black-alpha-40 hover:bg-yellow-500 hover:text-black ${showQr ? 'bg-yellow-500 text-black' : 'text-white-alpha-80'} border-circle border-1 border-white-alpha-30 p-1 flex align-items-center justify-content-center cursor-pointer transition-colors`}
                        style={{ width: '2rem', height: '2rem' }}
                        title="Person-Identität per QR-Code übertragen"
                      >
                        <i className="pi pi-qrcode text-sm font-bold" />
                      </button>

                      <button
                        onClick={handleOpenEdit}
                        className="bg-black-alpha-40 hover:bg-yellow-500 hover:text-black text-white-alpha-80 border-circle border-1 border-white-alpha-30 p-1 flex align-items-center justify-content-center cursor-pointer transition-colors"
                        style={{ width: '2rem', height: '2rem' }}
                        title="Eigene Daten & Kartenfarbe bearbeiten"
                      >
                        <i className="pi pi-pencil text-sm font-bold" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-column gap-2 text-sm text-white-alpha-90">
                    <div>
                      <strong className="block text-2xs text-white-alpha-60 uppercase tracking-wide">E-Mail</strong>
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="m-0 p-0 line-height-1 text-white-alpha-90 hover:text-yellow-300 flex align-items-center gap-1 font-semibold overflow-hidden text-overflow-ellipsis"
                          title={email}
                        >
                          <i className="mdi mdi-email text-yellow-400 text-xs flex-shrink-0" />
                          <span className="overflow-hidden text-overflow-ellipsis white-space-nowrap">{email}</span>
                        </a>
                      ) : (
                        <span
                          onClick={handleOpenEdit}
                          className="m-0 p-0 line-height-1 text-white-alpha-50 hover:text-yellow-300 flex align-items-center gap-1 cursor-pointer italic"
                        >
                          <i className="mdi mdi-email-plus-outline text-xs flex-shrink-0" />
                          <span>E-Mail hinzufügen...</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-nogutter border-top-1 border-white-alpha-20 pt-2 mt-1">
                      <div className="col-6">
                        <strong className="block text-2xs text-white-alpha-60 uppercase tracking-wide">Agenden</strong>
                        <span className="m-0 p-0 line-height-1 font-bold text-base text-yellow-300">
                          {statsLoading ? '...' : `${stats.agendasCount} Beigetreten`}
                        </span>
                      </div>
                      <div className="col-6">
                        <strong className="block text-2xs text-white-alpha-60 uppercase tracking-wide">Punkte</strong>
                        <span className="m-0 p-0 line-height-1 font-bold text-base text-yellow-300">
                          {statsLoading ? '...' : `${stats.totalItemsContributed} Erstellt`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TOTP Code Badge at Bottom Left */}
                  <div 
                    className="absolute bottom-0 left-0 m-1 px-2 py-1 text-xs font-mono opacity-90 hover:opacity-100 text-white flex align-items-center gap-2 cursor-text select-text z-2"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    onClick={(e) => e.stopPropagation()}
                    title="Dynamischer Einmalcode (TOTP)"
                  >
                    <span className="select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                      Code: {currentUser.secretGuid ? totp.code : (currentUser.securityCode || '----')}
                    </span>
                    {currentUser.secretGuid && (
                      <span className="text-yellow-400 font-bold ml-1 opacity-90" style={{ fontSize: '0.8rem' }}>
                        ⏱️ {formatTimer(totp.remainingSeconds)}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Bottom Dialog Close Button */}
          <div className="flex justify-content-center mt-4">
            <Button
              label="Schließen"
              icon="pi pi-times font-bold"
              onClick={onHide}
              className="p-button-warning comic-button font-bold text-sm px-4 py-2"
            />
          </div>
        </div>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        header="Profildaten & Kartenfarbe bearbeiten"
        visible={editModalVisible}
        onHide={() => setEditModalVisible(false)}
        style={{ width: '90vw', maxWidth: '420px' }}
        modal
        dismissableMask
        className="p-fluid glass-panel"
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-gray-300">Name</label>
            <InputText
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Name"
              className="p-inputtext-sm"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-gray-300">E-Mail-Adresse</label>
            <InputText
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="E-Mail"
              className="p-inputtext-sm"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-gray-300">Profilbild URL</label>
            <InputText
              value={editAvatar}
              onChange={(e) => setEditAvatar(e.target.value)}
              placeholder="https://beispiel.de/avatar.jpg"
              className="p-inputtext-sm"
            />
          </div>

          {/* Color Palette Swatches */}
          <div className="flex flex-column gap-1 mt-1">
            <label className="text-xs font-bold text-gray-300">Kartenfarbe wählen</label>
            <div className="flex flex-wrap gap-2 py-1">
              {CARD_COLOR_PALETTE.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setEditCardColor(c)}
                  className={`cursor-pointer border-circle border-2 transition-transform hover:scale-110 shadow-2 ${editCardColor === c ? 'border-yellow-400 scale-125' : 'border-black opacity-80'}`}
                  style={{ width: '1.8rem', height: '1.8rem', background: c }}
                  title="Kartenfarbe wählen"
                />
              ))}
            </div>
          </div>

          <div className="flex justify-content-end gap-2 mt-3">
            <Button
              label="Abbrechen"
              icon="pi pi-times"
              className="p-button-text p-button-secondary text-sm"
              onClick={() => setEditModalVisible(false)}
            />
            <Button
              label="Speichern"
              icon="pi pi-check"
              loading={saving}
              onClick={handleSaveUser}
              className="p-button-warning comic-button font-bold text-sm"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
