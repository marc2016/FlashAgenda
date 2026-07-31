import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { useNavigate } from 'react-router-dom';

interface Props {
  visible: boolean;
  onHide: () => void;
}

export default function AdminLoginModal({ visible, onHide }: Props) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Anmeldung fehlgeschlagen');
      }

      localStorage.setItem('flashagenda_admin_token', data.token);
      setPassword('');
      onHide();
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Falsches Passwort');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-shield text-yellow-400 text-xl" />
          <span>Administrator Anmeldung</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '380px' }}
      modal
      dismissableMask
      className="p-fluid glass-panel"
    >
      <form onSubmit={handleLogin} className="flex flex-column gap-3 pt-2">
        <p className="m-0 text-gray-300 text-sm">
          Gib das Admin-Passwort ein, um Zugriff auf die Verwaltungsoberfläche zu erhalten:
        </p>

        <div className="flex flex-column gap-1">
          <label className="text-xs font-bold text-gray-400">Passwort</label>
          <Password
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            toggleMask
            feedback={false}
            placeholder="Admin-Passwort"
            className="w-full"
            inputClassName="w-full"
            autoFocus
          />
        </div>

        {error && (
          <div className="text-red-400 text-xs font-bold bg-red-950-alpha-50 p-2 border-round border-1 border-red-500 flex align-items-center gap-2">
            <i className="pi pi-exclamation-triangle" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-content-end gap-2 mt-2">
          <Button
            type="button"
            label="Abbrechen"
            icon="pi pi-times"
            className="p-button-text p-button-secondary text-sm"
            onClick={onHide}
          />
          <Button
            type="submit"
            label="Anmelden"
            icon="pi pi-check"
            loading={loading}
            className="p-button-warning comic-button font-bold text-sm"
          />
        </div>
      </form>
    </Dialog>
  );
}
