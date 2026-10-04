import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Search, Star, MapPin, ChevronRight, Sparkles, Clock, TrendingUp, ArrowRight, CalendarPlus, MessageCircle, Scissors, Heart, Palette, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatBot from '../components/ChatBot';

export default function HomePage() {
  const { user } = useAuth();
  const [salons, setSalons] = useState([]);
  const [hairstyles, setHairstyles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hairstyleFilter, setHairstyleFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [salonsData, hairstylesData, salonPubsData] = await Promise.all([
          api.getSalons(),
          api.getAllHairstylePublications(),
          api.getAllSalonPublications(),
        ]);
        setSalons(salonsData);
        const combined = [
          ...hairstylesData.map(h => ({ ...h, _type: 'hairstyle' })),
          ...salonPubsData.map(sp => ({ ...sp, _type: 'salon' })),
        ];
        setHairstyles(combined);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const filteredSalons = salons.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPubCategory = (h) => {
    return (h.category || 'hair').toLowerCase();
  };

  const filteredHairstyles = hairstyles.filter((h) => {
    const matchesSearch = (h.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (hairstyleFilter === 'all') return true;
    return getPubCategory(h) === hairstyleFilter;
  });

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-tag animate-fade-in">
            <Sparkles size={14} />
            <span>Welcome, <strong>{user?.username || 'Client'}</strong>!</span>
          </div>
          <h1 className="hero-title animate-fade-in">
            Discover Your <br />
            <span className="text-gradient">Perfect Style</span>
          </h1>
          <p className="hero-subtitle animate-fade-in">
            Welcome back, <strong>{user?.username}</strong>! Connect with the best salons and stylists in Cameroon. Book instantly.
          </p>

          <div className="hero-search animate-fade-in">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search salons, styles, services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="btn btn-primary btn-lg search-btn" onClick={() => navigate('/booking')}>
              Book Now
            </button>
          </div>

          <div className="hero-stats animate-fade-in">
            <div className="stat-item">
              <span className="stat-value">{salons.length}</span>
              <span className="stat-label">Salons</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">
                {salons.reduce((acc, s) => acc + (s.hairdressers?.length || 0), 0)}
              </span>
              <span className="stat-label">Stylists</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">
                {salons.reduce((acc, s) => acc + (s.services?.length || 0), 0)}
              </span>
              <span className="stat-label">Services</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="category-tabs">
          <button className={`category-tab ${hairstyleFilter === 'all' ? 'category-active' : ''}`} onClick={() => setHairstyleFilter('all')}>
            <LayoutGrid size={16} /> All
          </button>
          <button className={`category-tab ${hairstyleFilter === 'hair' ? 'category-active' : ''}`} onClick={() => setHairstyleFilter('hair')}>
            <Scissors size={16} /> Hairstyle
          </button>
          <button className={`category-tab ${hairstyleFilter === 'nails' ? 'category-active' : ''}`} onClick={() => setHairstyleFilter('nails')}>
            <Sparkles size={16} /> Nails
          </button>
          <button className={`category-tab ${hairstyleFilter === 'piercing' ? 'category-active' : ''}`} onClick={() => setHairstyleFilter('piercing')}>
            <Star size={16} /> Piercing
          </button>
          <button className={`category-tab ${hairstyleFilter === 'makeup' ? 'category-active' : ''}`} onClick={() => setHairstyleFilter('makeup')}>
            <Palette size={16} /> Makeup
          </button>
          <button className={`category-tab ${hairstyleFilter === 'skincare' ? 'category-active' : ''}`} onClick={() => setHairstyleFilter('skincare')}>
            <Heart size={16} /> Skincare
          </button>
        </div>
      </section>

      {/* Hairstyle Portfolio Grid */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Inspiration & Styles</h2>
            <p className="section-subtitle">Discover our stylists' creations</p>
          </div>
        </div>

        {filteredHairstyles.length === 0 ? (
          <div className="empty-state">
            <p>No styles found for this category.</p>
          </div>
        ) : (
          <div className="hairstyles-grid">
            {filteredHairstyles.map((style, index) => {
              const salon = style.salon_details;
              const category = getPubCategory(style);
              return (
                <div
                  key={style._type ? `${style._type}_${style.id}` : style.id}
                  className="hairstyle-card card card-interactive animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => salon && navigate(`/salon/${salon.id}`)}
                >
                  <div className="hairstyle-card-image">
                    <img
                      src={style.media_url ? `${style.media_url}${style.media_url.includes('?') ? '&' : '?'}_cb=${style.updated_at || style.created_at || style.id}` : ''}
                      alt={style.title || 'Publication'}
                      loading="lazy"
                    />
                    <div className="hairstyle-card-overlay">
                      <span className="hairstyle-category-badge">
                        {category === 'hair' && 'Hairstyle'}
                        {category === 'nails' && 'Nails'}
                        {category === 'piercing' && 'Piercing'}
                        {category === 'makeup' && 'Makeup'}
                        {category === 'skincare' && 'Skincare'}
                      </span>
                    </div>
                  </div>
                  <div className="hairstyle-card-body">
                    <h3>{style.title}</h3>
                    {style.description && <p className="hairstyle-desc">{style.description}</p>}
                    {salon && (
                      <div className="hairstyle-salon-info">
                        <MapPin size={14} />
                        <span>{salon.name} - {salon.address}</span>
                      </div>
                    )}
                    <div className="hairstyle-card-footer">
                      <span className="hairstyle-stylist">
                        {style.hairdresser_details?.first_name 
                          ? `by ${style.hairdresser_details.first_name}` 
                          : salon?.name 
                            ? `by ${salon.name}` 
                            : 'by Stylist'}
                      </span>
                      <button className="btn btn-primary btn-sm">
                        View Salon
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Salons */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Popular Salons</h2>
            <p className="section-subtitle">The best salons near you</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/booking')}>
            View all <ArrowRight size={16} />
          </button>
        </div>

        <div className="salons-grid">
          {filteredSalons.length === 0 ? (
            <div className="empty-state">
              <p>No salons found.</p>
            </div>
          ) : (
            filteredSalons.slice(0, 3).map((salon, index) => (
              <div
                key={salon.id}
                className="salon-card card card-interactive animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/salon/${salon.id}`)}
              >
                <div className="salon-card-image">
                  {salon.image_url ? (
                    <img src={salon.image_url} alt={salon.name} loading="lazy" />
                  ) : (
                    <div className="salon-card-placeholder">
                      <Sparkles size={28} />
                    </div>
                  )}
                </div>
                <div className="salon-card-body">
                  <h3 className="salon-card-title">{salon.name}</h3>
                  <div className="salon-card-meta">
                    <MapPin size={14} />
                    <span>{salon.address || 'Address not available'}</span>
                  </div>
                  <div className="salon-card-footer">
                    <span className="salon-card-services">
                      {salon.services?.length || 0} Services
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/salon/${salon.id}`);
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
          <button className="quick-action-card" onClick={() => navigate('/booking')}>
            <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
              <CalendarPlus size={22} color="#7c3aed" />
            </div>
            <div>
              <h4>Book</h4>
              <p>Schedule an appointment</p>
            </div>
            <ChevronRight size={18} className="quick-action-arrow" />
          </button>
          <button className="quick-action-card" onClick={() => navigate('/appointments')}>
            <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
              <Clock size={22} color="#d97706" />
            </div>
            <div>
              <h4>My Bookings</h4>
              <p>Manage your appointments</p>
            </div>
            <ChevronRight size={18} className="quick-action-arrow" />
          </button>
          <button className="quick-action-card" onClick={() => navigate('/chats')}>
            <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)' }}>
              <MessageCircle size={22} color="#db2777" />
            </div>
            <div>
              <h4>Messages</h4>
              <p>Contact your stylists</p>
            </div>
            <ChevronRight size={18} className="quick-action-arrow" />
          </button>
        </div>
      </section>

      <ChatBot />
    </div>
  );
}