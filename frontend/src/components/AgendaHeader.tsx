import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
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

const userLocationIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `<div style="
    background-color: #3b82f6;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4), 2px 2px 0px #000;
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
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
  attendees?: any[];
  items?: any[];
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



function MapControls({
  venueCoords,
  userCoords,
  onLocateUser,
  isLocating
}: {
  venueCoords?: { lat: number; lng: number };
  userCoords?: { lat: number; lng: number } | null;
  onLocateUser: () => void;
  isLocating: boolean;
}) {
  const map = useMap();

  const handleFitBoth = () => {
    if (venueCoords && userCoords) {
      const bounds = L.latLngBounds([
        [venueCoords.lat, venueCoords.lng],
        [userCoords.lat, userCoords.lng]
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 15);
    } else if (venueCoords) {
      map.setView([venueCoords.lat, venueCoords.lng], 15);
    } else {
      onLocateUser();
    }
  };

  const handleZoomToUser = () => {
    if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 16);
    } else {
      onLocateUser();
    }
  };

  const handleZoomToVenue = () => {
    if (venueCoords) {
      map.setView([venueCoords.lat, venueCoords.lng], 16);
    }
  };

  return (
    <div
      className="absolute bottom-0 right-0 m-2 flex flex-column gap-1"
      style={{ zIndex: 1001 }}
    >
      {/* Fit Both (Location + User Position) */}
      {venueCoords && userCoords && (
        <Button
          icon="pi pi-expand"
          rounded
          className="p-button-warning comic-button shadow-2"
          style={{ width: '2.4rem', height: '2.4rem' }}
          title="Veranstaltungsort und eigenen Standort zusammen anzeigen"
          onClick={handleFitBoth}
        />
      )}

      {/* Zoom to Venue */}
      {venueCoords && (
        <Button
          icon="pi pi-map-marker"
          rounded
          className="p-button-secondary comic-button shadow-2"
          style={{ width: '2.4rem', height: '2.4rem' }}
          title="Zum Veranstaltungsort zoomen"
          onClick={handleZoomToVenue}
        />
      )}

      {/* Zoom to User */}
      <Button
        icon={isLocating ? 'pi pi-spin pi-spinner' : 'pi pi-compass'}
        rounded
        className="p-button-warning comic-button shadow-2"
        style={{ width: '2.4rem', height: '2.4rem' }}
        title="Auf meinen Standort zoomen"
        onClick={handleZoomToUser}
      />
    </div>
  );
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
  
  // Geolocation state (persisted in sessionStorage so browser doesn't prompt on reload)
  const [userCoords, setUserCoordsState] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem('flashagenda_user_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLocating, setIsLocating] = useState(false);

  const saveUserCoords = (coords: { lat: number; lng: number }) => {
    setUserCoordsState(coords);
    try {
      sessionStorage.setItem('flashagenda_user_location', JSON.stringify(coords));
    } catch (err) {
      console.error('Failed to save user location:', err);
    }
  };

  const handleGetMyLocation = () => {
    if (userCoords) {
      return;
    }
    if (!navigator.geolocation) {
      alert('Geolokalisierung wird von deinem Browser nicht unterstützt.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Standort konnte nicht ermittelt werden.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleUseCurrentLocationInEdit = () => {
    if (!navigator.geolocation) {
      alert('Geolokalisierung wird von deinem Browser nicht unterstützt.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });
        saveUserCoords({ lat, lng });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'FlashAgendaApp/1.0' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              setTempValue(data.display_name);
            }
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Standort konnte nicht ermittelt werden.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  // New Agenda creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAttendeeKeys, setSelectedAttendeeKeys] = useState<string[]>([]);
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const openCreateModal = () => {
    const attendees = (agenda as any).attendees || [];
    const allAttKeys = attendees.map((a: any) => a._id || a.id || a.name);
    setSelectedAttendeeKeys(allAttKeys);

    const items = (agenda as any).items || [];
    const pinnedKeys = items
      .filter((i: any) => i.pinned)
      .map((i: any, idx: number) => i._id || i.title || String(idx));
    setSelectedItemKeys(pinnedKeys);

    setShowCreateModal(true);
  };

  const toggleAttendeeKey = (key: string) => {
    setSelectedAttendeeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllAttendees = () => {
    const attendees = (agenda as any).attendees || [];
    const allAttKeys = attendees.map((a: any) => a._id || a.id || a.name);
    if (selectedAttendeeKeys.length === allAttKeys.length) {
      setSelectedAttendeeKeys([]);
    } else {
      setSelectedAttendeeKeys(allAttKeys);
    }
  };

  const toggleItemKey = (key: string) => {
    setSelectedItemKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAllItems = () => {
    const items = (agenda as any).items || [];
    const allItemKeys = items.map((i: any, idx: number) => i._id || i.title || String(idx));
    if (selectedItemKeys.length === allItemKeys.length) {
      setSelectedItemKeys([]);
    } else {
      setSelectedItemKeys(allItemKeys);
    }
  };

  const handleConfirmCreateNew = async () => {
    setIsCreatingNew(true);
    try {
      const attendees = (agenda as any).attendees || [];
      const selectedAttendees = attendees
        .filter((a: any) => selectedAttendeeKeys.includes(a._id || a.id || a.name))
        .map((a: any) => ({
          id: a.id || a._id,
          name: a.name,
          avatarUrl: a.avatarUrl,
          joinedAt: new Date(),
          lastSeen: new Date()
        }));

      const items = (agenda as any).items || [];
      const selectedItems = items
        .filter((i: any, idx: number) => selectedItemKeys.includes(i._id || i.title || String(idx)))
        .map((i: any) => ({
          title: i.title,
          description: i.description,
          author: i.author,
          createdBy: i.createdBy,
          imageUrl: i.imageUrl,
          pinned: !!i.pinned,
          completed: false,
          upvotes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

      const response = await fetch('/api/agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: agenda.title,
          attendees: selectedAttendees,
          items: selectedItems,
          createdBy: currentUser?.id || currentUser?._id || currentUser?.name
        })
      });
      if (!response.ok) throw new Error('Failed to create agenda');
      const data = await response.json();
      if (data?._id) {
        localStorage.setItem(`flashagenda_created_${data._id}`, 'true');
        setShowCreateModal(false);
        window.open(`/agenda/${data._id}`, '_blank');
      }
    } catch (err) {
      console.error('Error creating new agenda:', err);
    } finally {
      setIsCreatingNew(false);
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
          <Button icon="pi pi-plus" rounded text size="small" onClick={openCreateModal} className="text-gray-300 hover:text-yellow-400" title="Neue Agenda (Titel & Personen übernehmen)" style={{ width: '2.2rem', height: '2.2rem' }} />
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
          <Button icon="pi pi-plus" rounded text size="small" onClick={openCreateModal} className="text-gray-300 hover:text-yellow-400" title="Neue Agenda" style={{ width: '2rem', height: '2rem' }} />
          <Button icon="pi pi-copy" rounded text size="small" onClick={handleCopyLink} className="text-gray-300 hover:text-yellow-400" title="Link kopieren" style={{ width: '2rem', height: '2rem' }} />
          <Button icon="pi pi-share-alt" rounded text size="small" onClick={handleShare} className="text-gray-300 hover:text-yellow-400" title="Teilen" style={{ width: '2rem', height: '2rem' }} />
          <Button icon="pi pi-qrcode" rounded text size="small" onClick={() => setShowQR(true)} className="text-gray-300 hover:text-yellow-400" title="QR-Code" style={{ width: '2rem', height: '2rem' }} />
        </div>
      </div>

      <div className="flex align-items-center mb-3 sm:mb-4 gap-2 pt-1 md:pt-4 flex-wrap">
        <i className="pi pi-bolt text-yellow-400 text-3xl sm:text-4xl md:text-6xl flex-shrink-0" />
        <div className="flex align-items-center gap-2 flex-wrap flex-1 min-w-0">
          <h1
            className="text-3xl sm:text-4xl md:text-6xl font-bold m-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 line-height-2 word-break-break-word"
            style={{ filter: 'drop-shadow(3px 3px 0px #000)', paddingBottom: '0.15em' }}
          >
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
            {isCreator ? (
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
            ) : (
              <Button
                icon="pi pi-lock"
                rounded
                text
                disabled
                className="text-gray-600 opacity-40 flex-shrink-0 ml-1 sm:ml-2 cursor-default"
                title="Nur der Ersteller kann den Annahmeschluss bearbeiten"
              />
            )}
          </div>
        </div>

        {/* Unten/Rechts: Karte */}
        <div className="comic-panel-dark p-2 sm:p-3 w-full md:flex-1 md:min-w-18rem md:max-w-lg">
          {(agenda.location?.lat && agenda.location?.lng) || userCoords ? (
            <div className="mb-2 sm:mb-3 border-round-lg overflow-hidden relative" style={{ height: '350px' }}>
              <MapContainer
                center={[
                  agenda.location?.lat ?? userCoords?.lat ?? 51.1657,
                  agenda.location?.lng ?? userCoords?.lng ?? 10.4515
                ]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {agenda.location?.lat && agenda.location?.lng && (
                  <Marker position={[agenda.location.lat, agenda.location.lng]} />
                )}
                {userCoords && (
                  <Marker
                    position={[userCoords.lat, userCoords.lng]}
                    icon={userLocationIcon}
                  />
                )}
                <MapControls
                  venueCoords={agenda.location?.lat && agenda.location?.lng ? { lat: agenda.location.lat, lng: agenda.location.lng } : undefined}
                  userCoords={userCoords}
                  onLocateUser={handleGetMyLocation}
                  isLocating={isLocating}
                />
              </MapContainer>
            </div>
          ) : (
            <div className="bg-gray-700 border-round-lg mb-2 sm:mb-3 p-3 flex flex-column align-items-center justify-content-center text-gray-400 font-bold gap-2 text-center" style={{ height: '350px' }}>
              <i className="pi pi-map-marker text-yellow-500 text-3xl mb-1" />
              <span className="block text-sm text-white font-bold">Kein Ort hinterlegt</span>
              <Button
                label="Meinen Standort anzeigen"
                icon={isLocating ? 'pi pi-spin pi-spinner' : 'pi pi-compass'}
                size="small"
                className="comic-button text-xs py-2 px-3 mt-1"
                onClick={handleGetMyLocation}
              />
            </div>
          )}
          {agenda.location?.name && (
            <div className="flex flex-row gap-2">
              <Button label="Google Maps" icon="pi pi-google" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs px-1" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
              <Button label="Apple Maps" icon="pi pi-apple" size="small" className="p-button-outlined p-button-secondary flex-1 text-xs px-1" onClick={() => window.open(`http://maps.apple.com/?q=${encodeURIComponent(agenda.location?.name || '')}`, '_blank')} />
            </div>
          )}
        </div>
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
                  title="Suchen"
                />
                <Button
                  icon={isLocating ? "pi pi-spin pi-spinner" : "pi pi-compass"}
                  onClick={handleUseCurrentLocationInEdit}
                  className="comic-button-secondary flex-shrink-0"
                  title="Meinen aktuellen Standort verwenden"
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
                <div className="border-round-lg overflow-hidden flex-1 relative" style={{ minHeight: '220px' }}>
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
                    {userCoords && (
                      <Marker
                        position={[userCoords.lat, userCoords.lng]}
                        icon={userLocationIcon}
                      />
                    )}
                    <MapControls
                      venueCoords={
                        selectedCoords.lat && selectedCoords.lng
                          ? { lat: selectedCoords.lat, lng: selectedCoords.lng }
                          : agenda.location?.lat && agenda.location?.lng
                          ? { lat: agenda.location.lat, lng: agenda.location.lng }
                          : undefined
                      }
                      userCoords={userCoords}
                      onLocateUser={handleUseCurrentLocationInEdit}
                      isLocating={isLocating}
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

      {/* Create New Agenda Confirmation Dialog */}
      <Dialog
        header="Neue Agenda erstellen"
        visible={showCreateModal}
        style={{ width: '92vw', maxWidth: '600px' }}
        onHide={() => setShowCreateModal(false)}
        className="glass-panel"
      >
        <div className="flex flex-column gap-4 pt-2">
          <p className="text-gray-300 text-sm m-0 font-medium">
            Wähle Personen und Themen aus, die in die neue Agenda übernommen werden sollen:
          </p>

          {/* Section 1: Personen */}
          <div className="bg-gray-900 border-round p-3 border-1 border-gray-700">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="font-bold text-yellow-400 text-base flex align-items-center gap-2">
                <i className="pi pi-users text-sm"></i>
                Personen
              </span>
              {((agenda as any).attendees || []).length > 0 && (
                <Button
                  label={selectedAttendeeKeys.length === ((agenda as any).attendees || []).length ? 'Alle abwählen' : 'Alle wählen'}
                  text
                  className="p-0 text-xs text-gray-400 hover:text-yellow-400 font-normal"
                  onClick={toggleAllAttendees}
                />
              )}
            </div>

            {((agenda as any).attendees || []).length === 0 ? (
              <p className="text-gray-500 text-xs italic m-0">Keine Personen vorhanden</p>
            ) : (
              <div className="flex flex-column gap-2 max-h-12rem overflow-y-auto pr-1">
                {((agenda as any).attendees || []).map((att: any, idx: number) => {
                  const key = att._id || att.id || att.name;
                  const isChecked = selectedAttendeeKeys.includes(key);
                  return (
                    <div
                      key={key || idx}
                      className="flex align-items-center gap-3 p-2 border-round bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => toggleAttendeeKey(key)}
                    >
                      <Checkbox checked={isChecked} onChange={() => toggleAttendeeKey(key)} />
                      <span className="text-white text-sm font-semibold">{att.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Agenda-Themen */}
          <div className="bg-gray-900 border-round p-3 border-1 border-gray-700">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="font-bold text-yellow-400 text-base flex align-items-center gap-2">
                <i className="pi pi-list text-sm"></i>
                Agenda-Themen
              </span>
              {((agenda as any).items || []).length > 0 && (
                <Button
                  label={selectedItemKeys.length === ((agenda as any).items || []).length ? 'Alle abwählen' : 'Alle wählen'}
                  text
                  className="p-0 text-xs text-gray-400 hover:text-yellow-400 font-normal"
                  onClick={toggleAllItems}
                />
              )}
            </div>

            {((agenda as any).items || []).length === 0 ? (
              <p className="text-gray-500 text-xs italic m-0">Keine Agendapunkte vorhanden</p>
            ) : (
              <div className="flex flex-column gap-2 max-h-14rem overflow-y-auto pr-1">
                {((agenda as any).items || []).map((item: any, idx: number) => {
                  const key = item._id || item.title || String(idx);
                  const isChecked = selectedItemKeys.includes(key);
                  return (
                    <div
                      key={key}
                      className="flex align-items-center justify-content-between p-2 border-round bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors gap-2"
                      onClick={() => toggleItemKey(key)}
                    >
                      <div className="flex align-items-center gap-3 min-w-0 flex-1">
                        <Checkbox checked={isChecked} onChange={() => toggleItemKey(key)} />
                        <span className="text-white text-sm font-semibold word-break-break-word">{item.title}</span>
                      </div>
                      {item.pinned && (
                        <span className="text-yellow-400 text-xs font-bold flex align-items-center gap-1 bg-yellow-950-alpha px-2 py-1 border-round flex-shrink-0">
                          <i className="mdi mdi-pin text-xs"></i>
                          Angepinnt
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-content-end mt-2">
            <Button
              label="Abbrechen"
              icon="pi pi-times"
              onClick={() => setShowCreateModal(false)}
              className="p-button-text text-gray-400 hover:text-white"
            />
            <Button
              label="Neue Agenda erstellen"
              icon="pi pi-check"
              loading={isCreatingNew}
              onClick={handleConfirmCreateNew}
              className="p-button-warning comic-button font-bold"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
