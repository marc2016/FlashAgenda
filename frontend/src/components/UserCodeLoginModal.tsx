import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

interface Props {
  visible: boolean;
  onHide: () => void;
  onLoginSuccess: (user: any) => void;
}

export default function UserCodeLoginModal({ visible, onHide, onLoginSuccess }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = () => {
    setCode('');
    setErrorMsg('');
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onHide();
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setErrorMsg('Bitte gib deinen 4-stelligen Code ein.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/agendas/login-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ungültiger Code oder kein Benutzer gefunden.');
      }

      const data = await res.json();
      if (data.user) {
        localStorage.setItem('flashagenda_last_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        handleClose();
      } else {
        throw new Error('Keine Benutzerdaten empfangen.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={handleClose}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-key text-yellow-400 text-xl" />
          <span>Mit Einmal-Code anmelden</span>
        </div>
      }
      style={{ width: '90vw', maxWidth: '380px' }}
      modal
      className="comic-dialog"
    >
      <form onSubmit={handleLogin} className="flex flex-column gap-3 pt-2">
        <p className="text-sm text-gray-300 m-0 text-center">
          Gib deinen Sicherheitscode ein.
        </p>

        {errorMsg && (
          <div className="bg-red-900 border-1 border-red-500 text-white text-xs p-2 border-round flex align-items-center gap-2">
            <i className="pi pi-exclamation-triangle text-red-300" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-column gap-1">
          <label htmlFor="login-code-input" className="text-xs font-bold uppercase tracking-wider text-yellow-400 text-center">
            Sicherheitscode *
          </label>
          <InputText
            id="login-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="z. B. 1234"
            maxLength={8}
            autoFocus
            className="p-inputtext-lg font-mono text-center text-2xl font-bold tracking-widest bg-black-alpha-40 text-white border-yellow-400"
          />
        </div>

        <div className="mt-3">
          <Button
            type="submit"
            id="submit-code-login-btn"
            label="ANMELDEN"
            icon="pi pi-check font-bold"
            loading={loading}
            disabled={!code.trim()}
            className="w-full p-button-warning p-button-sm font-bold comic-button"
          />
        </div>
      </form>
    </Dialog>
  );
}
