import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { v4 as uuidv4 } from 'uuid';

interface Attendee {
  id: string;
  name: string;
}

interface Props {
  agendaId: string;
  attendees: Attendee[];
  onIdentified: (user: Attendee) => void;
  onAddAttendee: (user: Attendee) => Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function UserIdentificationModal({ agendaId, attendees, onIdentified, onAddAttendee, isOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen !== undefined) {
      setVisible(isOpen);
      return;
    }
    const storedUser = localStorage.getItem(`flashagenda_${agendaId}_user`);
    if (storedUser) {
      onIdentified(JSON.parse(storedUser));
    } else {
      setVisible(true);
    }
  }, [agendaId, onIdentified, isOpen]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  const handleSelectExisting = (user: Attendee) => {
    localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(user));
    handleClose();
    onIdentified(user);
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const newUser = { id: uuidv4(), name: newName.trim() };
    await onAddAttendee(newUser);
    localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify(newUser));
    handleClose();
    onIdentified(newUser);
    setLoading(false);
  };

  return (
    <Dialog 
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-user text-yellow-400 text-xl" />
          <span>Wer bist du?</span>
        </div>
      } 
      visible={visible} 
      style={{ width: '90vw', maxWidth: '400px' }} 
      closable={!!onClose}
      modal
      blockScroll
      className="p-fluid glass-panel"
      onHide={handleClose}
    >
      <div className="flex flex-column gap-3 pt-3">
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
      </div>
    </Dialog>
  );
}
