import { useState, useEffect, useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { v4 as uuidv4 } from 'uuid';
import { verifyTotpCode } from '../services/totpService';

interface Attendee {
  _id?: string;
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  securityCode?: string;
  secretGuid?: string;
  isRegistered?: boolean;
}

interface Props {
  agendaId: string;
  attendees: Attendee[];
  currentUser?: any;
  onIdentified: (user: Attendee) => void;
  onAddAttendee: (user: Attendee) => Promise<void>;
  onUpdateAttendee?: (user: Attendee) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const generateSecurityCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function UserIdentificationModal({ agendaId, attendees, currentUser, onIdentified, onAddAttendee, onUpdateAttendee, isOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  // Security Code verification state
  const [verifyingAttendee, setVerifyingAttendee] = useState<Attendee | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  const rememberedUser = useMemo(() => {
    const lastUserStr = localStorage.getItem('flashagenda_last_user');
    if (!lastUserStr) return null;
    try {
      return JSON.parse(lastUserStr);
    } catch {
      return null;
    }
  }, [visible]);

  useEffect(() => {
    // Priority 1 ALWAYS: Check URL for userTransfer parameter (scanned QR code)
    const searchParams = new URLSearchParams(window.location.search);
    const transferParam = searchParams.get('userTransfer');
    if (transferParam) {
      try {
        const transferredUser = JSON.parse(decodeURIComponent(transferParam));
        if (transferredUser && (transferredUser.name || transferredUser.id)) {
          const claimedUser = { ...transferredUser, isRegistered: true };
          if (agendaId) {
            localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(claimedUser));
          }
          localStorage.setItem('flashagenda_last_user', JSON.stringify(claimedUser));

          // Clean URL parameter without page reload
          const url = new URL(window.location.href);
          url.searchParams.delete('userTransfer');
          window.history.replaceState({}, '', url.toString());

          onIdentified(claimedUser);
          setVisible(false);
          return;
        }
      } catch (err) {
        console.error('Failed to parse userTransfer parameter:', err);
      }
    }

    // Priority 2: If currentUser is already identified, skip re-evaluating
    if (currentUser) {
      setVisible(false);
      return;
    }

    if (isOpen !== undefined) {
      setVisible(isOpen);
      return;
    }
    const storedUser = localStorage.getItem(`flashagenda_${agendaId}_user`);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const match = attendees.find(
          a => (a.id && a.id === parsed.id) ||
               (a._id && a._id === parsed._id) ||
               (a._id && parsed.id && a._id === parsed.id) ||
               (a.name && parsed.name && a.name.trim().toLowerCase() === parsed.name.trim().toLowerCase())
        );
        onIdentified(match || parsed);
        setVisible(false);
        return;
      } catch (err) {
        console.error('Failed to parse stored user', err);
      }
    } else {
      setVisible(true);
    }
  }, [agendaId, attendees, onIdentified, isOpen]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
    window.location.href = '/';
  };

  const handleUseRememberedUser = async (user: Attendee) => {
    setLoading(true);
    const code = user.securityCode || generateSecurityCode();
    const claimedUser = { ...user, isRegistered: true, securityCode: code };
    localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(claimedUser));
    localStorage.setItem('flashagenda_last_user', JSON.stringify(claimedUser));
    
    const existing = attendees.find(
      a => (a.id && a.id === claimedUser.id) ||
           (a._id && a._id === claimedUser._id) ||
           (a._id && claimedUser.id && a._id === claimedUser.id) ||
           (a.name && claimedUser.name && a.name.trim().toLowerCase() === claimedUser.name.trim().toLowerCase())
    );

    if (!existing) {
      await onAddAttendee(claimedUser);
    } else if (onUpdateAttendee) {
      onUpdateAttendee(claimedUser);
    }

    setVisible(false);
    if (onClose) onClose();
    onIdentified(claimedUser);
    setLoading(false);
  };

  const handleSelectExisting = (user: Attendee) => {
    // Require security code ONLY IF attendee has ALREADY registered/claimed on a device
    if (user.isRegistered && user.securityCode) {
      setVerifyingAttendee(user);
      setEnteredCode('');
      setCodeError(false);
      return;
    }

    // First time claiming this person on a device! Mark as registered and generate code if missing
    const code = user.securityCode || generateSecurityCode();
    const updatedUser = { ...user, isRegistered: true, securityCode: code };
    localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(updatedUser));
    localStorage.setItem('flashagenda_last_user', JSON.stringify(updatedUser));
    
    if (onUpdateAttendee) {
      onUpdateAttendee(updatedUser);
    }

    setVisible(false);
    if (onClose) onClose();
    onIdentified(updatedUser);
  };

  const handleVerifyCode = () => {
    if (!verifyingAttendee) return;

    const isTotpValid = verifyingAttendee.secretGuid && verifyTotpCode(enteredCode, verifyingAttendee.secretGuid, 60);
    const isStaticValid = verifyingAttendee.securityCode && enteredCode.trim() === verifyingAttendee.securityCode.trim();

    if (isTotpValid || isStaticValid) {
      const confirmedUser = { ...verifyingAttendee, isRegistered: true };
      localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(confirmedUser));
      localStorage.setItem('flashagenda_last_user', JSON.stringify(confirmedUser));
      setVerifyingAttendee(null);
      setEnteredCode('');
      setCodeError(false);
      setVisible(false);
      if (onClose) onClose();
      onIdentified(confirmedUser);
    } else {
      setCodeError(true);
    }
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const code = generateSecurityCode();
    const guid = uuidv4();
    const newUser = { id: uuidv4(), name: newName.trim(), securityCode: code, secretGuid: guid, isRegistered: true };
    await onAddAttendee(newUser);
    localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(newUser));
    localStorage.setItem('flashagenda_last_user', JSON.stringify(newUser));
    setVisible(false);
    if (onClose) onClose();
    onIdentified(newUser);
    setLoading(false);
  };

  return (
    <>
      <Dialog 
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-user text-yellow-400 text-xl" />
            <span>Wer bist du?</span>
          </div>
        } 
        visible={visible || !currentUser} 
        style={{ width: '90vw', maxWidth: '400px' }} 
        closable={false}
        dismissableMask={false}
        maskClassName="backdrop-blur-md bg-black-alpha-80"
        maskStyle={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        modal
        blockScroll
        className="p-fluid glass-panel"
        onHide={() => {}}
      >
      <div className="flex flex-column gap-3 pt-3">

        {/* Prominent Highlighted Box for Global Remembered Identity */}
        {rememberedUser && rememberedUser.name && (
          <div className="bg-yellow-500-alpha-20 border-2 border-yellow-400 border-round p-3 flex flex-column gap-2 text-center shadow-3 relative overflow-hidden mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex align-items-center justify-content-center gap-1">
              <i className="pi pi-star-fill text-xs" />
              <span>Bestehende Identität</span>
            </div>
            <div className="flex align-items-center justify-content-center gap-3 my-1">
              {rememberedUser.avatarUrl ? (
                <img
                  src={rememberedUser.avatarUrl}
                  alt={rememberedUser.name}
                  style={{ width: '3rem', height: '3rem', objectFit: 'cover' }}
                  className="border-circle border-2 border-yellow-400"
                />
              ) : (
                <div 
                  className="border-circle border-2 border-yellow-400 bg-yellow-500 text-black font-bold flex align-items-center justify-content-center text-xl"
                  style={{ width: '3rem', height: '3rem' }}
                >
                  {rememberedUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left overflow-hidden">
                <div className="font-bold text-white text-lg overflow-hidden text-overflow-ellipsis white-space-nowrap">
                  {rememberedUser.name}
                </div>
                {rememberedUser.email && (
                  <div className="text-xs text-yellow-300 overflow-hidden text-overflow-ellipsis white-space-nowrap">
                    {rememberedUser.email}
                  </div>
                )}
              </div>
            </div>
            <Button
              label={`Als "${rememberedUser.name}" beitreten`}
              icon="pi pi-bolt"
              className="p-button-warning comic-button font-bold text-base mt-1"
              loading={loading}
              onClick={() => handleUseRememberedUser(rememberedUser)}
            />
          </div>
        )}

        {attendees.length > 0 && (
          <>
            <p className="m-0 text-gray-300">Wähle deinen Namen aus der Liste:</p>
            <div className="flex flex-wrap gap-2">
              {attendees.map(att => (
                <Button 
                  key={att.id} 
                  label={att.name} 
                  onClick={() => handleSelectExisting(att)} 
                  className="p-button-outlined p-button-warning w-full text-left"
                  icon="pi pi-user"
                />
              ))}
            </div>
            <div className="flex align-items-center my-3">
              <div className="flex-grow-1 border-top-1 border-gray-600"></div>
              <span className="mx-3 text-gray-400">oder</span>
              <div className="flex-grow-1 border-top-1 border-gray-600"></div>
            </div>
          </>
        )}
        
        <p className="m-0 text-gray-300">Trage dich neu ein:</p>
        <div className="p-inputgroup">
          <InputText 
            placeholder="Dein Name" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
            className="bg-gray-800 text-white border-gray-600"
          />
          <Button 
            icon="pi pi-check" 
            className="p-button-warning" 
            onClick={handleCreateNew}
            disabled={!newName.trim()}
            loading={loading}
          />
        </div>

        <div className="pt-2 border-top-1 border-gray-700 mt-2">
          <Button 
            label="Abbrechen" 
            icon="pi pi-times" 
            className="p-button-outlined p-button-secondary w-full" 
            onClick={handleClose} 
          />
        </div>
      </div>
    </Dialog>

    {/* Security Code Verification Dialog */}
    {verifyingAttendee && (
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-key text-yellow-400 text-xl" />
            <span>Sicherheitscode bestätigen</span>
          </div>
        }
        visible={!!verifyingAttendee}
        style={{ width: '90vw', maxWidth: '380px' }}
        onHide={() => {
          setVerifyingAttendee(null);
          setEnteredCode('');
          setCodeError(false);
        }}
        className="glass-panel text-center"
        maskClassName="backdrop-blur-md bg-black-alpha-80"
        maskStyle={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        dismissableMask={false}
        modal
        blockScroll
      >
        <div className="flex flex-column gap-3 pt-2">
          <p className="m-0 text-sm text-gray-300">
            Gib den 4-stelligen Sicherheitscode für <strong>{verifyingAttendee.name}</strong> ein. Du findest diesen auf dem Erstgerät unten links auf deiner Personenkarte:
          </p>
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon bg-gray-700 border-gray-600">
              <i className="pi pi-lock text-yellow-400" />
            </span>
            <InputText
              type="password"
              placeholder="4-stelliger Code"
              value={enteredCode}
              onChange={(e) => {
                setEnteredCode(e.target.value);
                setCodeError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              maxLength={6}
              autoFocus
              className="bg-gray-800 text-white border-gray-600 text-center font-mono text-xl"
            />
          </div>
          {codeError && (
            <p className="m-0 text-xs text-red-400 font-bold flex align-items-center justify-content-center gap-1">
              <i className="pi pi-exclamation-circle" />
              <span>Falscher Sicherheitscode! Bitte prüfe den Code auf dem Erstgerät.</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              label="Abbrechen"
              className="p-button-outlined p-button-secondary flex-1"
              onClick={() => {
                setVerifyingAttendee(null);
                setEnteredCode('');
                setCodeError(false);
              }}
            />
            <Button
              label="Bestätigen"
              icon="pi pi-check"
              className="p-button-warning flex-1"
              disabled={!enteredCode.trim()}
              onClick={handleVerifyCode}
            />
          </div>
        </div>
      </Dialog>
    )}
    </>
  );
}
