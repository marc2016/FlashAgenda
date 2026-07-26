import { useState } from 'react';

import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { v4 as uuidv4 } from 'uuid';

interface Attendee {
  id: string;
  name: string;
}

interface Props {
  attendees: Attendee[];
  onAdd: (attendee: Attendee) => Promise<void>;
}

export default function AgendaAttendees({ attendees, onAdd }: Props) {
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (newName.trim()) {
      await onAdd({ id: uuidv4(), name: newName.trim() });
      setNewName('');
      setVisible(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-2xl mb-3 text-yellow-500 font-medium">Personen</h3>
      
      <div className="flex flex-wrap gap-3">
        {attendees.map(att => (
          <div key={att.id} className="bg-gray-800 border-1 border-gray-700 border-round-xl p-3 flex align-items-center gap-3 shadow-2" style={{ minWidth: '150px' }}>
            <div className="w-2rem h-2rem border-circle bg-yellow-500 text-gray-900 flex align-items-center justify-content-center font-bold">
              {att.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-lg">{att.name}</span>
          </div>
        ))}
        
        {/* Plus Card */}
        <div 
          className="bg-gray-800 border-1 border-gray-700 border-round-xl p-3 flex align-items-center justify-content-center cursor-pointer hover:border-yellow-500 transition-colors" 
          style={{ width: '150px', borderStyle: 'dashed' }}
          onClick={() => setVisible(true)}
        >
          <i className="pi pi-plus text-xl text-gray-400"></i>
        </div>
      </div>

      <Dialog 
        header="Person hinzufügen" 
        visible={visible} 
        style={{ width: '90vw', maxWidth: '400px' }} 
        onHide={() => setVisible(false)}
        className="glass-panel"
      >
        <div className="flex flex-column gap-3 pt-3">
          <InputText 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            placeholder="Name eingeben" 
            autoFocus 
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="bg-gray-800 text-white"
          />
          <Button label="Hinzufügen" icon="pi pi-check" onClick={handleAdd} className="p-button-warning" disabled={!newName.trim()} />
        </div>
      </Dialog>
    </div>
  );
}
