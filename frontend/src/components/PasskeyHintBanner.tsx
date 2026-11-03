import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { isPasskeySupported, listPasskeys, registerPasskey, describePasskeyError, ownProofCode } from '../services/passkeyService';

const DISMISS_KEY = 'flashagenda_passkey_hint_dismissed';

interface Props {
  currentUser: any;
}

/**
 * One-time nudge after signing in on a device: offer to set up a passkey.
 * Goes away for good once dismissed or once a passkey exists.
 */
export default function PasskeyHintBanner({ currentUser }: Props) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShow(false);
    if (!currentUser || !ownProofCode(currentUser) || !isPasskeySupported()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    } catch {
      return;
    }
    listPasskeys(currentUser)
      .then(list => { if (!cancelled && list.length === 0) setShow(true); })
      .catch(() => { /* no hint when the server cannot be asked */ });
    return () => { cancelled = true; };
  }, [currentUser]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
    setShow(false);
  };

  const handleRegister = async () => {
    setBusy(true);
    setError(null);
    try {
      await registerPasskey(currentUser);
      try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
      setDone(true);
      setTimeout(() => setShow(false), 2500);
    } catch (err) {
      setError(describePasskeyError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div
      data-testid="passkey-hint"
      className="fixed bottom-0 left-0 right-0 z-5 p-3 bg-comic-red border-top-3 border-black shadow-6 flex flex-column sm:flex-row align-items-center justify-content-between gap-3 animate-fadein"
    >
      <div className="flex align-items-center gap-3">
        <div className="w-3rem h-3rem bg-yellow-400 border-2 border-black border-round-xl flex align-items-center justify-content-center flex-shrink-0 shadow-2">
          <i className="pi pi-shield text-black text-2xl"></i>
        </div>
        <div>
          <h4 className="m-0 text-white font-bold text-base comic-font">
            {done ? 'Passkey eingerichtet!' : 'Nächstes Mal mit Passkey?'}
          </h4>
          <p className="m-0 text-xs text-yellow-300">
            {done
              ? 'Auf diesem Gerät meldest du dich ab jetzt per Fingerabdruck oder Gesicht an.'
              : error || 'Fingerabdruck oder Face ID statt Code eintippen. Dauert nur einen Moment.'}
          </p>
        </div>
      </div>

      {!done && (
        <div className="flex align-items-center gap-2 w-full sm:w-auto justify-content-end">
          <Button
            label="PASSKEY EINRICHTEN"
            icon="pi pi-shield"
            data-testid="passkey-hint-register"
            loading={busy}
            onClick={handleRegister}
            className="comic-button p-button-sm font-bold bg-yellow-400 text-black border-black border-2"
          />
          <Button
            label="Nicht mehr fragen"
            data-testid="passkey-hint-dismiss"
            onClick={dismiss}
            className="p-button-text p-button-plain p-button-sm text-white hover:bg-black-alpha-20"
          />
        </div>
      )}
    </div>
  );
}
