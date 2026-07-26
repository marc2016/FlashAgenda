import { useState } from 'react';
import { Timeline } from 'primereact/timeline';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';

interface AgendaItem {
  _id?: string;
  title: string;
  description?: string;
  author: string;
}

interface Props {
  items: AgendaItem[];
  currentUser: any;
  onUpdate: (items: AgendaItem[]) => Promise<void>;
}

export default function AgendaTimeline({ items, currentUser, onUpdate }: Props) {
  const [visible, setVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const openNew = () => {
    setTitle('');
    setDescription('');
    setEditingIndex(null);
    setVisible(true);
  };

  const openEdit = (index: number) => {
    const item = items[index];
    setTitle(item.title);
    setDescription(item.description || '');
    setEditingIndex(index);
    setVisible(true);
  };

  const saveItem = async () => {
    if (!title.trim()) return;

    let updatedItems = [...items];
    if (editingIndex !== null) {
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        title,
        description
      };
    } else {
      updatedItems.push({
        title,
        description,
        author: currentUser?.name || 'Unbekannt'
      });
    }

    await onUpdate(updatedItems);
    setVisible(false);
  };

  const customizedMarker = () => {
    return (
      <span className="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1" style={{ backgroundColor: '#eab308' }}>
        <i className="pi pi-check text-gray-900 font-bold"></i>
      </span>
    );
  };

  const customizedContent = (item: AgendaItem, index: number) => {
    const hasDetails = !!item.description;
    
    return (
      <div className="mb-4 comic-panel-dark p-4">
        <div className="flex justify-content-between align-items-center">
          <div>
            <div className="text-xl font-bold mb-1">{item.title}</div>
            <div className="text-sm text-gray-400">Erstellt von: {item.author}</div>
          </div>
          <div className="flex gap-2">
            <Button icon="pi pi-pencil" rounded text className="text-gray-400 hover:text-yellow-400" onClick={() => openEdit(index)} />
            {hasDetails && (
              <Button 
                icon="pi pi-angle-down" 
                rounded 
                text 
                className="text-gray-400 hover:text-yellow-400"
                onClick={(e) => {
                  const target = e.currentTarget.parentElement?.parentElement?.nextElementSibling;
                  if (target) {
                     target.classList.toggle('hidden');
                  }
                }}
              />
            )}
          </div>
        </div>
        {hasDetails && (
          <div className="hidden mt-3 pt-3 border-top-1 border-gray-700 text-gray-300 line-height-3">
            {item.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h3 className="text-2xl mb-4 text-yellow-500 font-medium">Agendapunkte</h3>
      
      {items && items.length > 0 ? (
        <Timeline value={items} content={(item) => customizedContent(item, items.indexOf(item))} marker={customizedMarker} className="w-full" />
      ) : (
        <p className="text-gray-400 mb-4">Noch keine Agendapunkte vorhanden.</p>
      )}

      <div className="mt-4">
        <Button label="Neuer Agendapunkt" icon="pi pi-plus" className="p-button-outlined p-button-warning w-full py-3 border-dashed" onClick={openNew} />
      </div>

      <Dialog 
        header={editingIndex !== null ? 'Agendapunkt bearbeiten' : 'Neuer Agendapunkt'} 
        visible={visible} 
        style={{ width: '90vw', maxWidth: '500px' }} 
        onHide={() => setVisible(false)}
        className="glass-panel"
      >
        <div className="flex flex-column gap-3 pt-3">
          <div className="p-inputgroup">
             <span className="p-inputgroup-addon bg-gray-700 border-gray-600"><i className="pi pi-bookmark"></i></span>
             <InputText placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="bg-gray-800 text-white border-gray-600" />
          </div>
          <div className="p-inputgroup flex-column">
             <InputTextarea placeholder="Details (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="bg-gray-800 text-white border-gray-600 border-round-bottom-none" />
          </div>
          
          <Button label="Speichern" icon="pi pi-check" onClick={saveItem} className="p-button-warning mt-3" disabled={!title.trim()} />
        </div>
      </Dialog>
    </div>
  );
}
