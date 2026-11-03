import { useState, useEffect, useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { v4 as uuidv4 } from 'uuid';
import { isPasskeySupported, loginWithPasskey, describePasskeyError } from '../services/passkeyService';

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
  onAddAttendee: (user: Attendee) => Promise<any>;
  /** @deprecated identity changes go through the server (verify/claim) */
  onUpdateAttendee?: (user: Attendee) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

type IdentityResult = { ok: true; user: Attendee } | { ok: false; status: number };

// Server-side identity endpoints: the only way this device receives a person's secrets.
async function postIdentity(agendaId: string, attendeeId: string, action: 'verify' | 'claim', body: object): Promise<IdentityResult> {
  try {
    const res = await fetch(`/api/agendas/${agendaId}/attendees/${encodeURIComponent(attendeeId)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    return data?.user ? { ok: true, user: data.user } : { ok: false, status: 500 };
  } catch {
    return { ok: false, status: 0 };
  }
}

const attendeeKey = (a: Attendee) => (a.id || a._id || '') as string;

const CODE_ERRORS: Record<string, string> = {
  wrong: 'Falscher Sicherheitscode! Bitte prüfe den Code auf dem Erstgerät.',
  locked: 'Zu viele Versuche. Bitte versuche es in 15 Minuten erneut.',
  failed: 'Das hat nicht geklappt. Bitte prüfe deine Verbindung und versuche es erneut.'
};

export default function UserIdentificationModal({ agendaId, attendees, currentUser, onIdentified, onAddAttendee, isOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  // Security Code verification state
  const [verifyingAttendee, setVerifyingAttendee] = useState<Attendee | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  // Passkey login (only offered when the browser supports WebAuthn)
  const passkeysAvailable = useMemo(() => isPasskeySupported(), []);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

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

    // Priority 1.5: If isOpen is explicitly controlled from outside, honor it
    if (isOpen !== undefined) {
      setVisible(isOpen);
      if (isOpen) return;
    }

    // Priority 2: If currentUser is already identified, skip re-evaluating
    if (currentUser) {
      setVisible(false);
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
        const identified = match
          ? { ...match, securityCode: parsed.securityCode, secretGuid: parsed.secretGuid, isRegistered: true }
          : parsed;
        const currentId = currentUser?.id || currentUser?._id;
        const newId = identified?.id || identified?._id;
        if (!currentUser || (newId && newId !== currentId) || (!newId && currentUser.name !== identified.name)) {
          onIdentified(identified);
        }
        setVisible(false);
        return;
      } catch (err) {
        console.error('Failed to parse stored user', err);
      }
    } else {
      setVisible(true);
    }
  }, [agendaId, attendees, onIdentified, isOpen, currentUser]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
    if (!currentUser) {
      window.location.href = '/';
    }
  };

  const finishIdentification = (user: Attendee) => {
    localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(user));
    localStorage.setItem('flashagenda_last_user', JSON.stringify(user));
    setVerifyingAttendee(null);
    setEnteredCode('');
    setCodeError(null);
    setShowCode(false);
    setVisible(false);
    if (onClose) onClose();
    onIdentified(user);
  };

  const openCodeDialog = (user: Attendee, error: string | null = null) => {
    setVerifyingAttendee(user);
    setEnteredCode('');
    setCodeError(error);
    setShowCode(false);
  };

  const findInAgenda = (user: Attendee) => attendees.find(
    a => (a.id && a.id === user.id) ||
         (a._id && a._id === user._id) ||
         (a._id && user.id && a._id === user.id) ||
         (a.name && user.name && a.name.trim().toLowerCase() === user.name.trim().toLowerCase())
  );

  // Claims an unregistered person; the device may bring its own secrets (same code across agendas).
  const claimAttendee = async (att: Attendee, own?: Attendee) => {
    const result = await postIdentity(agendaId, attendeeKey(att), 'claim', {
      securityCode: own?.securityCode,
      secretGuid: own?.secretGuid
    });
    if (result.ok) {
      finishIdentification({ ...(own || {}), ...result.user });
      return true;
    }
    if (result.status === 409) {
      openCodeDialog(att);
      return false;
    }
    openCodeDialog(att, 'failed');
    return false;
  };

  const handleUseRememberedUser = async (user: Attendee) => {
    setLoading(true);
    try {
      const existing = findInAgenda(user);
      if (!existing) {
        // Joining a new agenda as oneself: the device brings its own secrets
        const added: any = await onAddAttendee({ ...user, isRegistered: true });
        const serverId = added?.id || added?._id || user.id;
        if (user.securityCode && user.secretGuid) {
          finishIdentification({ ...user, id: serverId, isRegistered: true });
        } else {
          // Old device without secrets: let the server prove and hand them out
          const result = await postIdentity(agendaId, serverId, 'verify', { code: user.securityCode || '' });
          if (result.ok) finishIdentification({ ...user, ...result.user });
          else finishIdentification({ ...user, id: serverId, isRegistered: true });
        }
        return;
      }
      if (!existing.isRegistered) {
        await claimAttendee(existing, user);
        return;
      }
      // Registered person in this agenda: prove it with the device's own code
      const code = user.securityCode || '';
      const result = code
        ? await postIdentity(agendaId, attendeeKey(existing), 'verify', { code })
        : { ok: false as const, status: 401 };
      if (result.ok) {
        finishIdentification({ ...user, ...result.user });
      } else {
        openCodeDialog(existing, result.status === 429 ? 'locked' : null);
      }
    } finally {
      setLoading(false);
    }
  };

  // A passkey proves who this device is; afterwards it joins exactly like a remembered identity.
  const handlePasskeyLogin = async () => {
    setPasskeyError(null);
    setPasskeyBusy(true);
    try {
      const user = await loginWithPasskey();
      await handleUseRememberedUser(user);
    } catch (err) {
      setPasskeyError(describePasskeyError(err));
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleSelectExisting = async (user: Attendee) => {
    // A code is required only once the person has been registered on a device
    if (user.isRegistered) {
      openCodeDialog(user);
      return;
    }
    await claimAttendee(user);
  };

  const handleVerifyCode = async () => {
    if (!verifyingAttendee) return;
    const clean = enteredCode.trim();
    if (!clean) return;

    const result = await postIdentity(agendaId, attendeeKey(verifyingAttendee), 'verify', { code: clean });
    if (result.ok) {
      finishIdentification({ ...verifyingAttendee, ...result.user, isRegistered: true });
      return;
    }
    setCodeError(result.status === 429 ? 'locked' : result.status === 401 ? 'wrong' : 'failed');
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const trimmed = newName.trim();
      const existing = attendees.find(
        a => a.name && a.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        await handleSelectExisting(existing);
        return;
      }
      // Add unregistered, then claim: the server creates this person's secrets
      const newUser: Attendee = { id: uuidv4(), name: trimmed };
      const added: any = await onAddAttendee(newUser);
      await claimAttendee({ ...newUser, ...(added || {}), id: added?.id || newUser.id });
    } finally {
      setLoading(false);
    }
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

        {passkeysAvailable && (
          <div className="flex flex-column gap-2">
            <Button
              label="Mit Passkey anmelden"
              icon="pi pi-shield"
              data-testid="passkey-login"
              className="comic-button font-bold bg-yellow-400 text-black border-black border-2 w-full"
              loading={passkeyBusy}
              onClick={handlePasskeyLogin}
            />
            {passkeyError && (
              <p className="m-0 text-xs text-red-300 font-bold flex align-items-center justify-content-center gap-1" data-testid="passkey-error">
                <i className="pi pi-exclamation-circle" />
                <span>{passkeyError}</span>
              </p>
            )}
          </div>
        )}

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
          setCodeError(null);
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
              type={showCode ? 'text' : 'password'}
              placeholder="4-stelliger Code"
              value={enteredCode}
              onChange={(e) => {
                setEnteredCode(e.target.value);
                setCodeError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              maxLength={6}
              autoFocus
              className="bg-gray-800 text-white border-gray-600 text-center font-mono text-xl"
            />
            <button
              type="button"
              className="p-inputgroup-addon bg-gray-700 border-gray-600 text-gray-300 hover:text-white cursor-pointer"
              onClick={() => setShowCode(!showCode)}
              title={showCode ? 'Code verbergen' : 'Code anzeigen'}
            >
              <i className={`pi ${showCode ? 'pi-eye-slash' : 'pi-eye'}`} />
            </button>
          </div>
          {codeError && (
            <p className="m-0 text-xs text-red-400 font-bold flex align-items-center justify-content-center gap-1">
              <i className="pi pi-exclamation-circle" />
              <span data-testid="code-error">{CODE_ERRORS[codeError]}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              label="Abbrechen"
              className="p-button-outlined p-button-secondary flex-1"
              onClick={() => {
                setVerifyingAttendee(null);
                setEnteredCode('');
                setCodeError(null);
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
