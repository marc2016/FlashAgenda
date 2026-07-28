import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet Marker Icon Fix (Default icons break in React bundlers)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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
  closeBeforeHours?: number;
}

interface Props {
  agenda: AgendaData;
  onUpdate: (updates: Partial<AgendaData>) => Promise<void>;
  currentUser?: any;
  isCreator?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Helper component to recenter map when coordinates change
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

export default function AgendaHeader({ agenda, onUpdate, currentUser, isCreator }: Props) {
  const navigate = useNavigate();
  const [editField, setEditField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [showQR, setShowQR] = useState(false);

  // OpenStreetMap / Nominatim Search State
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat?: number; lng?: number }>({});

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

  const handleCreateNewFromCurrent = async () => {
    try {
      const response = await fetch('/api/agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: agenda.title,
          attendees: (agenda as any).attendees || [],
          createdBy: currentUser?.id || currentUser?._id || currentUser?.name
        })
      });
      if (!response.ok) throw new Error('Failed to create agenda');
      const data = await response.json();
      if (data?._id) {
        localStorage.setItem(`flashagenda_created_${data._id}`, 'true');
        navigate(`/agenda/${data._id}`);
      }
    } catch (err) {
      console.error('Error copying agenda:', err);
    }
  };

  const openEdit = (field: string, currentValue: any) => {
    setTempValue(currentValue || '');
    setSearchResults([]);
    setSelectedCoords({});
    setEditField(field);
  };

  const executeOSMSearch = async (queryToSearch?: string) => {
    const q = queryToSearch !== undefined ? queryToSearch : tempValue;
    if (!q || !q.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, {
        headers: {
          'User-Agent': 'FlashAgendaApp/1.0'
        }
      });
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
        if (data.length > 0) {
          setSelectedCoords({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          });
        }
      }
    } catch (err) {
      console.error('OSM Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectOsmPlace = (place: NominatimResult) => {
    setTempValue(place.display_name);
    setSelectedCoords({
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon)
    });
    setSearchResults([]);
  };

  const saveEdit = async () => {
    if (editField) {
      if (editField === 'location') {
        await onUpdate({
          location: {
            name: tempValue,
            lat: selectedCoords.lat ?? agenda.location?.lat,
            lng: selectedCoords.lng ?? agenda.location?.lng
          }
        });
      } else {
        await onUpdate({ [editField]: tempValue });
      }
    }
    setEditField(null);
    setSelectedCoords({});
    setSearchResults([]);
  };

  return (
    <div className="mb-4 sm:mb-6">
      {/* QR Code Dialog */}
      <Dialog
        header="QR-Code scannen"
        visible={showQR}
        onHide={() => setShowQR(false)}
        style={{ width: '92vw', maxWidth: '360px' }}
        className="glass-panel"
        modal
        draggable={false}
        resizable={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 24px rgba(234,179,8,0.25)'
          }}>
            <QRCodeSVG
              value={window.location.href}
              size={180}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="H"
              includeMargin={false}
            />
          </div>
          <p style={{ color: '#facc15', fontSize: '0.75rem', margin: 0, maxWidth: '240px', textAlign: 'center', wordBreak: 'break-all' }}>
            {window.location.href}
          </p>
        </div>
      </Dialog>

      {/* Desktop: Action buttons fixed top-right */}
      <div className="hidden md:flex fixed top-0 right-0 p-4 z-5 align-items-center gap-1" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
        <div
          className="flex align-items-center gap-1"
          style={{
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '999px',
            padding: '4px 10px',
            border: '1px solid rgba(234,179,8,0.3)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}
        >
          <Button icon="pi pi-home" rounded text size="small" onClick={() => navigate('/')} className="text-gray-300 hover:text-yellow-400" title="Zur Startseite" style={{ width: '2.2rem', height: '2.2rem' }} />
          <Button icon="pi pi-plus" rounded text size="small" onClick={handleCreateNewFromCurrent} className="text-gray-300 hover:text-yellow-400" title="Neue Agenda (Titel & Personen übernehmen)" style={{ width: '2.2rem', height: '2.2rem' }} />
          <Button icon="pi pi-copy" rounded text size="small" onClick={handleCopyLink} className="text-gray-300 hover:text-yellow-400" title="Link kopieren" style={{ width: '2.2rem', height: '2.2rem' }} />
          <Button icon="pi pi-share-alt" rounded text size="small" onClick={handleShare} className="text-gray-300 hover:text-yellow-400" title="Teilen" style={{ width: '2.2rem', height: '2.2rem' }} />
          <Button icon="pi pi-qrcode" rounded text size="small" onClick={() => setShowQR(true)} className="text-gray-300 hover:text-yellow-400" title="QR-Code anzeigen" style={{ width: '2.2rem', height: '2.2rem' }} />
        </div>
      </div>

      {/* Mobile: Action buttons above title */}
      <div className="flex md:hidden mb-3 justify-content-between align-items-center flex-wrap gap-2">
        <Button
          icon="pi pi-arrow-left"
          label="Zurück"
          text
          size="small"
          onClick={() => navigate('/')}
          className="text-yellow-400 font-bold p-0 text-sm"
        />
        <div
          className="flex align-items-center gap-1 ml-auto"
          style={{
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '999px',
            padding: '3px 8px',
            border: '1px solid rgba(234,179,8,0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          <Button icon="pi pi-plus" rounded text size="small" onClick={handleCreateNewFromCurrent} className="text-gray-300 hover:text-yellow-400" title="Neue Agenda" style={{ width: '2rem', height: '2rem' }} />
          <Button icon="pi pi-copy" rounded text size="small" onClick={handleCopyLink} className="text-gray-300 hover:text-yellow-400" title="Link kopieren" style={{ width: '2rem', height: '2rem' }} />
          <Button icon="pi pi-share-alt" rounded text size="small" onClick={handleShare} className="text-gray-300 hover:text-yellow-400" title="Teilen" style={{ width: '2rem', height: '2rem' }} />
          <Button icon="pi pi-qrcode" rounded text size="small" onClick={() => setShowQR(true)} className="text-gray-300 hover:text-yellow-400" title="QR-Code" style={{ width: '2rem', height: '2rem' }} />
        </div>
      </div>

      <div className="flex align-items-center mb-3 sm:mb-4 group flex-wrap gap-2 pt-1 md:pt-4">
        <i className="pi pi-bolt text-yellow-400 text-3xl sm:text-4xl md:text-6xl flex-shrink-0" />
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 font-luckiest line-height-1 word-break-break-word flex-1 min-w-0">
          {agenda.title}
        </h1>
        <Button
          icon="pi pi-pencil"
          rounded
          text
          aria-label="Edit Title"
          onClick={() => openEdit('title', agenda.title)}
          className="text-gray-400 hover:text-yellow-400 p-0 flex-shrink-0"
          style={{ width: '2.2rem', height: '2.2rem' }}
        />
      </div>

      {/* Layout: Boxen oben/links, Karte unten/rechts */}
      <div className="flex flex-column md:flex-row gap-3 sm:gap-4 align-items-start mb-4 w-full">
        {/* Links/Oben: Boxen Container - min-h-4rem fixes cutoff on small screens */}
        <div className="flex flex-column gap-2 sm:gap-3 w-full md:flex-1 md:max-w-md min-w-0">
          {/* Datum */}
          <div className="comic-panel-dark px-3 sm:px-4 py-2 flex align-items-center justify-content-between min-h-4rem h-auto w-full">
            <div className="flex align-items-center gap-2 sm:gap-3 flex-1 overflow-hidden min-w-0">
              <i className="pi pi-calendar-plus text-yellow-500 text-xl sm:text-2xl flex-shrink-0" />
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
                placeholder="Datum & Uhrzeit hinzufügen..."
                className="text-white font-bold w-full"
                inputClassName="bg-transparent text-white font-bold text-sm sm:text-xl border-none p-0 w-full"
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
              className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-1 sm:ml-2"
            />
          </div>

          {/* Ort */}
          <div
            className="comic-panel-dark px-3 sm:px-4 py-2 flex align-items-center justify-content-between min-h-4rem h-auto w-full cursor-pointer"
            onClick={() => openEdit('location', agenda.location?.name)}
          >
            <div className="flex align-items-center gap-2 sm:gap-3 flex-1 overflow-hidden min-w-0">
              <i className="pi pi-map-marker text-yellow-500 text-xl sm:text-2xl flex-shrink-0" />
              <span className={`text-sm sm:text-xl white-space-nowrap overflow-hidden text-overflow-ellipsis font-bold ${agenda.location?.name ? 'text-white' : 'text-white-alpha-60'}`}>
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
              className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-1 sm:ml-2"
            />
          </div>

          {/* Speisekarte */}
          <div
            className="comic-panel-dark px-3 sm:px-4 py-2 flex align-items-center justify-content-between min-h-4rem h-auto w-full cursor-pointer"
            onClick={() => {
              if (agenda.menuUrl) {
                window.open(agenda.menuUrl, '_blank');
              } else {
                openEdit('menuUrl', agenda.menuUrl);
              }
            }}
          >
            <div className="flex align-items-center gap-2 sm:gap-3 flex-1 overflow-hidden min-w-0">
              <i className="pi pi-book text-yellow-500 text-xl sm:text-2xl flex-shrink-0" />
              <span className={`text-sm sm:text-xl white-space-nowrap overflow-hidden text-overflow-ellipsis font-bold ${agenda.menuUrl ? 'text-white' : 'text-white-alpha-60'}`}>
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
              className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-1 sm:ml-2"
            />
          </div>

          {/* Annahmeschluss */}
          <div
            className={`comic-panel-dark px-3 sm:px-4 py-2 flex align-items-center justify-content-between min-h-4rem h-auto w-full ${isCreator ? 'cursor-pointer' : ''}`}
            onClick={() => isCreator && openEdit('closeBeforeHours', agenda.closeBeforeHours ?? 12)}
          >
            <div className="flex align-items-center gap-2 sm:gap-3 flex-1 overflow-hidden min-w-0">
              <i className="pi pi-lock text-yellow-500 text-xl sm:text-2xl flex-shrink-0" />
              <span className="text-white font-bold text-sm sm:text-xl white-space-nowrap overflow-hidden text-overflow-ellipsis">
                Schluss: {agenda.closeBeforeHours !== undefined ? agenda.closeBeforeHours : 12}h vorher
              </span>
            </div>
            {isCreator && (
              <Button
                icon="pi pi-pencil"
                rounded
                text
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit('closeBeforeHours', agenda.closeBeforeHours ?? 12);
                }}
                className="text-gray-400 hover:text-yellow-400 flex-shrink-0 ml-1 sm:ml-2"
              />
            )}
          </div>
        </div>

        {/* Unten/Rechts: Karte */}
        {agenda.location?.name && (
          <div className="comic-panel-dark p-2 sm:p-3 w-full md:flex-1 md:min-w-18rem md:max-w-lg">
            {agenda.location.lat && agenda.location.lng ? (
              <div className="mb-2 sm:mb-3 border-round-lg overflow-hidden" style={{ height: '220px' }}>
                <MapContainer
                  center={[agenda.location.lat, agenda.location.lng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[agenda.location.lat, agenda.location.lng]} />
                  <RecenterMap lat={agenda.location.lat} lng={agenda.location.lng} />
                </MapContainer>
              </div>
            ) : (
              <div className="bg-gray-700 border-round-lg mb-2 sm:mb-3 flex flex-column align-items-center justify-content-center text-gray-400 font-bold" style={{ height: '220px' }}>
                <i className="pi pi-map text-2xl mb-1" />
                <span className="block text-xs sm:text-sm">Keine Koordinaten für diesen Ort</span>
              </div>
            )}
            <div className="flex flex-row gap-2">
              <Button label="Google Maps" icon="pi pi-google" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs px-1" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
              <Button label="Apple Maps" icon="pi pi-apple" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs px-1" onClick={() => window.open(`http://maps.apple.com/?q=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        header="Bearbeite Info"
        visible={!!editField}
        style={{ width: '95vw', maxWidth: editField === 'location' ? '900px' : '440px', height: editField === 'location' ? '90vh' : 'auto' }}
        contentStyle={{ height: editField === 'location' ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}
        onHide={() => setEditField(null)}
        className="glass-panel"
      >
        <div className="flex flex-column gap-3 pt-3 flex-1 overflow-hidden">
          {editField === 'title' && (
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus className="comic-panel-dark text-white" />
          )}

          {editField === 'location' && (
            <div className="flex flex-column gap-3 flex-1 overflow-hidden">
              <div className="flex gap-2">
                <InputText
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executeOSMSearch();
                    }
                  }}
                  autoFocus
                  placeholder="Ort oder Adresse suchen..."
                  className="comic-panel-dark text-white flex-1 text-sm"
                />
                <Button
                  icon={isSearching ? "pi pi-spin pi-spinner" : "pi pi-search"}
                  onClick={() => executeOSMSearch()}
                  className="p-button-warning flex-shrink-0"
                />
              </div>

              {searchResults.length > 0 && (
                <div
                  className="comic-panel-dark p-2 flex flex-column gap-1 overflow-y-auto"
                  style={{ background: '#111827', maxHeight: '160px' }}
                >
                  {searchResults.map((place) => (
                    <div
                      key={place.place_id}
                      onClick={() => selectOsmPlace(place)}
                      className="p-2 border-round cursor-pointer hover:bg-gray-800 text-xs sm:text-sm text-white"
                    >
                      <i className="pi pi-map-marker text-yellow-500 mr-2" />
                      {place.display_name}
                    </div>
                  ))}
                </div>
              )}

              {(selectedCoords.lat || agenda.location?.lat) ? (
                <div className="border-round-lg overflow-hidden flex-1" style={{ minHeight: '220px' }}>
                  <MapContainer
                    center={[
                      selectedCoords.lat ?? agenda.location?.lat!,
                      selectedCoords.lng ?? agenda.location?.lng!
                    ]}
                    zoom={14}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[
                        selectedCoords.lat ?? agenda.location?.lat!,
                        selectedCoords.lng ?? agenda.location?.lng!
                      ]}
                    />
                    <RecenterMap
                      lat={selectedCoords.lat ?? agenda.location?.lat!}
                      lng={selectedCoords.lng ?? agenda.location?.lng!}
                    />
                  </MapContainer>
                </div>
              ) : (
                <div className="bg-gray-800 border-round-lg p-3 text-center text-gray-400 text-xs sm:text-sm flex align-items-center justify-content-center flex-1" style={{ minHeight: '180px' }}>
                  <span>Suche ein Ausflugsziel oder gib eine Adresse ein für die Kartenvorschau</span>
                </div>
              )}
            </div>
          )}

          {editField === 'menuUrl' && (
            <InputText value={tempValue} onChange={(e) => setTempValue(e.target.value)} autoFocus placeholder="https://..." className="comic-panel-dark text-white text-sm" />
          )}

          {editField === 'closeBeforeHours' && (
            <div className="flex flex-column gap-2">
              <label className="text-gray-300 font-bold text-sm">Stunden vor Beginn, ab denen keine Punkte mehr hinzugefügt werden können:</label>
              <InputText type="number" min={0} value={tempValue} onChange={(e) => setTempValue(Number(e.target.value))} autoFocus className="comic-panel-dark text-white" />
            </div>
          )}

          <Button label="Speichern" icon="pi pi-check" onClick={saveEdit} className="p-button-warning mt-auto" />
        </div>
      </Dialog>
    </div>
  );
}
