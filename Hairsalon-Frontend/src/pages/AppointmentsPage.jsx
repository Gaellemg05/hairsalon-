import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getMediaUrl } from '../api';
import { Calendar, Clock, X, ChevronRight, MapPin, Scissors, CheckCircle2, XCircle, Clock3, CircleDot, MessageCircle, User, Phone, Mail, Star } from 'lucide-react';
import { useAuth } from '../auth';

const STATUS_CONFIG = {
  pending: { icon: Clock3, label: 'Pending', className: 'badge-pending' },
  confirmed: { icon: CheckCircle2, label: 'Confirmed', className: 'badge-confirmed' },
  completed: { icon: CircleDot, label: 'Completed', className: 'badge-completed' },
  cancelled: { icon: XCircle, label: 'Cancelled', className: 'badge-cancelled' },
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState({ show: false, appt: null });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      try {
        const data = await api.getAppointments();
        setAppointments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

  const handleSubmitReview = async () => {
    const appt = reviewModal.appt;
    if (!appt) return;
    setSubmittingReview(true);
    try {
      await api.createReview({ salon: appt.salon, appointment: appt.id, rating: reviewRating, comment: reviewComment });
      setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, review: { id: 0, rating: reviewRating, comment: reviewComment } } : a));
      setReviewModal({ show: false, appt: null });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.updateAppointment(id, { status: 'cancelled' });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter((a) => a.status === filter);

  return (
    <div className="appointments-page">
      <header className="page-header">
        <h1>My Appointments</h1>
        <p>Welcome, <strong>{user?.first_name || user?.username}</strong> — manage your upcoming and past visits</p>
      </header>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="empty-state">
          <Calendar size={40} color="var(--text-tertiary)" />
          <h3>No appointments yet</h3>
          {user?.role !== 'hairdresser' && (
            <>
              <p style={{ color: 'var(--text-secondary)' }}>Book your first visit now</p>
              <button className="btn btn-primary" onClick={() => navigate('/booking')}>
                Browse Salons
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="appt-filters">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((f) => (
              <button
                key={f}
                className={`appt-filter-btn ${filter === f ? 'appt-filter-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
              </button>
            ))}
          </div>

          <div className="appointments-list">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <p>No {filter !== 'all' ? filter : ''} appointments found.</p>
              </div>
            ) : (
              filtered.map((appt, idx) => {
                const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <div
                    key={appt.id}
                    className="appt-card card animate-fade-in"
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <div className="appt-card-header">
                      <div className="appt-card-title-area">
                        <div className="appt-card-icon">
                          <Scissors size={18} />
                        </div>
                        <div>
                          <h3>{appt.salon_details?.name || 'Salon'}</h3>
                          <p className="appt-service">
                            {appt.service_details?.name} - {appt.service_details?.price?.toLocaleString()} FCFA
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${statusCfg.className}`}>
                        <StatusIcon size={13} />
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="appt-card-body">
                      <div className="appt-meta-grid">
                        <div className="appt-meta-item">
                          <Calendar size={15} />
                          <div>
                            <span className="appt-meta-label">Date</span>
                            <span className="appt-meta-value">{appt.date}</span>
                          </div>
                        </div>
                        <div className="appt-meta-item">
                          <Clock size={15} />
                          <div>
                            <span className="appt-meta-label">Time</span>
                            <span className="appt-meta-value">{appt.time}</span>
                          </div>
                        </div>
                        <div className="appt-meta-item">
                          <MapPin size={15} />
                          <div>
                            <span className="appt-meta-label">Stylist</span>
                            <span className="appt-meta-value">
                              {appt.hairdresser_details?.first_name ? `${appt.hairdresser_details.first_name} ${appt.hairdresser_details.last_name || ''}`.trim() : appt.hairdresser_details?.username || 'Stylist'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {user?.role === 'hairdresser' && appt.client_details && (
                      <div className="appt-client-info" style={{ borderTop: '1px solid var(--border-light)', padding: '16px 0 0', marginTop: '8px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} /> Client Info
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="stylist-avatar" style={{ width: '40px', height: '40px', fontSize: '16px', flexShrink: 0, background: 'var(--primary-light)' }}>
                            {appt.client_details.profile_picture
                              ? <img src={getMediaUrl(appt.client_details.profile_picture)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              : <span>{appt.client_details.first_name?.charAt(0) || appt.client_details.username?.charAt(0)}</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '14px' }}>{appt.client_details.first_name ? `${appt.client_details.first_name} ${appt.client_details.last_name || ''}`.trim() : appt.client_details.username}</strong>
                            {appt.client_details.phone_number && (
                              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={11} /> {appt.client_details.phone_number}
                              </p>
                            )}
                            {appt.client_details.email && (
                              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Mail size={11} /> {appt.client_details.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="appt-card-actions">
                      {user?.role !== 'hairdresser' && (appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(appt.id)}>
                          <X size={14} /> Cancel
                        </button>
                      )}
                      {user?.role === 'hairdresser' && (appt.hairdresser === user?.id || appt.hairdresser_details?.id === user?.id) && appt.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={async () => {
                          await api.updateAppointment(appt.id, { status: 'confirmed' });
                          setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status: 'confirmed' } : a));
                        }}>
                          <CheckCircle2 size={14} /> Confirm
                        </button>
                      )}
                      {user?.role === 'hairdresser' && (appt.hairdresser === user?.id || appt.hairdresser_details?.id === user?.id) && appt.status === 'confirmed' && (
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          await api.updateAppointment(appt.id, { status: 'completed' });
                          setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status: 'completed' } : a));
                        }}>
                          <CheckCircle2 size={14} /> Complete
                        </button>
                      )}
                      {user?.role === 'hairdresser' && !(appt.hairdresser === user?.id || appt.hairdresser_details?.id === user?.id) && (
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> Assigned to {appt.hairdresser_details?.first_name || appt.hairdresser_details?.username || 'Stylist'}
                        </span>
                      )}
                      {user?.role === 'client' && appt.status === 'completed' && !appt.review && (
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          setReviewModal({ show: true, appt });
                          setReviewRating(5);
                          setReviewComment('');
                        }}>
                          <Star size={14} /> Leave Review
                        </button>
                      )}
                      {user?.role === 'client' && appt.status === 'completed' && appt.review && (
                        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={14} style={{ color: '#f59e0b' }} /> {appt.review.rating}/5
                        </span>
                      )}
                      {(
                        (user?.role === 'hairdresser' && appt.client_details) ||
                        (user?.role === 'client' && appt.hairdresser_details)
                      ) && (
                        <button className="btn btn-secondary btn-sm" onClick={async () => {
                          try {
                            const chat = await api.findOrCreateChat({
                              client: user.role === 'client' ? user.id : appt.client_details.id,
                              hairdresser: user.role === 'hairdresser' ? user.id : appt.hairdresser,
                              salon: appt.salon,
                            });
                            navigate('/chats', { state: { chatId: chat.id } });
                          } catch { }
                        }}>
                          <MessageCircle size={14} /> Message
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      {reviewModal.show && (
        <div className="modal-overlay" onClick={() => setReviewModal({ show: false, appt: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Leave a Review</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setReviewModal({ show: false, appt: null })}><X size={18} /></button>
            </div>
            {reviewModal.appt && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Rate your experience at <strong>{reviewModal.appt.salon_details?.name}</strong>
              </p>
            )}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}>
                  <Star size={36} fill={star <= reviewRating ? '#f59e0b' : 'none'} color={star <= reviewRating ? '#f59e0b' : 'var(--border-color)'} />
                </button>
              ))}
            </div>
            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea className="form-control" rows="3" placeholder="Share your experience..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            </div>
            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setReviewModal({ show: false, appt: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
