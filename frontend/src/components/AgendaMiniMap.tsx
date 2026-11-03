import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import '../utils/leafletSetup';

interface AgendaMiniMapProps {
  location?: { name?: string; lat: number; lng: number };
  height?: number;
}

// Leaflet measures its container once on mount; re-measure after layout settles.
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/**
 * Static map excerpt for an agenda card. Not interactive: all handlers are off and the
 * wrapper ignores pointer events, so taps reach the surrounding card.
 * The Leaflet map is only mounted once the card scrolls near the viewport.
 */
export default function AgendaMiniMap({ location, height = 120 }: AgendaMiniMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasLocation = !!location && typeof location.lat === 'number' && typeof location.lng === 'number';
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (!hasLocation || visible || !ref.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasLocation, visible]);

  if (!hasLocation) {
    return (
      <div
        data-testid="agenda-card-map-placeholder"
        className="agenda-card-map agenda-card-map-placeholder flex align-items-center justify-content-center"
        style={{ height }}
        aria-hidden="true"
      >
        <i className="pi pi-calendar text-3xl" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-testid="agenda-card-map"
      className="agenda-card-map"
      style={{ height }}
      aria-label={location!.name ? `Karte: ${location!.name}` : 'Karte'}
    >
      {visible && (
        <MapContainer
          center={[location!.lat, location!.lng]}
          zoom={15}
          dragging={false}
          touchZoom={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[location!.lat, location!.lng]} interactive={false} keyboard={false} />
          <InvalidateSizeOnMount />
        </MapContainer>
      )}
    </div>
  );
}
