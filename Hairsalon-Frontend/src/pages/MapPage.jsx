import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { api } from '../api';
import { MapPin, Navigation, Phone, Star, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../auth';
import { useNavigate } from 'react-router-dom';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const salonIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function MapPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    const loadSalons = async () => {
      try {
        const data = await api.getSalons();
        setSalons(data.filter(s => s.latitude && s.longitude));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSalons();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocationError('Location access denied. Showing all salons.')
      );
    }
  }, []);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const sortedSalons = userLocation
    ? [...salons].sort((a, b) =>
        getDistance(userLocation.lat, userLocation.lng, parseFloat(a.latitude), parseFloat(a.longitude)) -
        getDistance(userLocation.lat, userLocation.lng, parseFloat(b.latitude), parseFloat(b.longitude))
      )
    : salons;

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [3.8480, 11.5021];

  const mapKey = userLocation
    ? `loc-${userLocation.lat.toFixed(2)}-${userLocation.lng.toFixed(2)}`
    : 'default-yaounde';

  if (loading) return <div className="page-loading">Loading map...</div>;

  return (
    <div className="map-page">
      <header className="page-header">
        <h1>Salons Near Me</h1>
        <p>{locationError || 'Discover salons around you'}</p>
      </header>

      <div className="map-container animate-fade-in">
        <MapContainer key={mapKey} center={center} zoom={13} style={{ height: '520px', width: '100%', borderRadius: 'var(--radius-lg)' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={customIcon}>
              <Popup>
                <div className="map-popup">
                  <strong>Your location</strong>
                </div>
              </Popup>
            </Marker>
          )}
          {sortedSalons.map((salon) => {
            const lat = parseFloat(salon.latitude);
            const lng = parseFloat(salon.longitude);
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            return (
              <Marker
                key={salon.id}
                position={[lat, lng]}
                icon={salonIcon}
              >
                <Popup>
                  <div className="map-popup">
                    {salon.image_url && (
                      <img
                        src={salon.image_url}
                        alt={salon.name}
                        className="map-popup-img"
                      />
                    )}
                    <div className="map-popup-body">
                      <h3>{salon.name}</h3>
                      <p className="map-popup-address">{salon.address || 'Address not available'}</p>
                      {salon.phone_number && (
                        <p className="map-popup-phone">{salon.phone_number}</p>
                      )}
                      {(() => {
                        const cats = [...new Set((salon.services || []).map(s => s.category).filter(Boolean))];
                        const labels = { hair: 'Coiffure', nails: 'Ongles', piercing: 'Piercing', makeup: 'Makeup', skincare: 'Soins' };
                        return cats.length > 0 ? (
                          <div className="map-popup-categories">
                            {cats.map(c => (
                              <span key={c} className="map-popup-category">{labels[c] || c}</span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      <p className="map-popup-meta">
                        {salon.services?.length || 0} services available
                      </p>
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm map-popup-btn"
                      >
                        <Navigation size={14} />
                        Get Directions
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {(userLocation || salons.length > 0) && (
        <div className="section">
          <h2 className="section-title">Nearby Salons</h2>
          <div className="salons-list">
            {sortedSalons.slice(0, 6).map((salon, idx) => {
              const distance = userLocation
                ? getDistance(userLocation.lat, userLocation.lng, parseFloat(salon.latitude), parseFloat(salon.longitude)).toFixed(1)
                : null;
              return (
                <div
                  key={salon.id}
                  className="salon-list-card card card-interactive animate-fade-in"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  onClick={() => navigate(`/salon/${salon.id}`)}
                >
                  <div className="salon-list-thumb">
                    {salon.image_url ? (
                      <img src={salon.image_url} alt={salon.name} />
                    ) : (
                      <div className="salon-list-placeholder"><MapPin size={24} /></div>
                    )}
                  </div>
                  <div className="salon-list-info">
                    <h3>{salon.name}</h3>
                    <div className="meta-row">
                      <MapPin size={14} className="meta-icon" />
                      <span>{salon.address || 'Address not available'}</span>
                    </div>
                    {distance !== null && (
                      <div className="meta-row">
                        <Navigation size={14} className="meta-icon" />
                        <span>{distance} km away</span>
                      </div>
                    )}
                    <div className="meta-row">
                      <Star size={14} className="meta-icon" />
                      <span>{salon.services?.length || 0} services</span>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${parseFloat(salon.latitude)},${parseFloat(salon.longitude)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm salon-list-action"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Navigation size={14} />
                    Directions
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
