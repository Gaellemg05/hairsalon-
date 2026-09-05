import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Star, MapPin, Phone, ChevronLeft, Clock, Users, Image as ImageIcon, Video, Calendar, MessageCircle } from 'lucide-react';

export default function SalonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStylist, setSelectedStylist] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsData, setSlotsData] = useState(null);
  const [bookingMsg, setBookingMsg] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [step, setStep] = useState(1);
  const [filterMedia, setFilterMedia] = useState('all');

  useEffect(() => {
    const loadSalon = async () => {
      try {
        const data = await api.getSalon(id);
        setSalon(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadSalon();
  }, [id]);

  useEffect(() => {
    if (selectedStylist && bookingDate) {
      setLoadingSlots(true);
      setBookingTime('');
      api.getAvailableSlots(selectedStylist, bookingDate, selectedService)
        .then(data => {
          setSlotsData(data);
        })
        .catch(err => {
          console.error(err);
          setSlotsData(null);
        })
        .finally(() => setLoadingSlots(false));
    } else {
      setSlotsData(null);
    }
  }, [selectedStylist, bookingDate, selectedService]);

  const handleBook = async () => {
    setBookingMsg('');
    setBookingError('');
    try {
      await api.createAppointment({
        salon: salon.id,
        hairdresser: selectedStylist,
        service: selectedService,
        date: bookingDate,
        time: bookingTime,
        status: 'pending',
      });
      setBookingMsg('Appointment booked successfully!');
      setStep(1);
      setSelectedStylist('');
      setSelectedService('');
      setBookingDate('');
      setBookingTime('');
      setSlotsData(null);
    } catch (err) {
      let msg = 'Failed to book appointment.';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.error || parsed.detail || msg;
      } catch {
        if (err.message && !err.message.includes('object')) msg = err.message;
      }
      setBookingError(msg);
    }
  };

  if (loading) return <div className="page-loading">Loading salon...</div>;
  if (!salon) return <div className="page-error">Salon not found</div>;

  const filteredPublications = [
    ...(salon.publications || []).map(p => ({ ...p, _key: `pub_${p.id}`, _type: 'salon' })),
    ...(salon.hairstyle_publications || []).map(p => ({ ...p, _key: `hairstyle_${p.id}`, _type: 'hairstyle', media_type: 'image' })),
  ].filter(p => {
    if (filterMedia === 'all') return true;
    return p.media_type === filterMedia;
  });

  return (
    <div className="salon-page">
      <button className="btn btn-ghost back-btn" onClick={() => window.history.back()}>
        <ChevronLeft size={18} /> Back
      </button>

      {/* Hero Section */}
      <div className="salon-hero">
        {salon.image_url ? (
          <img src={salon.image_url} alt={salon.name} className="salon-hero-img" />
        ) : (
          <div className="salon-hero-placeholder">
            <Star size={48} color="white" />
          </div>
        )}
        <div className="salon-hero-overlay">
          <div className="salon-hero-badge">
            <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
            <span>Top Rated</span>
          </div>
          <h1>{salon.name}</h1>
          <div className="salon-hero-meta">
            {salon.address && <span><MapPin size={14} /> {salon.address}</span>}
            {salon.phone_number && <span><Phone size={14} /> {salon.phone_number}</span>}
          </div>
          <div className="salon-hero-stats">
            <div className="hero-stat">
              <strong>{salon.reviews?.length || 0}</strong> Reviews
            </div>
            <div className="hero-stat">
              <strong>{salon.services?.length || 0}</strong> Services
            </div>
            <div className="hero-stat">
              <strong>{salon.hairdressers?.length || 0}</strong> Stylists
            </div>
          </div>
        </div>
      </div>

      <div className="salon-content">
        {/* Description */}
        <div className="card">
          <p className="salon-description">{salon.description}</p>
        </div>

        {/* Portfolio / Gallery */}
        {(salon.publications?.length > 0 || salon.hairstyle_publications?.length > 0) && (
          <div className="card portfolio-card">
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <h3>Portfolio & Gallery</h3>
              <div className="portfolio-filters">
                <button
                  className={`filter-btn ${filterMedia === 'all' ? 'filter-active' : ''}`}
                  onClick={() => setFilterMedia('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filterMedia === 'image' ? 'filter-active' : ''}`}
                  onClick={() => setFilterMedia('image')}
                >
                  <ImageIcon size={14} /> Photos
                </button>
                <button
                  className={`filter-btn ${filterMedia === 'video' ? 'filter-active' : ''}`}
                  onClick={() => setFilterMedia('video')}
                >
                  <Video size={14} /> Videos
                </button>
              </div>
            </div>

            {filteredPublications.length === 0 ? (
              <p className="text-secondary">No media found.</p>
            ) : (
              <div className="portfolio-grid">
                {filteredPublications.map((pub) => (
                  <div key={pub._key} className="portfolio-item">
                    {pub.media_type === 'video' ? (
                      <video src={pub.media_url} controls className="portfolio-media" />
                    ) : (
                      <img src={pub.media_url} alt={pub.title || 'Portfolio'} className="portfolio-media" loading="lazy" />
                    )}
                    {(pub.title || pub.description) && (
                      <div className="portfolio-caption">
                        {pub.title && <h4>{pub.title}</h4>}
                        {pub.description && <p>{pub.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stylists Section */}
        {salon.hairdressers?.length > 0 && (
          <div className="card stylists-card">
            <h3>Our Stylists</h3>
            <div className="stylists-grid">
              {salon.hairdressers.map((hd) => (
                <div key={hd.id} className="stylist-card">
                  <div className="stylist-avatar">
                    {hd.profile_picture ? (
                      <img src={hd.profile_picture} alt={hd.first_name} />
                    ) : (
                      <span>{hd.first_name?.charAt(0) || hd.username?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="stylist-info">
                    <h4>{hd.first_name} {hd.last_name}</h4>
                    <p className="stylist-role">Stylist</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedStylist(hd.id);
                        setStep(2);
                        document.querySelector('.booking-card')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Book
                    </button>
                    {user?.role === 'client' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Send a message"
                        onClick={async () => {
                          try {
                            const chat = await api.findOrCreateChat({
                              client: user.id,
                              hairdresser: hd.id,
                              salon: salon.id,
                            });
                            navigate('/chats', { state: { chatId: chat.id } });
                          } catch { }
                        }}
                      >
                        <MessageCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Section */}
        {salon.services?.length > 0 && (
          <div className="card services-card">
            <h3>Services & Pricing</h3>
            <div className="services-list">
              {salon.services.map((svc) => (
                <div key={svc.id} className="service-item">
                  <div className="service-info">
                    <h4>{svc.name}</h4>
                    {svc.description && <p className="service-desc">{svc.description}</p>}
                    <div className="service-meta">
                      <Clock size={14} />
                      <span>{svc.duration} min</span>
                    </div>
                  </div>
                  <div className="service-price">
                    <span className="price">{svc.price.toLocaleString()} FCFA</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedService(svc.id);
                        setStep(3);
                        document.querySelector('.booking-card')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Section */}
        <div className="card booking-card">
          <h3>Book an Appointment</h3>

          {bookingMsg && <div className="success-msg">{bookingMsg}</div>}
          {bookingError && <div className="error-msg">{bookingError}</div>}

          <div className="step-indicators">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`step-dot ${step >= s ? 'step-dot-active' : ''}`}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="booking-form">
            {step === 1 && (
              <div className="form-group animate-fade-in">
                <label>Select Stylist</label>
                <select
                  className="form-control"
                  value={selectedStylist}
                  onChange={(e) => { setSelectedStylist(e.target.value); }}
                >
                  <option value="">-- Choose stylist --</option>
                  {salon.hairdressers?.map((hd) => (
                    <option key={hd.id} value={hd.id}>{hd.first_name} {hd.last_name}</option>
                  ))}
                </select>
              </div>
            )}

            {step === 2 && (
              <div className="form-group animate-fade-in">
                <label>Select Service</label>
                <select
                  className="form-control"
                  value={selectedService}
                  onChange={(e) => { setSelectedService(e.target.value); }}
                >
                  <option value="">-- Choose service --</option>
                  {salon.services?.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.name} - {svc.price.toLocaleString()} FCFA ({svc.duration} min)</option>
                  ))}
                </select>
              </div>
            )}

            {step === 3 && (
              <div className="form-row animate-fade-in">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="booking-summary animate-fade-in">
                <h4>Confirm Details</h4>
                <div className="summary-row">
                  <span>Stylist</span>
                  <strong>
                    {(() => {
                      const hd = salon.hairdressers?.find(h => h.id == selectedStylist);
                      return hd ? `${hd.first_name || ''} ${hd.last_name || ''}`.trim() : '—';
                    })()}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Service</span>
                  <strong>{salon.services?.find(s => s.id == selectedService)?.name || '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>Date & Time</span>
                  <strong>{bookingDate} at {bookingTime.slice(0, 5)}</strong>
                </div>
              </div>
            )}
          </form>

          <div className="form-actions">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => { setBookingError(''); setStep(step - 1); }}>Back</button>
            )}
            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (step === 1 && !selectedStylist) {
                    setBookingError('Please select a stylist.');
                    return;
                  }
                  if (step === 2 && !selectedService) {
                    setBookingError('Please select a service.');
                    return;
                  }
                  if (step === 3 && (!bookingDate || !bookingTime)) {
                    setBookingError('Please select both a date and a time.');
                    return;
                  }
                  setBookingError('');
                  setStep(step + 1);
                }}
              >
                Next
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleBook}>Confirm Booking</button>
            )}
          </div>
        </div>

        {/* Reviews */}
        {salon.reviews?.length > 0 && (
          <div className="card reviews-card">
            <h3>Reviews ({salon.reviews.length})</h3>
            <div className="reviews-list">
              {salon.reviews.map((rev) => (
                <div key={rev.id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer">
                      <div className="reviewer-avatar">
                        {rev.client_details?.first_name?.charAt(0) || 'C'}
                      </div>
                      <strong>{rev.client_details?.first_name || 'Client'}</strong>
                    </div>
                    <div className="rating-stars">
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </div>
                  </div>
                  <p className="review-text">{rev.comment}</p>
                  <p className="review-date">{new Date(rev.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
