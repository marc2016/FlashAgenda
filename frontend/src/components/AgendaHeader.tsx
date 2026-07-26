import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { format, parseISO } from 'date-fns';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { QRCodeSVG } from 'qrcode.react';

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '8px'
};

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
  menuUrl?: string;
}

interface Props {
  agenda: AgendaData;
  onUpdate: (updates: Partial<AgendaData>) => Promise<void>;
}

export default function AgendaHeader({ agenda, onUpdate }: Props) {
  const [editField, setEditField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [showQR, setShowQR] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

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
      {/* URL bar — fixed top-right corner */}
      <div
        style={{
          position: 'fixed',
          top: '12px',
          right: '16px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '999px',
          padding: '4px 12px',
          border: '1px solid rgba(234,179,8,0.3)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
        }}
      >
        <a
          href={window.location.href}
          className="text-yellow-400 font-bold"
          style={{ textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
        >
          {window.location.href}
        </a>
        <Button icon="pi pi-copy" rounded text size="small" onClick={handleCopyLink} className="text-gray-400 hover:text-yellow-400" style={{ width: '1.8rem', height: '1.8rem' }} />
        <Button icon="pi pi-share-alt" rounded text size="small" onClick={handleShare} className="text-gray-400 hover:text-yellow-400" style={{ width: '1.8rem', height: '1.8rem' }} />
        <Button icon="pi pi-qrcode" rounded text size="small" onClick={() => setShowQR(true)} className="text-gray-400 hover:text-yellow-400" style={{ width: '1.8rem', height: '1.8rem' }} />
      </div>

      {/* QR Code Dialog */}
      <Dialog
        header="QR-Code scannen"
        visible={showQR}
        onHide={() => setShowQR(false)}
        style={{ width: 'auto' }}
        className="glass-panel"
        modal
        draggable={false}
        resizable={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', padding: '1rem' }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 24px rgba(234,179,8,0.25)'
          }}>
            <QRCodeSVG
              value={window.location.href}
              size={220}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="H"
              includeMargin={false}
            />
          </div>
          <p style={{ color: '#facc15', fontSize: '0.8rem', margin: 0, maxWidth: '260px', textAlign: 'center', wordBreak: 'break-all' }}>
            {window.location.href}
          </p>
        </div>
      </Dialog>

      <div className="flex align-items-center mb-5 group">
        <h1 className="text-5xl font-bold m-0 mr-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
          {agenda.title}
        </h1>
        <Button icon="pi pi-pencil" rounded text aria-label="Edit Title" onClick={() => openEdit('title', agenda.title)} className="text-gray-400 hover:text-yellow-400" />
      </div>

      {/* Boxen Container */}
      <div className="flex flex-column gap-3 mb-4 max-w-md">
        {/* Datum */}
        <div className="comic-panel-dark px-4 py-2 flex align-items-center justify-content-between h-4rem w-full">
          <div className="flex align-items-center gap-3 flex-1 overflow-hidden">
            <i className="pi pi-calendar-plus text-yellow-500 text-2xl flex-shrink-0" />
            <Calendar
              value={agenda.date ? parseISO(agenda.date) : null}
              onChange={async (e) => {
                if (e.value) {
                  const newDate = e.value as Date;
                  await onUpdate({ date: newDate.toISOString() });
                }
              }}
              showTime
              hourFormat="24"
              dateFormat="dd.mm.yy"
              placeholder="Datum & Uhrzeit wählen"
              className="text-white font-bold w-full"
              inputClassName="bg-transparent text-white font-bold text-xl border-none p-0 w-full"
              panelClassName="comic-panel-dark"
            />
          </div>
          <Button
            icon="pi pi-pencil"
            rounded
            text
            aria-label="Edit Date"
            onClick={(e) => {
              e.stopPropagation();
              openEdit('date', agenda.date);
            }}
            className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-2"
          />
        </div>

        {/* Ort */}
        <div>
          <div
            className="comic-panel-dark px-4 py-2 flex align-items-center justify-content-between h-4rem w-full cursor-pointer"
            onClick={() => {
              if (agenda.location?.name) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agenda.location.name)}`, '_blank');
              } else {
                openEdit('location', agenda.location?.name);
              }
            }}
          >
            <div className="flex align-items-center gap-3 flex-1 overflow-hidden">
              <i className="pi pi-map-marker text-yellow-500 text-2xl flex-shrink-0" />
              <span className="text-white font-bold text-xl white-space-nowrap overflow-hidden text-overflow-ellipsis">
                {agenda.location?.name || 'Ort hinzufügen...'}
              </span>
            </div>
            <Button
              icon="pi pi-pencil"
              rounded
              text
              onClick={(e) => {
                e.stopPropagation();
                openEdit('location', agenda.location?.name);
              }}
              className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-2"
            />
          </div>

          {agenda.location?.name && (
            <div className="mt-3 comic-panel-dark p-4 w-full">
              {isLoaded && agenda.location.lat && agenda.location.lng ? (
                <div className="mb-3">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={{ lat: agenda.location.lat, lng: agenda.location.lng }}
                    zoom={14}
                    options={{ disableDefaultUI: true }}
                  >
                    <Marker position={{ lat: agenda.location.lat, lng: agenda.location.lng }} />
                  </GoogleMap>
                </div>
              ) : (
                <div className="h-8rem bg-gray-700 border-round-lg mb-3 flex flex-column align-items-center justify-content-center text-gray-400 font-bold">
                  <i className="pi pi-map text-3xl mb-2" />
                  <span className="block text-sm">Kein API-Key oder Koordinaten</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button label="Google Maps" icon="pi pi-google" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
                <Button label="Apple Maps" icon="pi pi-apple" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs" onClick={() => window.open(`http://maps.apple.com/?q=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
              </div>
            </div>
          )}
        </div>

        {/* Speisekarte */}
        <div
          className="comic-panel-dark px-4 py-2 flex align-items-center justify-content-between h-4rem w-full cursor-pointer"
          onClick={() => {
            if (agenda.menuUrl) {
              window.open(agenda.menuUrl, '_blank');
            } else {
              openEdit('menuUrl', agenda.menuUrl);
            }
          }}
        >
          <div className="flex align-items-center gap-3 flex-1 overflow-hidden">
            <i className="pi pi-book text-yellow-500 text-2xl flex-shrink-0" />
            <span className="text-white font-bold text-xl white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {agenda.menuUrl ? 'Speisekarte öffnen' : 'Speisekarte hinzufügen...'}
            </span>
          </div>
          <Button
            icon="pi pi-pencil"
            rounded
            text
            onClick={(e) => {
              e.stopPropagation();
              openEdit('menuUrl', agenda.menuUrl);
            }}
            className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-2"
          />
        </div>
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
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus className="comic-panel-dark text-white" />
          )}
          {editField === 'location' && (
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus placeholder="Ort eingeben..." className="comic-panel-dark text-white" />
          )}
          {editField === 'menuUrl' && (
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus placeholder="https://..." className="comic-panel-dark text-white" />
          )}
          <Button label="Speichern" icon="pi pi-check" onClick={saveEdit} className="p-button-warning mt-2" />
        </div>
      </Dialog>
    </div>
  );
}
