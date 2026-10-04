import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getMediaUrl } from '../api';
import { useAuth } from '../auth';
import { Plus, Trash2, Edit3, X, Save, Calendar, MessageCircle, Image as ImageIcon, Video, Clock, Search, ArrowLeft, Send, Scissors, Paperclip, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Phone, User as UserIcon, User, Mail, Check, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react';

const MEDIA_TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
];

const CATEGORIES = [
  { value: 'hair', label: 'Hairstyle' },
  { value: 'nails', label: 'Nails' },
  { value: 'piercing', label: 'Piercing' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'skincare', label: 'Skincare' },
];

const TABS = [
  { id: 'publications', label: 'Portfolio', icon: ImageIcon },
  { id: 'appointments', label: 'Bookings', icon: Clock },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
];

const STATUS_COLORS = {
  pending: {
    bg: '#fef9c3',
    border: '#facc15',
    text: '#854d0e',
    dot: '#eab308',
    label: 'Pending',
  },
  completed: {
    bg: '#dcfce7',
    border: '#86efac',
    text: '#166534',
    dot: '#16a34a',
    label: 'Completed',
  },
  cancelled: {
    bg: '#fee2e2',
    border: '#fca5a5',
    text: '#991b1b',
    dot: '#dc2626',
    label: 'Cancelled',
  },
  confirmed: {
    bg: '#dbeafe',
    border: '#93c5fd',
    text: '#1e40af',
    dot: '#2563eb',
    label: 'Confirmed',
  },
};

const STATUS_STYLES = {
  pending: { label: 'Pending', className: 'badge-pending' },
  confirmed: { label: 'Confirmed', className: 'badge-confirmed' },
  completed: { label: 'Completed', className: 'badge-completed' },
  cancelled: { label: 'Cancelled', className: 'badge-cancelled' },
};

