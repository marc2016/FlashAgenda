import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { format, parseISO } from 'date-fns';

interface LocationObj {
  name?: string;
  lat?: number;
  lng?: number;
}

interface AgendaData {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  location?: LocationObj;
}

interface Props {
  agenda: AgendaData;
  onUpdate: (updates: Partial<AgendaData>) => Promise<void>;
}

export default function AgendaHeader({ agenda, onUpdate }: Props) {
  const [editField, setEditField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: agenda.title,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const openEdit = (field: string, currentValue: any) => {
    setTempValue(currentValue || '');
    setEditField(field);
  };

  const saveEdit = async () => {
    if (editField) {
      if (editField === 'location') {
         await onUpdate({ location: { name: tempValue } });
      } else {
         await onUpdate({ [editField]: tempValue });
      }
    }
    setEditField(null);
  };

  return (
    <div className="mb-6">
      <div className="flex align-items-center mb-2 group">
        <h1 className="text-5xl font-bold m-0 mr-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
          {agenda.title}
        </h1>
        <Button icon="pi pi-pencil" rounded text aria-label="Edit Title" onClick={() => openEdit('title', agenda.title)} className="text-gray-400 hover:text-yellow-400" />
      </div>

      <div className="flex align-items-center gap-2 mb-4 bg-gray-800 p-2 border-round-lg border-1 border-gray-700 max-w-max">
        <span className="text-gray-400 text-sm overflow-hidden text-overflow-ellipsis white-space-nowrap" style={{ maxWidth: '200px' }}>
          {window.location.href}
        </span>
        <Button icon="pi pi-copy" rounded text size="small" onClick={handleCopyLink} tooltip="Link kopieren" />
        <Button icon="pi pi-share-alt" rounded text size="small" onClick={handleShare} tooltip="Teilen" />
      </div>

      <div className="flex flex-wrap gap-4 mb-3">
        <div className="flex align-items-center">
          <i className="pi pi-calendar text-yellow-500 mr-2 text-xl"></i>
          <h2 className="text-2xl m-0 font-medium mr-2">
            {agenda.date ? format(parseISO(agenda.date), 'dd.MM.yyyy') : 'Kein Datum'}
          </h2>
          <Button icon="pi pi-pencil" rounded text onClick={() => openEdit('date', agenda.date ? parseISO(agenda.date) : null)} className="text-gray-400 hover:text-yellow-400" />
        </div>
        
        <div className="flex align-items-center">
          <i className="pi pi-clock text-yellow-500 mr-2 text-xl"></i>
          <h2 className="text-2xl m-0 font-medium mr-2">
            {agenda.time || 'Keine Uhrzeit'}
          </h2>
          <Button icon="pi pi-pencil" rounded text onClick={() => openEdit('time', agenda.time)} className="text-gray-400 hover:text-yellow-400" />
        </div>
      </div>

      <div className="flex flex-column mb-4">
        <div className="flex align-items-center">
          <i className="pi pi-map-marker text-yellow-500 mr-2 text-xl"></i>
          <h2 className="text-2xl m-0 font-medium mr-2">
            {agenda.location?.name || 'Kein Ort'}
          </h2>
          <Button icon="pi pi-pencil" rounded text onClick={() => openEdit('location', agenda.location?.name)} className="text-gray-400 hover:text-yellow-400" />
        </div>
        
        {agenda.location?.name && (
          <div className="mt-3 bg-gray-800 border-round-xl p-3 border-1 border-gray-700 max-w-sm">
            <div className="h-8rem bg-gray-700 border-round-lg mb-3 flex flex-column align-items-center justify-content-center text-gray-500">
              <i className="pi pi-map text-3xl mb-2"></i>
              <span className="block text-sm">Kartenvorschau</span>
            </div>
            <div className="flex gap-2">
              <Button label="Google Maps" icon="pi pi-google" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
              <Button label="Apple Maps" icon="pi pi-apple" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs" onClick={() => window.open(`http://maps.apple.com/?q=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
            </div>
          </div>
        )}
      </div>

      <Dialog 
        header={`Bearbeite Info`} 
        visible={!!editField} 
        style={{ width: '90vw', maxWidth: '400px' }} 
        onHide={() => setEditField(null)}
        className="glass-panel"
      >
        <div className="flex flex-column gap-3 pt-3">
          {editField === 'title' && (
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus className="bg-gray-800 text-white" />
          )}
          {editField === 'location' && (
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus placeholder="Ort eingeben..." className="bg-gray-800 text-white" />
          )}
          {editField === 'time' && (
            <InputText type="time" value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus className="bg-gray-800 text-white" />
          )}
          {editField === 'date' && (
            <Calendar value={tempValue} onChange={(e) => setTempValue(e.value)} dateFormat="dd.mm.yy" className="w-full" inputClassName="bg-gray-800 text-white" panelClassName="bg-gray-800" />
          )}
          <Button label="Speichern" icon="pi pi-check" onClick={saveEdit} className="p-button-warning mt-2" />
        </div>
      </Dialog>
    </div>
  );
}
