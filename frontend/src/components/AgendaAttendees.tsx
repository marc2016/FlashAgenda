import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { getTotpCode } from '../services/totpService';

interface Attendee {
  _id?: string;
  id?: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  securityCode?: string;
  secretGuid?: string;
  isRegistered?: boolean;
  joinedAt?: string;
  lastSeen?: string;
}

interface Props {
  agendaId?: string;
  attendees: Attendee[];
  items?: any[];
  currentUser?: any;
  onAdd: (attendee: Attendee) => Promise<void>;
  onUpdateAgenda?: (updates: any) => Promise<void>;
  onSwitchUser?: () => void;
}

const colors = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // blue
  'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', // red
  'linear-gradient(135deg, #10b981 0%, #047857 100%)', // green
  'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // orange
  'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)', // purple
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // pink
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)', // cyan
];

const formatDate = (dateInput?: string | Date) => {
  if (!dateInput) return 'Unbekannt';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Unbekannt';

    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60 && diffSec >= -5) {
      return 'Jetzt online';
    }
    if (diffSec < 3600 && diffSec >= 60) {
      const mins = Math.floor(diffSec / 60);
      return `Vor ${mins} Min.`;
    }
    if (diffSec < 86400 && diffSec >= 3600) {
      const hours = Math.floor(diffSec / 3600);
      return `Vor ${hours} Std.`;
    }

    return format(date, 'dd.MM.yyyy HH:mm');
  } catch {
    return 'Unbekannt';
  }
};

const isUserOnline = (lastSeen?: string | Date) => {
  if (!lastSeen) return false;
  try {
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    if (isNaN(date.getTime())) return false;
    const diffSec = (Date.now() - date.getTime()) / 1000;
    return diffSec >= -5 && diffSec < 120;
  } catch {
    return false;
  }
};

