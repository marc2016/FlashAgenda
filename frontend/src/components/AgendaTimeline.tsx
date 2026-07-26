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
  author?: string;
  createdBy?: string;
  completed?: boolean;
}

interface Props {
  items: AgendaItem[];
  attendees?: any[];
  currentUser: any;
  onUpdate: (items: AgendaItem[]) => Promise<void>;
}

export default function AgendaTimeline({ items, attendees = [], currentUser, onUpdate }: Props) {
  const [visible, setVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const getAuthorName = (item: AgendaItem) => {
    if (item.author) return item.author;
    if (item.createdBy) {
      const attendee = attendees.find((a: any) => a.id === item.createdBy || a._id === item.createdBy || a.name === item.createdBy);
      if (attendee) return attendee.name;
      return item.createdBy;
    }
    return 'Unbekannt';
  };

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

  const toggleCompleted = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      completed: !updatedItems[index].completed
    };
    await onUpdate(updatedItems);
  };

  const deleteItem = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedItems = items.filter((_, i) => i !== index);
    await onUpdate(updatedItems);
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
      const authorName = currentUser?.name || 'Unbekannt';
      const createdById = currentUser?.id || currentUser?._id || authorName;
      updatedItems.push({
        title,
        description,
        author: authorName,
        createdBy: createdById,
        completed: false
      });
    }

    await onUpdate(updatedItems);
    setVisible(false);
  };

  const customizedMarker = (item: AgendaItem, index: number) => {
    const isCompleted = !!item.completed;
    return (
      <span 
        onClick={(e) => toggleCompleted(index, e)}
        className="flex w-2rem h-2rem align-items-center justify-content-center border-circle z-1 shadow-1 cursor-pointer transition-transform hover:scale-110" 
        style={{ backgroundColor: '#eab308' }}
        title={isCompleted ? "Als noch nicht besprochen markieren" : "Als besprochen markieren"}
      >
        {isCompleted ? (
          <i className="pi pi-check text-gray-900 font-bold"></i>
        ) : (
          <span className="border-circle" style={{ width: '0.65rem', height: '0.65rem', backgroundColor: '#111827', display: 'block' }} />
        )}
      </span>
    );
  };

  const customizedContent = (item: AgendaItem, index: number) => {
    const hasDetails = !!item.description;
    const isCompleted = !!item.completed;
    
    return (
      <div className={`mb-4 comic-panel-dark p-4 transition-opacity ${isCompleted ? 'opacity-80' : ''}`}>
        <div className="flex justify-content-between align-items-center">
          <div>
            <div className={`text-xl font-bold mb-1 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
              {item.title}
            </div>
            <div className="text-sm text-gray-400">Erstellt von: {getAuthorName(item)}</div>
          </div>
          <div className="flex gap-2 align-items-center">
            <Button 
              icon={isCompleted ? "pi pi-check-circle" : "pi pi-circle"} 
              rounded 
              text 
              className={isCompleted ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"} 
              title={isCompleted ? "Als noch nicht besprochen markieren" : "Als besprochen markieren"}
              onClick={(e) => toggleCompleted(index, e)} 
            />
            <Button icon="pi pi-pencil" rounded text className="text-gray-400 hover:text-yellow-400" title="Bearbeiten" onClick={() => openEdit(index)} />
            <Button icon="pi pi-trash" rounded text className="text-gray-400 hover:text-red-400" title="Löschen" onClick={(e) => deleteItem(index, e)} />
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
      <h3 className="text-2xl mb-4 text-yellow-500 font-medium font-luckiest">Agendapunkte</h3>
      
      {items && items.length > 0 ? (
        <Timeline 
          align="left" 
          value={items} 
          content={(item) => customizedContent(item, items.indexOf(item))} 
          marker={(item) => customizedMarker(item, items.indexOf(item))} 
          className="w-full" 
        />
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
          
          <div className="flex gap-2 mt-3">
            {editingIndex !== null && (
              <Button 
                label="Löschen" 
                icon="pi pi-trash" 
                onClick={async () => {
                  await deleteItem(editingIndex);
                  setVisible(false);
                }} 
                className="p-button-danger p-button-outlined flex-1" 
              />
            )}
            <Button label="Speichern" icon="pi pi-check" onClick={saveItem} className="p-button-warning flex-1" disabled={!title.trim()} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
