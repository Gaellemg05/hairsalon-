import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Plus, Trash2, Edit3, X, Save, Calendar, MessageCircle, Image as ImageIcon, Video, Clock, Search, ArrowLeft, Send, Scissors, Paperclip } from 'lucide-react';

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
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
];

const STATUS_STYLES = {
  pending: { label: 'Pending', className: 'badge-pending' },
  confirmed: { label: 'Confirmed', className: 'badge-confirmed' },
  completed: { label: 'Completed', className: 'badge-completed' },
  cancelled: { label: 'Cancelled', className: 'badge-cancelled' },
};

export default function HairdresserDashboard() {
  const { user } = useAuth();
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
                <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  <div className="form-group">
                    <label>Or Media URL</label>
                    <input className="form-control" placeholder="https://..." value={formData.media_url} onChange={(e) => setFormData({ ...formData, media_url: e.target.value })} />
                  </div>
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

      {activeTab === 'messages' && (
        <div className="dashboard-chats">
          {!selectedChat ? (
            <>
              <div className="search-bar">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Search conversations..." className="search-input" />
              </div>
              {conversations.length === 0 ? (
                <div className="empty-state">
                  <MessageCircle size={40} />
                  <h3>No conversations</h3>
                  <p>Clients will message you after booking</p>
                </div>
              ) : (
                <div className="conversations-list">
                  {conversations.map((chat, idx) => (
                    <div key={chat.id} className="conversation-card card" onClick={() => setSelectedChat(chat)} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="conv-avatar">
                        {chat.client_details?.first_name?.charAt(0) || chat.client_details?.username?.charAt(0) || '?'}
                      </div>
                      <div className="conv-content">
                        <div className="conv-row1">
                          <h4>{chat.client_details?.first_name || ''} {chat.client_details?.last_name || ''}</h4>
                          <span className="conv-time">{chat.last_message ? new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="conv-preview">{chat.last_message ? `${chat.last_message.sender}: ${chat.last_message.content?.substring(0, 60)}` : 'No messages yet'}</p>
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
                <div className="chat-header-info">
                  <h2>{selectedChat.client_details?.first_name} {selectedChat.client_details?.last_name}</h2>
                  <p>{selectedChat.salon_details?.name}</p>
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
    </div>
  );
}
