import { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Star, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BookingPage() {
  const [salons, setSalons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadSalons = async () => {
      try {
        const data = await api.getSalons();
        setSalons(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadSalons();
  }, []);

  const filtered = salons.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="booking-page">
      <header className="page-header">
        <h1>Book an Appointment</h1>
        <p>Choose a salon and schedule your visit</p>
      </header>

      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search salons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="salons-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No salons found.</div>
        ) : (
          filtered.map((salon, idx) => (
            <div
              key={salon.id}
              className="salon-list-card card card-interactive animate-fade-in"
              style={{ animationDelay: `${idx * 0.04}s` }}
              onClick={() => navigate(`/salon/${salon.id}`)}
            >
              <div className="salon-list-thumb">
                {salon.image_url ? (
                  <img src={salon.image_url} alt={salon.name} />
                ) : (
                  <div className="salon-list-placeholder">
                    <Star size={28} />
                  </div>
                )}
                {salon.rating && (
                  <div className="salon-list-rating">
                    <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                    <span>{salon.rating}</span>
                  </div>
                )}
              </div>
              <div className="salon-list-info">
                <h3>{salon.name}</h3>
                <div className="meta-row">
                  <MapPin size={14} className="meta-icon" />
                  <span className="meta-text">{salon.address || 'No address'}</span>
                </div>
                <div className="meta-row">
                  {salon.services?.length || 0} services available
                </div>
              </div>
              <ChevronRight size={18} className="salon-list-arrow" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