function RotatingTotpBadge({ secretGuid, fallbackCode }: { secretGuid?: string; fallbackCode?: string }) {
  const [totp, setTotp] = useState(() => {
    if (secretGuid) {
      return getTotpCode(secretGuid, 300);
    }
    return { code: fallbackCode || '----', remainingSeconds: 300 };
  });

  useEffect(() => {
    if (!secretGuid) return;
    const interval = setInterval(() => {
      setTotp(getTotpCode(secretGuid, 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [secretGuid]);

  const displayCode = secretGuid ? totp.code : (fallbackCode || '----');
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div 
      className="absolute bottom-0 left-0 m-1 px-1 text-2xs font-mono opacity-80 hover:opacity-100 text-white flex align-items-center gap-1 cursor-text select-text z-2"
      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      onClick={(e) => e.stopPropagation()}
      title="Dynamischer Einmalcode (TOTP)"
    >
      <span className="select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>Code: {displayCode}</span>
      {secretGuid && (
        <span className="text-yellow-400 font-bold ml-1 opacity-90" style={{ fontSize: '0.75rem' }}>
          ⏱️ {formatTimer(totp.remainingSeconds)}
        </span>
      )}
    </div>
  );
}

export default function AgendaAttendees({ agendaId, attendees, items = [], currentUser, onAdd, onUpdateAgenda, onSwitchUser }: Props) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Avatar Modal State
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit / Delete Attendee Modal State
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Person Transfer QR Code Modal State
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrUser, setQrUser] = useState<Attendee | null>(null);

  // Precompute item counts per attendee O(N + M)
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item) continue;
      const createdBy = item.createdBy?.trim().toLowerCase();
      const author = item.author?.trim().toLowerCase();
      
      for (const att of attendees) {
        const attKey = att._id || att.id || att.name;
        const attId = (att._id || att.id)?.toLowerCase();
        const attName = att.name?.trim().toLowerCase();

        if (
          (attId && createdBy === attId) ||
          (attName && (createdBy === attName || author === attName))
        ) {
          counts.set(attKey, (counts.get(attKey) || 0) + 1);
        }
      }
    }
    return counts;
  }, [items, attendees]);

  const generateSecurityCode = () => Math.floor(1000 + Math.random() * 9000).toString();
  const hasMigratedRef = useRef(false);

  // Auto-generate secretGuid & security code for any legacy attendee that lacks one
  useEffect(() => {
    if (hasMigratedRef.current || !onUpdateAgenda || !attendees || attendees.length === 0) return;
    const hasMissingSecret = attendees.some(a => !a.securityCode || !a.secretGuid);
    if (hasMissingSecret) {
      hasMigratedRef.current = true;
      const updated = attendees.map(a => {
        return {
          ...a,
          securityCode: a.securityCode || generateSecurityCode(),
          secretGuid: a.secretGuid || uuidv4()
        };
      });
      onUpdateAgenda({ attendees: updated });
    }
  }, [attendees, onUpdateAgenda]);

  const handleAdd = useCallback(async () => {
    if (newName.trim()) {
      const code = generateSecurityCode();
      const guid = uuidv4();
      await onAdd({ id: uuidv4(), name: newName.trim(), email: newEmail.trim() || undefined, securityCode: code, secretGuid: guid, isRegistered: false });
      setNewName('');
      setNewEmail('');
      setVisible(false);
    }
  }, [newName, newEmail, onAdd]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingAvatar(true);
      try {
        const compressedDataUrl = await compressImage(file);
        setAvatarUrlInput(compressedDataUrl);
      } catch (err) {
        console.error('Failed to compress avatar image', err);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updated = attendees.map(a => {
        const isThisUser = currentUser && (
          (a.id && currentUser.id === a.id) ||
          (a._id && currentUser._id === a._id) ||
          (a._id && currentUser.id === a._id) ||
          (a.id && currentUser._id === a.id) ||
          (currentUser.name && a.name && currentUser.name.trim().toLowerCase() === a.name.trim().toLowerCase())
        );
        if (isThisUser) {
          return { ...a, avatarUrl: avatarUrlInput };
        }
        return a;
      });

      if (onUpdateAgenda) {
        await onUpdateAgenda({ attendees: updated });
      }
    } catch (err) {
      console.error('Failed to save avatar', err);
    } finally {
      setUploadingAvatar(false);
      setAvatarModalVisible(false);
    }
  };

  const handleOpenEditAttendee = (att: Attendee) => {
    const isThisUser = currentUser && (
      (att.id && currentUser.id === att.id) ||
      (att._id && currentUser._id === att._id) ||
      (att._id && currentUser.id === att._id) ||
      (att.id && currentUser._id === att.id) ||
      (currentUser.name && att.name && currentUser.name.trim().toLowerCase() === att.name.trim().toLowerCase())
    );
    if (!isThisUser) return;

    setEditingAttendee(att);
    setEditName(att.name);
    setEditEmail(att.email || '');
    setEditModalVisible(true);
  };

  const handleSaveEditAttendee = async () => {
    if (!editingAttendee || !editName.trim()) return;
    const oldName = editingAttendee.name;
    const newNameStr = editName.trim();
    const newEmailStr = editEmail.trim();

    const updated = attendees.map(a => {
      const isTarget =
        (editingAttendee.id && a.id === editingAttendee.id) ||
        (editingAttendee._id && a._id === editingAttendee._id) ||
        a.name === oldName;
      if (isTarget) {
        return { ...a, name: newNameStr, email: newEmailStr || undefined };
      }
      return a;
    });

    if (onUpdateAgenda) {
      await onUpdateAgenda({ attendees: updated });
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('flashagenda_') && key.endsWith('_user')) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (
              (editingAttendee.id && parsed.id === editingAttendee.id) ||
              (editingAttendee._id && parsed._id === editingAttendee._id) ||
              parsed.name === oldName
            ) {
              localStorage.setItem(key, JSON.stringify({ ...parsed, name: newNameStr }));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to update local storage user name:', err);
    }

    setEditModalVisible(false);
    setEditingAttendee(null);
  };

  const handleDeleteAttendee = async () => {
    if (!editingAttendee) return;
    const updated = attendees.filter(a => {
      const isTarget =
        (editingAttendee.id && a.id === editingAttendee.id) ||
        (editingAttendee._id && a._id === editingAttendee._id) ||
        a.name === editingAttendee.name;
      return !isTarget;
    });

    if (onUpdateAgenda) {
      await onUpdateAgenda({ attendees: updated });
    }
    setEditModalVisible(false);
    setEditingAttendee(null);
  };

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 className="text-xl sm:text-2xl text-yellow-500 font-bold m-0" style={{ textShadow: '2px 2px 0px #000' }}>Personen</h3>
        {onSwitchUser && (
          <Button
            icon="pi pi-user-edit"
            rounded
            text
            className="p-button-warning"
            onClick={onSwitchUser}
            title="Person wechseln"
          />
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 sm:gap-4 justify-content-center md:justify-content-start">
        {attendees.map((att, index) => {
          const attendeeId = att._id || att.id || att.name;
          const cardColor = colors[index % colors.length];
          const isSelf = currentUser && (
            (att.id && currentUser.id === att.id) ||
            (att._id && currentUser._id === att._id) ||
            (att._id && currentUser.id === att._id) ||
            currentUser.name === att.name
          );
          const online = isUserOnline(att.lastSeen);
          const count = itemCounts.get(attendeeId) || 0;
          
          return (
            <div 
              key={attendeeId} 
              className="relative overflow-hidden w-full md:w-auto"
              style={{ 
                maxWidth: '340px', 
                minHeight: '190px',
                height: 'auto',
                background: cardColor, 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000',
                borderRadius: '12px'
              }}
            >
              {isSelf && (
                <div className="corner-banderole">
                  Das bist du
                </div>
              )}
              <div className="flex h-full text-white p-3 sm:p-4 align-items-center">
                
                {/* Left: Profile Icon or Custom Avatar */}
                <div className="relative flex align-items-center justify-content-center border-right-1 border-white-alpha-30 pr-2 sm:pr-4 mr-2 sm:mr-4 flex-shrink-0">
                  <div className="relative flex align-items-center justify-content-center">
                    {att.avatarUrl ? (
                      <img 
                        src={att.avatarUrl} 
                        alt={att.name} 
                        style={{ width: '4.5rem', height: '4.5rem', objectFit: 'cover' }} 
                        className="border-circle border-2 border-white-alpha-40" 
                        loading="lazy"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '4.5rem', height: '4.5rem' }} className="text-white-alpha-90">
                        <path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z" />
                      </svg>
                    )}

                    {/* Camera button only for current user's card */}
                    {isSelf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarUrlInput(att.avatarUrl || '');
                          setAvatarModalVisible(true);
                        }}
                        className="absolute bottom-0 right-0 bg-yellow-500 text-black border-circle border-1 border-black p-1 flex align-items-center justify-content-center cursor-pointer hover:scale-110 transition-transform shadow-2"
                        style={{ width: '1.8rem', height: '1.8rem', margin: '0 0.25rem -0.25rem 0' }}
                        title="Profilbild ändern"
                      >
                        <i className="pi pi-camera text-xs font-bold" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Details */}
                <div className="flex flex-column flex-1 justify-content-center m-0 p-0 min-w-0">
                  <div className="flex justify-content-between align-items-start mb-1 sm:mb-2 gap-1">
                    <div className="font-bold text-lg sm:text-2xl overflow-hidden text-overflow-ellipsis white-space-nowrap text-white flex-1 min-w-0">
                      {att.name}
                    </div>
                    {isSelf && (
                      <div className="flex align-items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrUser(att);
                            setQrModalVisible(true);
                          }}
                          className="bg-black-alpha-40 hover:bg-yellow-500 hover:text-black text-white-alpha-80 border-circle border-1 border-white-alpha-30 p-1 flex align-items-center justify-content-center cursor-pointer transition-colors"
                          style={{ width: '1.75rem', height: '1.75rem' }}
                          title="Person-Identität per QR-Code übertragen"
                        >
                          <i className="pi pi-qrcode text-xs font-bold" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAttendee(att);
                          }}
                          className="bg-black-alpha-40 hover:bg-yellow-500 hover:text-black text-white-alpha-80 border-circle border-1 border-white-alpha-30 p-1 flex align-items-center justify-content-center cursor-pointer transition-colors"
                          style={{ width: '1.75rem', height: '1.75rem' }}
                          title="Eigene Daten bearbeiten"
                        >
                          <i className="pi pi-pencil text-xs font-bold" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-column gap-1 text-xs sm:text-sm text-white-alpha-90">
                    <div>
                      <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">E-Mail</strong>
                      {att.email ? (
                        <a
                          href={`mailto:${att.email}`}
                          className="m-0 p-0 line-height-1 text-white-alpha-90 hover:text-yellow-300 flex align-items-center gap-1 font-semibold overflow-hidden text-overflow-ellipsis"
                          title={att.email}
                        >
                          <i className="mdi mdi-email text-yellow-400 text-xs flex-shrink-0" />
                          <span className="overflow-hidden text-overflow-ellipsis white-space-nowrap">{att.email}</span>
                        </a>
                      ) : (
                        isSelf ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditAttendee(att);
                            }}
                            className="m-0 p-0 line-height-1 text-white-alpha-50 hover:text-yellow-300 flex align-items-center gap-1 cursor-pointer italic"
                          >
                            <i className="mdi mdi-email-plus-outline text-xs flex-shrink-0" />
                            <span>E-Mail hinzufügen...</span>
                          </span>
                        ) : (
                          <span className="m-0 p-0 line-height-1 text-white-alpha-40 italic">Keine E-Mail</span>
                        )
                      )}
                    </div>
                    <div>
                      <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Zuletzt online</strong>
                      <span className={`m-0 p-0 line-height-1 ${online ? 'text-green-300 font-bold' : ''}`}>
                        {formatDate(att.lastSeen)}
                      </span>
                    </div>
                    <div>
                      <strong className="block text-3xs sm:text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Erstellte Punkte</strong>
                      <span className="m-0 p-0 line-height-1 font-bold text-yellow-300">
                        {count} Punkte
                      </span>
                    </div>
                  </div>
                {isSelf && (
                  <RotatingTotpBadge secretGuid={att.secretGuid} fallbackCode={att.securityCode} />
                )}
              </div>
            </div>
          </div>
        );
        })}
        
        {/* Person hinzufügen Card */}
        <div 
          onClick={() => setVisible(true)}
          className="flex flex-column align-items-center justify-content-center cursor-pointer transition-transform hover:scale-102 w-full md:w-auto"
          style={{ 
            maxWidth: '340px',
            minWidth: '240px',
            minHeight: '190px',
            height: 'auto',
            border: '3px solid #000',
            boxShadow: '4px 4px 0px #000',
            borderRadius: '12px',
            backgroundColor: '#b71c1c',
            padding: '1.5rem 1rem'
          }}
        >
          <i className="pi pi-plus text-3xl sm:text-4xl text-white mb-2" />
          <span className="font-bold text-white text-base sm:text-lg">Person hinzufügen</span>
        </div>
      </div>

      {/* Add Attendee Dialog */}
      <Dialog 
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-user-plus text-yellow-400 text-xl" />
            <span>Person hinzufügen</span>
          </div>
        } 
        visible={visible} 
        style={{ width: '92vw', maxWidth: '400px' }} 
        onHide={() => setVisible(false)}
        className="glass-panel"
        modal
        blockScroll
      >
        <div className="flex flex-column gap-3 pt-3">
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="pi pi-user"></i></span>
            <InputText 
              placeholder="Name der Person" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
              className="bg-gray-800 text-white border-gray-600"
            />
          </div>
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="mdi mdi-email text-yellow-400"></i></span>
            <InputText 
              type="email"
              placeholder="E-Mail-Adresse (optional)" 
              value={newEmail} 
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="bg-gray-800 text-white border-gray-600"
            />
          </div>
          <Button label="Hinzufügen" icon="pi pi-check" onClick={handleAdd} className="p-button-warning" disabled={!newName.trim()} />
        </div>
      </Dialog>

      {/* Edit / Delete Person Dialog */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-user-edit text-yellow-400 text-xl" />
            <span>Person bearbeiten</span>
          </div>
        }
        visible={editModalVisible}
        style={{ width: '92vw', maxWidth: '420px' }}
        onHide={() => setEditModalVisible(false)}
        className="glass-panel"
        modal
        blockScroll
      >
        <div className="flex flex-column gap-3 pt-3">
          <label className="text-sm font-bold text-gray-300">Name ändern:</label>
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="pi pi-user"></i></span>
            <InputText
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditAttendee()}
              autoFocus
              className="bg-gray-800 text-white border-gray-600"
            />
          </div>

          <label className="text-sm font-bold text-gray-300 mt-2">E-Mail-Adresse (nur für dich selbst bearbeitbar):</label>
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="mdi mdi-email text-yellow-400"></i></span>
            <InputText
              type="email"
              placeholder="name@beispiel.de"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditAttendee()}
              className="bg-gray-800 text-white border-gray-600"
            />
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              label="Löschen"
              icon="pi pi-trash"
              className="p-button-danger p-button-outlined flex-1 text-sm"
              onClick={handleDeleteAttendee}
            />
            <Button
              label="Speichern"
              icon="pi pi-check"
              className="p-button-warning flex-1 text-sm"
              disabled={!editName.trim()}
              onClick={handleSaveEditAttendee}
            />
          </div>
        </div>
      </Dialog>

      {/* Avatar Modal (Only for current user) */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-image text-yellow-400 text-xl" />
            <span>Profilbild ändern</span>
          </div>
        }
        visible={avatarModalVisible}
        style={{ width: '92vw', maxWidth: '450px' }}
        onHide={() => setAvatarModalVisible(false)}
        className="glass-panel"
        modal
        blockScroll
      >
        <div className="flex flex-column gap-3 pt-3">
          <label className="text-xs sm:text-sm font-bold text-gray-300">Profilbild von Gerät wählen oder Bild-URL eingeben:</label>
          
          <div className="flex gap-2 align-items-center flex-wrap">
            <input
              type="file"
              accept="image/*"
              id="attendee-avatar-upload"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <label
              htmlFor="attendee-avatar-upload"
              className="p-button p-button-outlined p-button-warning cursor-pointer flex align-items-center gap-2 text-xs sm:text-sm py-2 px-3 border-round"
            >
              <i className="pi pi-upload"></i>
              <span>Bild hochladen</span>
            </label>
          </div>

          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="pi pi-image"></i></span>
            <InputText
              placeholder="https://..."
              value={avatarUrlInput}
              onChange={(e) => setAvatarUrlInput(e.target.value)}
              className="bg-gray-800 text-white border-gray-600 text-xs sm:text-sm"
            />
          </div>

          {avatarUrlInput && (
            <div className="flex flex-column align-items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Vorschau:</span>
              <img src={avatarUrlInput} alt="Vorschau" style={{ width: '4.5rem', height: '4.5rem', objectFit: 'cover' }} className="border-circle border-2 border-yellow-500" />
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {avatarUrlInput && (
              <Button
                label="Entfernen"
                icon="pi pi-trash"
                className="p-button-danger p-button-outlined flex-1 text-xs sm:text-sm"
                onClick={() => setAvatarUrlInput('')}
              />
            )}
            <Button
              label="Speichern"
              icon="pi pi-check"
              className="p-button-warning flex-1 text-xs sm:text-sm"
              loading={uploadingAvatar}
              onClick={handleSaveAvatar}
            />
          </div>
        </div>
      </Dialog>

      {/* QR Code Person Transfer Modal */}
      {qrUser && (
        <Dialog
          header={
            <div className="flex align-items-center gap-2">
              <i className="pi pi-qrcode text-yellow-400 text-xl" />
              <span>Identität übertragen ({qrUser.name})</span>
            </div>
          }
          visible={qrModalVisible}
          style={{ width: '92vw', maxWidth: '380px' }}
          onHide={() => {
            setQrModalVisible(false);
            setQrUser(null);
          }}
          className="glass-panel text-center"
          modal
          blockScroll
        >
          <div className="flex flex-column align-items-center gap-3 pt-2 pb-2">
            <p className="text-sm text-gray-300 m-0">
              Scanne diesen QR-Code mit deinem Smartphone oder einem anderen Gerät, um dich dort sofort als <strong>{qrUser.name}</strong> anzumelden.
            </p>
            <div className="p-3 bg-white border-round-xl border-3 border-black shadow-4">
              <QRCodeSVG
                value={`${window.location.origin}/agenda/${agendaId || ''}?userTransfer=${encodeURIComponent(JSON.stringify({ id: qrUser.id || qrUser._id, name: qrUser.name, email: qrUser.email, avatarUrl: qrUser.avatarUrl }))}`}
                size={220}
                bgColor="#ffffff"
                fgColor="#1a1a1a"
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="text-xs text-yellow-400 font-bold">
              ⚡ FlashAgenda Person-Transfer
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
