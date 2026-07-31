import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Password } from 'primereact/password';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

export default function AdminPage() {
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const fetchAgendas = useCallback(async () => {
    const token = localStorage.getItem('flashagenda_admin_token');
    if (!token) {
      navigate('/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/agendas', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('flashagenda_admin_token');
        navigate('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Agenden');
      }

      const data = await response.json();
      setAgendas(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Agenden');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    document.title = 'Admin-Verwaltung | FlashAgenda';
    fetchAgendas();
  }, [fetchAgendas]);

  const handleLogout = () => {
    localStorage.removeItem('flashagenda_admin_token');
    navigate('/');
  };

  const handleToggleArchive = async (agenda: any) => {
    const token = localStorage.getItem('flashagenda_admin_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/agendas/${agenda._id}/archive`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Ändern des Archiv-Status');
      }

      const updated = await response.json();
      setAgendas(prev => prev.map(a => a._id === updated._id ? updated : a));
    } catch (err: any) {
      alert(err.message || 'Fehler beim Archivieren');
    }
  };

  const handleDeleteAgenda = (agenda: any) => {
    confirmDialog({
      message: `Bist du sicher, dass du die Agenda "${agenda.title}" dauerhaft löschen möchtest? Dies kann nicht rückgängig gemacht werden.`,
      header: 'Agenda löschen',
      icon: 'pi pi-exclamation-triangle text-red-500',
      acceptLabel: 'Ja, dauerhaft löschen',
      rejectLabel: 'Abbrechen',
      acceptClassName: 'p-button-danger comic-button font-bold',
      rejectClassName: 'p-button-text p-button-secondary',
      accept: async () => {
        const token = localStorage.getItem('flashagenda_admin_token');
        if (!token) return;

        try {
          const response = await fetch(`/api/admin/agendas/${agenda._id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Fehler beim Löschen der Agenda');
          }

          setAgendas(prev => prev.filter(a => a._id !== agenda._id));
        } catch (err: any) {
          alert(err.message || 'Fehler beim Löschen');
        }
      }
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const token = localStorage.getItem('flashagenda_admin_token');
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Ändern des Passworts');
      }

      localStorage.setItem('flashagenda_admin_token', data.token);
      setPasswordSuccess('Passwort wurde erfolgreich geändert!');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Fehler beim Ändern des Passworts');
    } finally {
      setPasswordLoading(false);
    }
  };

  const filteredAgendas = agendas.filter(a => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = a.title?.toLowerCase().includes(query);
    const creatorMatch = a.createdBy?.toLowerCase().includes(query) || a.attendees?.[0]?.name?.toLowerCase().includes(query);
    return titleMatch || creatorMatch;
  });

  return (
    <div className="min-h-screen bg-comic-red text-white p-4 md:p-6 flex flex-column">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-column md:flex-row align-items-center justify-content-between gap-3 mb-6 bg-black-alpha-40 p-4 border-round-xl border-2 border-yellow-400 shadow-4">
        <div className="flex align-items-center gap-3">
          <div className="w-3rem h-3rem bg-yellow-500 text-black border-circle flex align-items-center justify-content-center text-xl font-bold border-2 border-yellow-300">
            <i className="pi pi-shield text-2xl" />
          </div>
          <div>
            <h1 className="comic-font text-2xl md:text-3xl m-0 text-yellow-400">FlashAgenda Admin</h1>
            <p className="m-0 text-xs text-gray-300">Übersicht und Verwaltung aller gespeicherten Agenden</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            label="Passwort ändern"
            icon="pi pi-key"
            onClick={() => setShowPasswordModal(true)}
            className="p-button-warning comic-button p-button-sm font-bold"
          />
          <Button
            label="Hauptseite"
            icon="pi pi-home"
            onClick={() => navigate('/')}
            className="comic-button-secondary p-button-sm font-bold"
          />
          <Button
            label="Abmelden"
            icon="pi pi-sign-out"
            onClick={handleLogout}
            className="p-button-danger comic-button p-button-sm font-bold"
          />
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-grow-1 flex flex-column bg-black-alpha-40 p-4 border-round-xl border-2 border-yellow-400 shadow-4">
        {/* Search Bar & Refresh */}
        <div className="flex flex-column md:flex-row align-items-center justify-content-between gap-3 mb-4">
          <div className="p-inputgroup w-full md:w-25rem">
            <span className="p-inputgroup-addon bg-yellow-500 text-black border-yellow-500">
              <i className="pi pi-search" />
            </span>
            <InputText
              placeholder="Agenda suchen nach Titel oder Ersteller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-inputtext-sm"
            />
          </div>

          <div className="flex align-items-center gap-2">
            <span className="text-xs text-gray-300 font-bold">
              Gesamt: {filteredAgendas.length} Agenden
            </span>
            <Button
              icon="pi pi-refresh"
              onClick={fetchAgendas}
              loading={loading}
              className="p-button-text p-button-warning p-button-sm"
              title="Aktualisieren"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900-alpha-50 text-red-300 p-3 border-round border-1 border-red-500 mb-4 flex align-items-center gap-2 font-bold">
            <i className="pi pi-exclamation-triangle" />
            <span>{error}</span>
          </div>
        )}

        {/* Agendas Table / Cards */}
        {loading ? (
          <div className="text-center p-6 text-gray-300">
            <i className="pi pi-spin pi-spinner text-4xl text-yellow-400 mb-3" />
            <p className="font-bold">Lade Agenden...</p>
          </div>
        ) : filteredAgendas.length === 0 ? (
          <div className="text-center p-6 text-gray-400 bg-black-alpha-30 border-round">
            <i className="pi pi-folder-open text-4xl mb-3 text-yellow-400 opacity-60" />
            <p className="font-bold m-0">Keine Agenden gefunden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom-2 border-yellow-400 text-yellow-400 text-sm uppercase tracking-wider bg-black-alpha-30">
                  <th className="p-3">Titel</th>
                  <th className="p-3">Erstellt am</th>
                  <th className="p-3">Ersteller / Erster Teilnehmer</th>
                  <th className="p-3 text-center">Teilnehmer</th>
                  <th className="p-3 text-center">Punkte</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgendas.map((agenda) => {
                  const createdAtFormatted = agenda.createdAt 
                    ? new Date(agenda.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Unbekannt';
                  const creatorName = agenda.createdBy || agenda.attendees?.[0]?.name || 'Unbekannt';
                  const attendeesCount = agenda.attendees?.length || 0;
                  const itemsCount = agenda.items?.length || 0;

                  return (
                    <tr 
                      key={agenda._id} 
                      className="border-bottom-1 border-gray-700 hover:bg-black-alpha-30 transition-colors"
                    >
                      <td className="p-3">
                        <Link 
                          to={`/agenda/${agenda._id}`} 
                          className="font-bold text-white hover:text-yellow-400 no-underline text-base flex align-items-center gap-2"
                        >
                          <i className="pi pi-external-link text-xs text-yellow-400 opacity-70" />
                          <span>{agenda.title || 'Unbenannte Agenda'}</span>
                        </Link>
                        <div className="text-xs text-gray-400 font-mono mt-1 opacity-70">
                          ID: {agenda._id}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-300 white-space-nowrap">
                        {createdAtFormatted}
                      </td>
                      <td className="p-3 text-sm text-gray-200">
                        <i className="pi pi-user text-xs text-yellow-400 mr-2" />
                        {creatorName}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-yellow-500 text-black font-bold text-xs px-2 py-1 border-round">
                          {attendeesCount}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-blue-600 text-white font-bold text-xs px-2 py-1 border-round">
                          {itemsCount}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {agenda.isArchived ? (
                          <Tag value="Archiviert" severity="warning" icon="pi pi-lock" />
                        ) : (
                          <Tag value="Aktiv" severity="success" icon="pi pi-check-circle" />
                        )}
                      </td>
                      <td className="p-3 text-right white-space-nowrap">
                        <div className="flex justify-content-end gap-2">
                          <Button
                            label={agenda.isArchived ? 'Aktivieren' : 'Archivieren'}
                            icon={agenda.isArchived ? 'pi pi-unlock' : 'pi pi-lock'}
                            onClick={() => handleToggleArchive(agenda)}
                            className={agenda.isArchived ? 'p-button-success p-button-sm text-xs font-bold' : 'p-button-warning p-button-sm text-xs font-bold'}
                            title={agenda.isArchived ? 'Agenda wieder schreibbar machen' : 'Agenda sperren & schreibgeschützt machen'}
                          />
                          <Button
                            label="Löschen"
                            icon="pi pi-trash"
                            onClick={() => handleDeleteAgenda(agenda)}
                            className="p-button-danger p-button-sm text-xs font-bold"
                            title="Agenda dauerhaft löschen"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Password Dialog */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-key text-yellow-400 text-xl" />
            <span>Admin-Passwort ändern</span>
          </div>
        }
        visible={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
        style={{ width: '90vw', maxWidth: '400px' }}
        modal
        className="p-fluid glass-panel"
      >
        <form onSubmit={handleChangePassword} className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-gray-400">Aktuelles Admin-Passwort</label>
            <Password
              value={oldPassword}
              onChange={(e) => { setOldPassword(e.target.value); setPasswordError(''); }}
              toggleMask
              feedback={false}
              placeholder="Aktuelles Passwort"
              className="w-full"
              inputClassName="w-full"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label className="text-xs font-bold text-gray-400">Neues Admin-Passwort</label>
            <Password
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
              toggleMask
              feedback={false}
              placeholder="Neues Passwort (min. 4 Zeichen)"
              className="w-full"
              inputClassName="w-full"
            />
          </div>

          {passwordError && (
            <div className="text-red-400 text-xs font-bold bg-red-950-alpha-50 p-2 border-round border-1 border-red-500 flex align-items-center gap-2">
              <i className="pi pi-exclamation-triangle" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="text-green-400 text-xs font-bold bg-green-950-alpha-50 p-2 border-round border-1 border-green-500 flex align-items-center gap-2">
              <i className="pi pi-check-circle" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="flex justify-content-end gap-2 mt-2">
            <Button
              type="button"
              label="Abbrechen"
              icon="pi pi-times"
              className="p-button-text p-button-secondary text-sm"
              onClick={() => setShowPasswordModal(false)}
            />
            <Button
              type="submit"
              label="Speichern"
              icon="pi pi-check"
              loading={passwordLoading}
              className="p-button-warning comic-button font-bold text-sm"
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