export default function HairdresserDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('publications');
  const [publications, setPublications] = useState([]);
  const [salon, setSalon] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPub, setEditingPub] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'hair', media_url: '', media_type: 'image' });
  const [pubFile, setPubFile] = useState(null);
  const [pubPreview, setPubPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Chat State
  const [chatTab, setChatTab] = useState('all');
  const [chatSearch, setChatSearch] = useState('');
  const [deleteConfirmChat, setDeleteConfirmChat] = useState(null);

  // Sync tab with URL search param ?tab=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['publications', 'appointments', 'calendar', 'messages'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const loadData = async () => {
    setLoading(true);
    try {
      let salonsData = await api.getSalons(user.id);
      if (salonsData.length === 0) {
        salonsData = await api.getSalonsByHairdresser(user.id);
      }
      const userSalon = salonsData[0] || null;
      setSalon(userSalon);

      const [pubs, salonPubs, appts, chats] = await Promise.all([
        api.getHairstyles(user.id),
        userSalon ? api.getSalonPublications(userSalon.id) : Promise.resolve([]),
        api.getAppointments(),
        api.getChats(),
      ]);

      const combinedPubs = [
        ...salonPubs.map(p => ({ ...p, _type: 'salon', _key: `salon_${p.id}` })),
        ...pubs.map(p => ({ ...p, _type: 'hairstyle', _key: `hairstyle_${p.id}` })),
      ];

      setPublications(combinedPubs);
      setAppointments(appts);
      setConversations(chats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const upcomingAppts = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const unreadCount = conversations.filter(c => c.unread_count > 0).length;

  const stats = [
    { label: 'Publications', value: publications.length, icon: ImageIcon, color: 'var(--primary)', bg: 'var(--primary-bg)' },
    { label: 'Upcoming', value: upcomingAppts.length, icon: Calendar, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Messages', value: unreadCount || conversations.length, icon: MessageCircle, color: 'var(--accent)', bg: 'var(--accent-bg)' },
  ];

  const startCreatePub = () => {
    setEditingPub(null);
    setFormData({ title: '', description: '', category: 'hair', media_url: '', media_type: 'image' });
    setPubFile(null);
    if (pubPreview) URL.revokeObjectURL(pubPreview);
    setPubPreview(null);
    setShowForm(true);
  };

  const startEditPub = (pub) => {
    setEditingPub(pub);
    setFormData({
      title: pub.title || '',
      description: pub.description || '',
      category: pub.category || 'hair',
      media_url: pub.media_url || '',
      media_type: pub.media_type || 'image',
    });
    setPubFile(null);
    if (pubPreview) URL.revokeObjectURL(pubPreview);
    setPubPreview(null);
    setShowForm(true);
  };

  const handleSavePub = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() && !pubFile && !formData.media_url.trim()) return;
    setSaving(true);
    try {
      const data = new FormData();
      if (formData.title) data.append('title', formData.title);
      if (formData.description !== undefined) data.append('description', formData.description || '');
      data.append('category', formData.category || 'hair');
      data.append('media_type', formData.media_type);
      if (pubFile) {
        data.append('media', pubFile);
      } else if (formData.media_url) {
        data.append('media_url', formData.media_url);
      }
      if (salon?.id) {
        data.append('salon', salon.id);
      }

      if (editingPub) {
        if (editingPub._type === 'salon') {
          await api.updateSalonPublication(editingPub.id, data);
        } else {
          await api.updateHairstyle(editingPub.id, data);
        }
      } else {
        await api.createHairstyle(data);
      }
      setShowForm(false);
      setEditingPub(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save publication');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePub = async (pub) => {
    if (!window.confirm('Delete this publication?')) return;
    try {
      if (pub._type === 'salon') {
        await api.deleteSalonPublication(pub.id);
      } else {
        await api.deleteHairstyle(pub.id);
      }
      setPublications((prev) => prev.filter((p) => (p._key ? p._key !== pub._key : p.id !== pub.id)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!selectedChat) return;
    let cancelled = false;
    handleRemoveImage();
    (async () => {
      try {
        const data = await api.getChatMessages(selectedChat.id);
        if (!cancelled) setMessages(data);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedChat]);

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedChat) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(selectedChat.id, newMessage.trim(), selectedImage);
      setMessages((m) => [...m, msg]);
      setNewMessage('');
      handleRemoveImage();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    setStatusUpdatingId(appointmentId);
    try {
      await api.updateAppointment(appointmentId, { status: newStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleStartChatWithClient = async (appt) => {
    try {
      const chat = await api.findOrCreateChat({
        client: appt.client,
        salon: appt.salon || salon?.id,
        hairdresser: user.id,
      });
      setSelectedChat(chat);
      setActiveTab('messages');
    } catch (err) {
      console.error('Failed to open chat:', err);
      setActiveTab('messages');
    }
  };

  const handleToggleArchive = async (e, chat) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.archiveChat(chat.id);
      const isArch = res.is_archived;
      setConversations((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, is_archived: isArch } : c))
      );
      if (selectedChat?.id === chat.id) {
        setSelectedChat((prev) => ({ ...prev, is_archived: isArch }));
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
  };

  const handleDeleteChat = async (chat) => {
    try {
      await api.deleteChat(chat.id);
      setConversations((prev) => prev.filter((c) => c.id !== chat.id));
      if (selectedChat?.id === chat.id) {
        setSelectedChat(null);
      }
      setDeleteConfirmChat(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Calendar calculations
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarMonth(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const appointmentsByDate = appointments.reduce((acc, appt) => {
    if (!appt.date) return acc;
    const dStr = appt.date.substring(0, 10);
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(appt);
    return acc;
  }, {});

  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1);
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7; // Monday start
  const prevMonthLastDay = new Date(calendarYear, calendarMonthIndex, 0).getDate();

  const calendarDays = [];
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevM = calendarMonthIndex === 0 ? 12 : calendarMonthIndex;
    const prevY = calendarMonthIndex === 0 ? calendarYear - 1 : calendarYear;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarDays.push({ dayNum, dateStr, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNum: d, dateStr, isCurrentMonth: true });
  }

  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextM = calendarMonthIndex === 11 ? 1 : calendarMonthIndex + 2;
    const nextY = calendarMonthIndex === 11 ? calendarYear + 1 : calendarYear;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNum: d, dateStr, isCurrentMonth: false });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDayAppointments = appointmentsByDate[selectedDate] || [];

  const formattedSelectedDate = (() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return selectedDate;
  })();

  const activeChatsCount = conversations.filter((c) => !c.is_archived).length;
  const archivedChatsCount = conversations.filter((c) => Boolean(c.is_archived)).length;

  const filteredDashboardChats = conversations.filter((c) => {
    const isArchived = Boolean(c.is_archived);
    if (chatTab === 'archived' && !isArchived) return false;
    if (chatTab === 'all' && isArchived) return false;
    if (!chatSearch.trim()) return true;
    const name = `${c.client_details?.first_name || ''} ${c.client_details?.last_name || ''} ${c.client_details?.username || ''}`.toLowerCase();
    const lastMsg = (c.last_message?.content || '').toLowerCase();
    const q = chatSearch.toLowerCase();
    return name.includes(q) || lastMsg.includes(q);
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="hairdresser-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user.first_name || user.username}</p>
        </div>
        {activeTab === 'publications' && (
          <button className="btn btn-primary" onClick={startCreatePub}>
            <Plus size={16} /> New Publication
          </button>
        )}
      </div>

      <div className="dashboard-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card card">
            <div className="stat-card-icon" style={{ background: stat.bg, color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value">{stat.value}</span>
              <span className="stat-card-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? 'dashboard-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'publications' && (
        <>
          {showForm && (
            <div className="pub-form-card card animate-fade-in">
              <div className="pub-form-header">
                <h3>{editingPub ? 'Edit Publication' : 'New Publication'}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditingPub(null); }}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSavePub} className="pub-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input className="form-control" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-control"
                      value={formData.category || 'hair'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Media Type</label>
                    <div className="form-row" style={{ marginTop: '0' }}>
                      {MEDIA_TYPES.map((m) => (
                        <button key={m.value} type="button" className={`pub-media-btn ${formData.media_type === m.value ? 'pub-media-active' : ''}`} onClick={() => setFormData({ ...formData, media_type: m.value })}>
                          {m.value === 'image' ? <ImageIcon size={16} /> : <Video size={16} />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Media File (Upload from PC)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="form-control"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setPubFile(file || null);
                      if (file) {
                        setPubPreview(URL.createObjectURL(file));
                        setFormData({ ...formData, media_type: file.type.startsWith('video') ? 'video' : 'image' });
                      } else {
                        setPubPreview(null);
                      }
                    }}
                  />
                </div>
                {pubPreview && (
                  <div style={{ marginTop: '12px' }}>
                    {formData.media_type === 'video' ? (
                      <video src={pubPreview} controls style={{ width: '100%', maxHeight: '200px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                    ) : (
                      <img src={pubPreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    )}
                  </div>
                )}
                <div className="form-actions" style={{ marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingPub(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Saving...' : editingPub ? 'Update' : 'Publish'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {publications.length === 0 && !showForm ? (
            <div className="empty-state">
              <ImageIcon size={40} />
              <h3>No publications yet</h3>
              <p>Share your first style to attract clients</p>
            </div>
          ) : (
            <div className="pub-grid">
              {publications.map((pub, idx) => (
                <div key={pub._key || pub.id} className="pub-card card animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="pub-card-media">
                    {pub.media_url ? (
                      pub.media_type === 'video' ? (
                        <video src={pub.media_url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={`${pub.media_url}${pub.media_url.includes('?') ? '&' : '?'}_cb=${pub.updated_at || pub.id}`} alt={pub.title} />
                      )
                    ) : (
                      <div className="pub-placeholder">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <span className="pub-badge" style={{ textTransform: 'capitalize' }}>
                      {CATEGORIES.find(c => c.value === pub.category)?.label || 'Hairstyle'} · {pub.media_type}
                    </span>
                  </div>
                  <div className="pub-card-body">
                    <h3 className="pub-title">{pub.title}</h3>
                    {pub.description && <p className="pub-desc">{pub.description}</p>}
                    <div className="pub-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEditPub(pub)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeletePub(pub)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'appointments' && (
        <div className="appt-section">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <h3>No appointments</h3>
              <p>You have no upcoming appointments</p>
            </div>
          ) : (
            <div className="appt-list">
              {appointments.map((appt, idx) => {
                const badge = STATUS_STYLES[appt.status] || STATUS_STYLES.pending;
                return (
                  <div key={appt.id} className="appt-card card animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="appt-card-header">
                      <div className="appt-card-title-area">
                        <div className="appt-card-icon">
                          <Scissors size={20} />
                        </div>
                        <div>
                          <h3>{appt.salon_details?.name || 'Salon'}</h3>
                          <p className="appt-service">{appt.service_details?.name} - {appt.service_details?.price?.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                    </div>
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
                        <MessageCircle size={15} />
                        <div>
                          <span className="appt-meta-label">Client</span>
                          <span className="appt-meta-value">{appt.client_details?.first_name || ''} {appt.client_details?.last_name || ''}</span>
                        </div>
                      </div>
                      <div className="appt-meta-item">
                        <User size={15} />
                        <div>
                          <span className="appt-meta-label">Stylist</span>
                          <span className="appt-meta-value">
                            {appt.hairdresser_details?.first_name ? `${appt.hairdresser_details.first_name} ${appt.hairdresser_details.last_name || ''}`.trim() : appt.hairdresser_details?.username || 'Stylist'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="hd-calendar-section animate-fade-in">
          {/* Header Bar: Navigation + Status Color Legend */}
          <div className="hd-calendar-header-bar">
            <div className="hd-calendar-nav-group">
              <button
                type="button"
                className="hd-nav-btn"
                onClick={prevMonth}
                title="Previous Month"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="hd-calendar-month-title">{monthName}</h2>
              <button
                type="button"
                className="hd-nav-btn"
                onClick={nextMonth}
                title="Next Month"
              >
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                className="hd-today-btn"
                onClick={goToToday}
              >
                Today
              </button>
            </div>

            {/* Status Legend (Pending=Yellow, Completed=Green, Cancelled=Red, Confirmed=Blue) */}
            <div className="hd-calendar-legend">
              <div className="hd-legend-item legend-pending">
                <span className="hd-legend-dot" />
                <span>Pending</span>
              </div>
              <div className="hd-legend-item legend-completed">
                <span className="hd-legend-dot" />
                <span>Completed</span>
              </div>
              <div className="hd-legend-item legend-cancelled">
                <span className="hd-legend-dot" />
                <span>Cancelled</span>
              </div>
              <div className="hd-legend-item legend-confirmed">
                <span className="hd-legend-dot" />
                <span>Confirmed</span>
              </div>
            </div>
          </div>

          {/* Two-Column Calendar Layout */}
          <div className="hd-calendar-layout">
            {/* Calendar Grid Card */}
            <div className="hd-calendar-card">
              <div className="hd-calendar-weekdays">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="hd-weekday-col">
                    {day}
                  </div>
                ))}
              </div>

              <div className="hd-calendar-grid">
                {calendarDays.map((cell) => {
                  const dayBookings = appointmentsByDate[cell.dateStr] || [];
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDate;
                  const hasBookings = dayBookings.length > 0;

                  return (
                    <div
                      key={cell.dateStr}
                      className={`hd-calendar-cell ${!cell.isCurrentMonth ? 'hd-cell-outside' : ''} ${isToday ? 'hd-cell-today' : ''} ${isSelected ? 'hd-cell-selected' : ''} ${hasBookings ? 'hd-cell-booked' : ''}`}
                      onClick={() => {
                        setSelectedDate(cell.dateStr);
                        if (!cell.isCurrentMonth) {
                          const [y, m] = cell.dateStr.split('-').map(Number);
                          setCalendarMonth(new Date(y, m - 1, 1));
                        }
                      }}
                    >
                      <div className="hd-cell-top">
                        <span className="hd-cell-day-num">{cell.dayNum}</span>
                        {isToday && <span className="hd-cell-badge">Today</span>}
                      </div>

                      <div className="hd-cell-bottom">
                        {hasBookings && (
                          <>
                            <div className="hd-cell-dots">
                              {dayBookings.slice(0, 4).map((b, idx) => (
                                <span
                                  key={b.id || idx}
                                  className={`hd-dot dot-${b.status || 'pending'}`}
                                  title={`${b.time} - ${b.status}`}
                                />
                              ))}
                              {dayBookings.length > 4 && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
                                  +{dayBookings.length - 4}
                                </span>
                              )}
                            </div>
                            <span className="hd-cell-count-text">
                              {dayBookings.length} {dayBookings.length === 1 ? 'booking' : 'bookings'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Bookings Detail View */}
            <div className="hd-day-bookings-card">
              <div className="hd-day-header">
                <div>
                  <h3 className="hd-day-title">{formattedSelectedDate}</h3>
                  <div className="hd-day-subtitle">
                    {selectedDayAppointments.length === 0
                      ? 'No appointments on this date'
                      : `${selectedDayAppointments.length} appointment${selectedDayAppointments.length > 1 ? 's' : ''} scheduled`}
                  </div>
                </div>
                {selectedDayAppointments.length > 0 && (
                  <span className="hd-day-count-badge">
                    {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'Booking' : 'Bookings'}
                  </span>
                )}
              </div>

              {selectedDayAppointments.length === 0 ? (
                <div className="hd-empty-day-state">
                  <Calendar size={44} strokeWidth={1.5} color="#94a3b8" />
                  <h4>No Appointments</h4>
                  <p>
                    There are no bookings on this date. Click on any highlighted date in the calendar to view its booking details.
                  </p>
                </div>
              ) : (
                <div className="hd-day-bookings-list">
                  {selectedDayAppointments.map((appt) => {
                    const statusCfg = STATUS_COLORS[appt.status] || STATUS_COLORS.pending;
                    const clientName = `${appt.client_details?.first_name || ''} ${appt.client_details?.last_name || ''}`.trim() || appt.client_details?.username || 'Client';
                    const clientInitial = clientName.charAt(0).toUpperCase();

                    return (
                      <div key={appt.id} className="hd-day-appt-card">
                        <div className="hd-appt-top">
                          <div className="hd-appt-time">
                            <Clock size={14} />
                            <span>{appt.time}</span>
                          </div>
                          <span
                            className="hd-status-badge"
                            style={{
                              backgroundColor: statusCfg.bg,
                              borderColor: statusCfg.border,
                              color: statusCfg.text,
                              border: `1px solid ${statusCfg.border}`,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: statusCfg.dot,
                                display: 'inline-block',
                              }}
                            />
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="hd-appt-client">
                          <div className="hd-client-avatar">
                            {appt.client_details?.profile_picture ? (
                              <img src={getMediaUrl(appt.client_details.profile_picture)} alt={clientName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              clientInitial
                            )}
                          </div>
                          <div className="hd-client-details">
                            <h4 className="hd-client-name">{clientName}</h4>
                            <div className="hd-client-meta">
                              {appt.client_details?.phone_number && (
                                <a href={`tel:${appt.client_details.phone_number}`} title="Call client">
                                  <Phone size={13} /> {appt.client_details.phone_number}
                                </a>
                              )}
                              {appt.client_details?.email && (
                                <a href={`mailto:${appt.client_details.email}`} title="Email client">
                                  <Mail size={13} /> {appt.client_details.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="hd-appt-service-info">
                          <div className="hd-service-title">
                            <Scissors size={15} color="var(--primary)" />
                            <span>{appt.service_details?.name || 'Hair Service'}</span>
                          </div>
                          <div className="hd-service-price">
                            {appt.service_details?.price ? `${appt.service_details.price.toLocaleString()} FCFA` : '—'}
                          </div>
                        </div>

                        <div className="hd-appt-actions">
                          {appt.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="hd-btn-confirm"
                                disabled={statusUpdatingId === appt.id}
                                onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              >
                                <Check size={14} /> Confirm
                              </button>
                              <button
                                type="button"
                                className="hd-btn-cancel"
                                disabled={statusUpdatingId === appt.id}
                                onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              >
                                <XCircle size={14} /> Cancel
                              </button>
                            </>
                          )}

                          {appt.status === 'confirmed' && (
                            <>
                              <button
                                type="button"
                                className="hd-btn-complete"
                                disabled={statusUpdatingId === appt.id}
                                onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              >
                                <CheckCircle size={14} /> Mark Completed
                              </button>
                              <button
                                type="button"
                                className="hd-btn-cancel"
                                disabled={statusUpdatingId === appt.id}
                                onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              >
                                <XCircle size={14} /> Cancel
                              </button>
                            </>
                          )}



                          <button
                            type="button"
                            className="hd-btn-chat"
                            onClick={() => handleStartChatWithClient(appt)}
                          >
                            <MessageCircle size={14} /> Message Client
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="dashboard-chats">
          {!selectedChat ? (
            <>
              <div className="search-bar">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="search-input"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                />
              </div>

              {/* Chat Tabs: All vs Archived */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${chatTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChatTab('all')}
                  style={{ borderRadius: '20px', padding: '6px 16px' }}
                >
                  All ({activeChatsCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${chatTab === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChatTab('archived')}
                  style={{ borderRadius: '20px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Archive size={14} /> Archived ({archivedChatsCount})
                </button>
              </div>

              {filteredDashboardChats.length === 0 ? (
                <div className="empty-state">
                  <MessageCircle size={40} />
                  <h3>
                    {chatTab === 'archived' ? 'No archived conversations' : chatSearch ? 'No matching conversations' : 'No conversations yet'}
                  </h3>
                  <p>
                    {chatTab === 'archived' ? 'Archived conversations will appear here' : 'Clients will message you after booking appointments'}
                  </p>
                </div>
              ) : (
                <div className="conversations-list">
                  {filteredDashboardChats.map((chat, idx) => (
                    <div
                      key={chat.id}
                      className="conversation-card card"
                      onClick={() => setSelectedChat(chat)}
                      style={{
                        animationDelay: `${idx * 0.04}s`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div className="conv-avatar">
                          {chat.client_details?.first_name?.charAt(0) || chat.client_details?.username?.charAt(0) || '?'}
                        </div>
                        <div className="conv-content" style={{ flex: 1, minWidth: 0 }}>
                          <div className="conv-row1">
                            <h4>{chat.client_details?.first_name || ''} {chat.client_details?.last_name || chat.client_details?.username || ''}</h4>
                            <span className="conv-time">
                              {chat.last_message ? new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="conv-preview" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chat.last_message ? `${chat.last_message.sender}: ${chat.last_message.content?.substring(0, 60)}` : 'No messages yet'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                        {chat.unread_count > 0 && <div className="conv-dot" />}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title={chat.is_archived ? 'Unarchive conversation' : 'Archive conversation'}
                          onClick={(e) => handleToggleArchive(e, chat)}
                          style={{ color: 'var(--text-secondary)', padding: '6px 8px' }}
                        >
                          {chat.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmChat(chat);
                          }}
                          style={{ color: 'var(--danger, #ef4444)', padding: '6px 8px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="chat-view">
              <div className="chat-header">
                <button className="btn btn-ghost" onClick={() => setSelectedChat(null)}>
                  <ArrowLeft size={20} />
                </button>
                <div className="chat-header-info" style={{ flex: 1 }}>
                  <h2>{selectedChat.client_details?.first_name} {selectedChat.client_details?.last_name}</h2>
                  <p>{selectedChat.salon_details?.name}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title={selectedChat.is_archived ? 'Unarchive conversation' : 'Archive conversation'}
                    onClick={(e) => handleToggleArchive(e, selectedChat)}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {selectedChat.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="Delete conversation"
                    onClick={() => setDeleteConfirmChat(selectedChat)}
                    style={{ color: 'var(--danger, #ef4444)' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-chat-state">
                    <p>Start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender === user.id;
                    const mediaUrl = msg.image_url || msg.image;
                    return (
                      <div key={msg.id} className={`message-bubble ${isMe ? 'message-mine' : 'message-theirs'}`}>
                        <div className="message-sender">{msg.sender_details?.first_name || msg.sender}</div>
                        {mediaUrl && (
                          <div style={{ marginBottom: msg.content ? '8px' : '0', marginTop: '4px' }}>
                            <img
                              src={mediaUrl}
                              alt="Attachment"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '280px',
                                borderRadius: '8px',
                                objectFit: 'contain',
                                display: 'block',
                                cursor: 'pointer',
                                background: '#00000010'
                              }}
                              onClick={() => window.open(mediaUrl, '_blank')}
                            />
                          </div>
                        )}
                        {msg.content && <div className="message-content">{msg.content}</div>}
                        <div className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {imagePreview && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 16px',
                  background: 'var(--bg-main)',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 500, display: 'block' }}>{selectedImage?.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {selectedImage?.size ? `${(selectedImage.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                </div>
              )}

              <form className="chat-input-bar" onSubmit={handleSend}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Browse picture from PC"
                  onClick={handleImageButtonClick}
                >
                  <ImageIcon size={20} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Attach picture"
                  onClick={handleImageButtonClick}
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="chat-input"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={sending || (!newMessage.trim() && !selectedImage)}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Delete Conversation Confirmation Modal */}
      {deleteConfirmChat && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setDeleteConfirmChat(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              background: 'var(--card-bg, #ffffff)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--danger, #ef4444)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Delete Conversation?</h3>
            </div>
            <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
              This conversation will be permanently removed from your chat list.
              <br /><br />
              <strong style={{ color: 'var(--text-primary, #0f172a)' }}>Note:</strong> Only if both parties delete the conversation will it be completely erased from the database. If the client has not deleted it, their messages remain preserved for them.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmChat(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleDeleteChat(deleteConfirmChat)}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
