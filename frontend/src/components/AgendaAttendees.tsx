import { useState } from 'react';

import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface Attendee {
  _id?: string;
  id?: string;
  name: string;
  avatarUrl?: string;
  joinedAt?: string;
  lastSeen?: string;
}

interface Props {
  attendees: Attendee[];
  items?: any[];
  currentUser?: any;
  onAdd: (attendee: Attendee) => Promise<void>;
  onUpdateAgenda?: (updates: any) => Promise<void>;
}

export default function AgendaAttendees({ attendees, items = [], currentUser, onAdd, onUpdateAgenda }: Props) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAdd = async () => {
    if (newName.trim()) {
      await onAdd({ id: uuidv4(), name: newName.trim() });
      setNewName('');
      setVisible(false);
    }
  };

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

  const getItemsCount = (attendeeId: string, attendeeName: string) => {
    return items.filter(item => 
      item.createdBy === attendeeId || 
      item.createdBy === attendeeName || 
      item.author === attendeeName
    ).length;
  };

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

  const colors = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // blue
    'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', // red
    'linear-gradient(135deg, #10b981 0%, #047857 100%)', // green
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // orange
    'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)', // purple
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // pink
    'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)', // cyan
  ];

  return (
    <div className="mb-6">
      <h3 className="text-2xl mb-3 text-yellow-500 font-medium font-luckiest">Personen</h3>
      
      <div className="flex flex-wrap gap-4">
        {attendees.map((att, index) => {
          const attendeeId = att._id || att.id || '';
          const cardColor = colors[index % colors.length];
          const isSelf = currentUser && (
            (att.id && currentUser.id === att.id) ||
            (att._id && currentUser._id === att._id) ||
            (att._id && currentUser.id === att._id) ||
            currentUser.name === att.name
          );
          const online = isUserOnline(att.lastSeen);
          
          return (
            <div 
              key={attendeeId} 
              className="relative overflow-hidden" 
              style={{ 
                width: '100%',
                maxWidth: '340px', 
                height: '215px', 
                background: cardColor, 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                border: '3px solid #000',
                boxShadow: '6px 6px 0px #000',
                borderRadius: '12px'
              }}
            >
              {isSelf && (
                <div className="corner-banderole">
                  Das bist du
                </div>
              )}
              <div className="flex h-full text-white p-4 align-items-center">
                
                {/* Left: Profile Icon or Custom Avatar */}
                <div className="relative flex align-items-center justify-content-center border-right-1 border-white-alpha-30 pr-4 mr-4 flex-shrink-0">
                  {att.avatarUrl ? (
                    <img 
                      src={att.avatarUrl} 
                      alt={att.name} 
                      style={{ width: '6rem', height: '6rem', objectFit: 'cover' }} 
                      className="border-circle border-2 border-white-alpha-40" 
                    />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '6rem', height: '6rem' }} className="text-white-alpha-90">
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
                      style={{ width: '2rem', height: '2rem', margin: '0 0.5rem -0.25rem 0' }}
                      title="Profilbild ändern"
                    >
                      <i className="pi pi-camera text-xs font-bold" />
                    </button>
                  )}
                </div>

                {/* Right: Details */}
                <div className="flex flex-column flex-1 justify-content-center m-0 p-0">
                  <div className="font-bold text-2xl mb-2 overflow-hidden text-overflow-ellipsis white-space-nowrap text-white">
                    {att.name}
                  </div>
                  
                  <div className="flex flex-column gap-1 text-sm text-white-alpha-90">
                    <div>
                      <strong className="block text-xs text-white-alpha-60 uppercase tracking-wide m-0">Registriert</strong>
                      <span className="m-0 p-0 line-height-1">{formatDate(att.joinedAt)}</span>
                    </div>
                    <div>
                      <strong className="block text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Zuletzt online</strong>
                      <span className={`m-0 p-0 line-height-1 ${online ? 'text-green-300 font-bold' : ''}`}>
                        {formatDate(att.lastSeen)}
                      </span>
                    </div>
                    <div>
                      <strong className="block text-xs text-white-alpha-60 uppercase tracking-wide mt-1 mb-0">Erstellte Punkte</strong>
                      <span className="m-0 p-0 line-height-1 font-bold text-yellow-300">
                        {getItemsCount(attendeeId, att.name)} Punkte
                      </span>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          );
        })}
        
        {/* Person hinzufügen Card */}
        <div 
          onClick={() => setVisible(true)}
          className="flex flex-column align-items-center justify-content-center cursor-pointer transition-transform hover:scale-102"
          style={{ 
            width: '100%',
            maxWidth: '340px', 
            height: '215px', 
            border: '3px dashed #000',
            boxShadow: '6px 6px 0px #000',
            borderRadius: '12px',
            backgroundColor: '#b71c1c'
          }}
        >
          <i className="pi pi-plus text-4xl text-white mb-2" />
          <span className="font-bold text-white text-lg">Person hinzufügen</span>
        </div>
      </div>

      {/* Add Attendee Dialog */}
      <Dialog 
        header="Person hinzufügen" 
        visible={visible} 
        style={{ width: '90vw', maxWidth: '400px' }} 
        onHide={() => setVisible(false)}
        className="glass-panel"
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
          <Button label="Hinzufügen" icon="pi pi-check" onClick={handleAdd} className="p-button-warning" disabled={!newName.trim()} />
        </div>
      </Dialog>

      {/* Avatar Modal (Only for current user) */}
      <Dialog
        header="Profilbild ändern"
        visible={avatarModalVisible}
        style={{ width: '90vw', maxWidth: '450px' }}
        onHide={() => setAvatarModalVisible(false)}
        className="glass-panel"
      >
        <div className="flex flex-column gap-3 pt-3">
          <label className="text-sm font-bold text-gray-300">Profilbild von Gerät wählen oder Bild-URL eingeben:</label>
          
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
              className="p-button p-button-outlined p-button-warning cursor-pointer flex align-items-center gap-2 text-sm py-2 px-3 border-round"
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
              className="bg-gray-800 text-white border-gray-600"
            />
          </div>

          {avatarUrlInput && (
            <div className="flex flex-column align-items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Vorschau:</span>
              <img src={avatarUrlInput} alt="Vorschau" style={{ width: '5.5rem', height: '5.5rem', objectFit: 'cover' }} className="border-circle border-2 border-yellow-500" />
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {avatarUrlInput && (
              <Button
                label="Entfernen"
                icon="pi pi-trash"
                className="p-button-danger p-button-outlined flex-1"
                onClick={() => setAvatarUrlInput('')}
              />
            )}
            <Button
              label="Speichern"
              icon="pi pi-check"
              className="p-button-warning flex-1"
              loading={uploadingAvatar}
              onClick={handleSaveAvatar}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
