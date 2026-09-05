import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Store, Scissors, Users, Image, Clock, Plus, X, Save, Trash2, Edit3, ChevronDown, MapPin, Phone, Mail, AlertCircle, Zap } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalonManagerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [hairdressers, setHairdressers] = useState([]);
  const [allHairdressers, setAllHairdressers] = useState([]);
  const [publications, setPublications] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPubForm, setShowPubForm] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);
  const [editPubId, setEditPubId] = useState(null);

  const [salonForm, setSalonForm] = useState({ name: '', address: '', phone_number: '', email: '', description: '', image_url: '' });
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', duration: '', category: 'hair' });
  const [pubForm, setPubForm] = useState({ title: '', description: '', category: 'hair', media: null, media_type: 'image' });
  const [availForm, setAvailForm] = useState({ hairdresser_id: '', day_of_week: 0, start_time: '09:00', end_time: '17:00' });
  const [selectedHairdresser, setSelectedHairdresser] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operator, setOperator] = useState('momo');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let salonsData = await api.getSalons(user.id);
        if (salonsData.length === 0) {
          salonsData = await api.getSalonsByHairdresser(user.id);
        }
        if (salonsData.length > 0) {
          const s = salonsData[0];
          setSalon(s);
          setSalonForm({ name: s.name, address: s.address || '', phone_number: s.phone_number || '', email: s.email || '', description: s.description || '', image_url: s.image_url || '' });
          const [svcs, hds, pubs] = await Promise.all([
            api.getServices(s.id),
            api.getUsersByRole('hairdresser'),
            api.getSalonPublications(s.id),
          ]);
          setServices(svcs);
          setHairdressers(s.hairdressers || []);
          setAllHairdressers(hds.filter((h) => !(s.hairdressers || []).find((sh) => sh.id === h.id)));
          setPublications(pubs);
          if (s.hairdressers?.length > 0) {
            setSelectedHairdresser(s.hairdressers[0].id);
            const avs = await api.getAvailabilities(s.hairdressers[0].id);
            setAvailabilities(avs);
          }
        }
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  useEffect(() => {
    if (tab === 'boost' && salon) {
      api.getSubscriptionTransactions(salon.id).then(setTransactions).catch(() => {});
    }
  }, [tab, salon]);

  const handleCreateSalon = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const s = await api.createSalon(salonForm);
      setSalon(s);
      setSalonForm({ name: s.name, address: s.address || '', phone_number: s.phone_number || '', email: s.email || '', description: s.description || '', image_url: s.image_url || '' });
    } catch (err) {
      setError('Failed to create salon');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSalon = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const s = await api.updateSalon(salon.id, salonForm);
      setSalon(s);
    } catch (err) {
      setError('Failed to update salon');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = { ...serviceForm, salon: salon.id, price: parseFloat(serviceForm.price), duration: parseInt(serviceForm.duration) };
      if (editServiceId) {
        const updated = await api.updateService(editServiceId, data);
        setServices(services.map((s) => (s.id === editServiceId ? updated : s)));
      } else {
        const created = await api.createService(data);
        setServices([...services, created]);
      }
      setServiceForm({ name: '', description: '', price: '', duration: '', category: 'hair' });
      setShowServiceForm(false);
      setEditServiceId(null);
    } catch (err) {
      setError('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.deleteService(id);
      setServices(services.filter((s) => s.id !== id));
    } catch (err) {
      setError('Failed to delete service');
    }
  };

  const refreshHairdressers = async () => {
    const salonsData = await api.getSalons(user.id);
    if (salonsData.length > 0) {
      setHairdressers(salonsData[0].hairdressers || []);
      const hds = await api.getUsersByRole('hairdresser');
      setAllHairdressers(hds.filter((h) => !(salonsData[0].hairdressers || []).find((sh) => sh.id === h.id)));
    }
  };

  const handleAddHairdresser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const hId = e.target.hairdresser_id.value;
      if (!hId) return;
      await api.addHairdresser(salon.id, parseInt(hId));
      await refreshHairdressers();
    } catch (err) {
      setError('Failed to add hairdresser');
    }
  };

  const handleRemoveHairdresser = async (hairdresserId) => {
    if (!window.confirm('Remove this hairdresser from the salon?')) return;
    setError('');
    try {
      await api.removeHairdresser(salon.id, hairdresserId);
      await refreshHairdressers();
    } catch (err) {
      setError('Failed to remove hairdresser');
    }
  };

  const handleSavePublication = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('salon', salon.id);
      formData.append('title', pubForm.title);
      formData.append('description', pubForm.description);
      formData.append('category', pubForm.category || 'hair');
      formData.append('media_type', pubForm.media_type);
      if (pubForm.media) {
        formData.append('media', pubForm.media);
      }
      if (editPubId) {
        await api.updateSalonPublication(editPubId, formData);
      } else {
        await api.createSalonPublication(formData);
      }
      setPubForm({ title: '', description: '', category: 'hair', media: null, media_type: 'image' });
      setShowPubForm(false);
      setEditPubId(null);
      const pubs = await api.getSalonPublications(salon.id);
      setPublications(pubs);
    } catch (err) {
      setError('Failed to save publication');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePublication = async (id) => {
    if (!window.confirm('Delete this publication?')) return;
    try {
      await api.deleteSalonPublication(id);
      setPublications(publications.filter((p) => p.id !== id));
    } catch (err) {
      setError('Failed to delete publication');
    }
  };

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    setError('');
    const hId = selectedHairdresser || availForm.hairdresser_id;
    if (!hId) {
      setError('Please select a stylist first.');
      return;
    }
    if (!availForm.start_time || !availForm.end_time) {
      setError('Please provide both Start time and End time.');
      return;
    }
    if (availForm.start_time >= availForm.end_time) {
      setError('Start time must be before End time.');
      return;
    }
    try {
      await api.createAvailability({
        hairdresser: parseInt(hId),
        day_of_week: parseInt(availForm.day_of_week),
        start_time: availForm.start_time,
        end_time: availForm.end_time,
      });
      const avs = await api.getAvailabilities(hId);
      setAvailabilities(avs);
    } catch (err) {
      setError('Failed to add availability slot.');
    }
  };

  const handleApplyPreset = async (type) => {
    const hId = selectedHairdresser;
    if (!hId) return;
    setError('');
    try {
      let slots = [];
      if (type === 'standard') {
        // Mon-Sat 09:00 to 18:00
        for (let day = 0; day <= 5; day++) {
          slots.push({ day_of_week: day, start_time: '09:00', end_time: '18:00' });
        }
      } else if (type === 'weekdays') {
        // Mon-Fri 09:00 to 17:00
        for (let day = 0; day <= 4; day++) {
          slots.push({ day_of_week: day, start_time: '09:00', end_time: '17:00' });
        }
      } else if (type === 'clear') {
        slots = [];
      }
      await api.bulkSetAvailability(hId, slots);
      const avs = await api.getAvailabilities(hId);
      setAvailabilities(avs);
    } catch (err) {
      setError('Failed to apply schedule preset.');
    }
  };

  const handleDeleteAvailability = async (id) => {
    try {
      await api.deleteAvailability(id);
      setAvailabilities(availabilities.filter((a) => a.id !== id));
    } catch (err) {
      setError('Failed to delete availability');
    }
  };

  const handleHairdresserChange = async (hId) => {
    setSelectedHairdresser(hId);
    setAvailForm(prev => ({ ...prev, hairdresser_id: hId }));
    try {
      const avs = await api.getAvailabilities(hId);
      setAvailabilities(avs);
    } catch { }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  const isManager = salon?.manager === user.id || salon?.manager?.id === user.id;

  const TABS = [
    { key: 'info', icon: Store, label: 'Salon Info' },
    { key: 'services', icon: Scissors, label: 'Services' },
    { key: 'stylists', icon: Users, label: 'Stylists' },
    { key: 'publications', icon: Image, label: 'Publications' },
    { key: 'schedule', icon: Clock, label: 'Schedule' },
    { key: 'boost', icon: Zap, label: 'Boost' },
  ];

  if (!salon) {
    return (
      <div className="profile-page" style={{ maxWidth: '600px' }}>
        <header className="page-header">
          <h1>Register Your Salon</h1>
          <p>Fill in the details to create your salon profile</p>
        </header>
        {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
        <form onSubmit={handleCreateSalon} className="profile-card card" style={{ padding: '28px' }}>
          <div className="profile-form">
            <div className="form-group">
              <label>Salon Name *</label>
              <input className="form-control" required value={salonForm.name} onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Address *</label>
              <input className="form-control" required value={salonForm.address} onChange={(e) => setSalonForm({ ...salonForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={salonForm.phone_number} onChange={(e) => setSalonForm({ ...salonForm, phone_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={salonForm.email} onChange={(e) => setSalonForm({ ...salonForm, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" rows="3" value={salonForm.description} onChange={(e) => setSalonForm({ ...salonForm, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input className="form-control" placeholder="https://..." value={salonForm.image_url} onChange={(e) => setSalonForm({ ...salonForm, image_url: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              <Store size={18} /> {saving ? 'Creating...' : 'Create Salon'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1><Store size={24} /> {salon.name}</h1>
        <p>{isManager ? 'Manage your salon profile, services, and team' : `You work at ${salon.name}`}</p>
      </header>

      {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

      {!isManager && (
        <div className="profile-card card" style={{ padding: '28px' }}>
          {salon.image_url && <img src={salon.image_url} alt={salon.name} style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '16px' }} />}
          <h2 style={{ margin: '0 0 8px' }}>{salon.name}</h2>
          {salon.description && <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{salon.description}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            {salon.address && <div><MapPin size={14} /> {salon.address}</div>}
            {salon.phone_number && <div><Phone size={14} /> {salon.phone_number}</div>}
            {salon.email && <div><Mail size={14} /> {salon.email}</div>}
          </div>
          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            Only the salon manager can edit this information.
          </p>
        </div>
      )}

      {isManager && (
        <div className="dashboard-tabs" style={{ marginBottom: '24px' }}>
          {TABS.map((t) => (
            <button key={t.key} className={`dashboard-tab ${tab === t.key ? 'dashboard-tab-active' : ''}`} onClick={() => setTab(t.key)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {isManager && tab === 'info' && (
        <form onSubmit={handleUpdateSalon} className="profile-card card" style={{ padding: '28px' }}>
          <div className="profile-form">
            <div className="form-group">
              <label>Salon Name</label>
              <input className="form-control" required value={salonForm.name} onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label><MapPin size={14} /> Address</label>
              <input className="form-control" required value={salonForm.address} onChange={(e) => setSalonForm({ ...salonForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label><Phone size={14} /> Phone</label>
                <input className="form-control" value={salonForm.phone_number} onChange={(e) => setSalonForm({ ...salonForm, phone_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label><Mail size={14} /> Email</label>
                <input type="email" className="form-control" value={salonForm.email} onChange={(e) => setSalonForm({ ...salonForm, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" rows="4" value={salonForm.description} onChange={(e) => setSalonForm({ ...salonForm, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input className="form-control" placeholder="https://..." value={salonForm.image_url} onChange={(e) => setSalonForm({ ...salonForm, image_url: e.target.value })} />
              {salonForm.image_url && <img src={salonForm.image_url} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginTop: '8px' }} />}
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {isManager && tab === 'services' && (
        <div className="profile-card card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Services ({services.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowServiceForm(!showServiceForm); setEditServiceId(null); setServiceForm({ name: '', description: '', price: '', duration: '', category: 'hair' }); }}>
              <Plus size={16} /> Add Service
            </button>
          </div>

          {showServiceForm && (
            <form onSubmit={handleSaveService} className="profile-form" style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Name *</label>
                  <input className="form-control" required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}>
                    <option value="hair">Coiffure</option>
                    <option value="nails">Ongles</option>
                    <option value="piercing">Piercing</option>
                    <option value="makeup">Makeup</option>
                    <option value="skincare">Soins</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows="2" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Price (FCFA) *</label>
                  <input type="number" className="form-control" required min="0" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Duration (min) *</label>
                  <input type="number" className="form-control" required min="5" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowServiceForm(false); setEditServiceId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {editServiceId ? 'Update' : 'Add'} Service
                </button>
              </div>
            </form>
          )}

          {services.length === 0 ? (
            <div className="empty-state"><p>No services yet. Add your first service.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {services.map((svc) => (
                <div key={svc.id} className="service-item" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>{svc.name}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{svc.description}</p>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{svc.category} · {svc.duration} min</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{svc.price?.toLocaleString()} FCFA</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditServiceId(svc.id); setServiceForm({ name: svc.name, description: svc.description || '', price: svc.price.toString(), duration: svc.duration.toString(), category: svc.category }); setShowServiceForm(true); }}>
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteService(svc.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isManager && tab === 'stylists' && (
        <div className="profile-card card" style={{ padding: '28px' }}>
          <h3 style={{ marginTop: 0 }}>Current Stylists ({hairdressers.length})</h3>
          {hairdressers.length === 0 ? (
            <div className="empty-state"><p>No stylists assigned yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {hairdressers.map((h) => {
                const isOwner = h.id === user.id;
                return (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="stylist-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                        {h.first_name?.charAt(0) || h.username?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{h.first_name ? `${h.first_name} ${h.last_name || ''}`.trim() : h.username}</strong>
                          {isOwner && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px 8px', borderRadius: '999px' }}>
                              You · Owner
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{h.email}</p>
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: isOwner ? 'var(--text-tertiary)' : 'var(--danger)', cursor: isOwner ? 'not-allowed' : 'pointer' }}
                      disabled={isOwner}
                      title={isOwner ? 'You cannot remove yourself' : 'Remove from salon'}
                      onClick={() => !isOwner && handleRemoveHairdresser(h.id)}
                    >
                      <X size={14} /> {isOwner ? 'Owner' : 'Remove'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <h4 style={{ marginBottom: '12px' }}>Add Stylist</h4>
          {allHairdressers.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No other hairdressers are registered on the platform yet. When new hairdressers join, you'll be able to add them here.
            </p>
          ) : (
            <form onSubmit={handleAddHairdresser} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select name="hairdresser_id" className="form-control" required>
                  <option value="">Select a hairdresser...</option>
                  {allHairdressers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.first_name ? `${h.first_name} ${h.last_name || ''}`.trim() : h.username} ({h.email})
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm"><Plus size={16} /> Add</button>
            </form>
          )}
        </div>
      )}

      {isManager && tab === 'publications' && (
        <div className="profile-card card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Publications ({publications.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditPubId(null); setPubForm({ title: '', description: '', category: 'hair', media: null, media_type: 'image' }); setShowPubForm(!showPubForm); }}>
              <Plus size={16} /> Add Photo
            </button>
          </div>

          {showPubForm && (
            <form onSubmit={handleSavePublication} className="profile-form" style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div className="form-group">
                <label>Title</label>
                <input className="form-control" value={pubForm.title} onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows="2" value={pubForm.description} onChange={(e) => setPubForm({ ...pubForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Category *</label>
                  <select className="form-control" value={pubForm.category || 'hair'} onChange={(e) => setPubForm({ ...pubForm, category: e.target.value })}>
                    <option value="hair">Hairstyle</option>
                    <option value="nails">Nails</option>
                    <option value="piercing">Piercing</option>
                    <option value="makeup">Makeup</option>
                    <option value="skincare">Skincare</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="form-control" value={pubForm.media_type} onChange={(e) => setPubForm({ ...pubForm, media_type: e.target.value })}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Media File {editPubId ? '(Optional to change)' : '*'}</label>
                <input type="file" accept="image/*,video/*" className="form-control" required={!editPubId} onChange={(e) => setPubForm({ ...pubForm, media: e.target.files[0] })} />
              </div>
              {pubForm.media && pubForm.media_type === 'image' && (
                <img src={URL.createObjectURL(pubForm.media)} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginTop: '8px' }} />
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPubForm(false); setEditPubId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {editPubId ? 'Update' : 'Add'}</button>
              </div>
            </form>
          )}

          {publications.length === 0 ? (
            <div className="empty-state"><p>No publications yet. Showcase your salon!</p></div>
          ) : (
            <div className="portfolio-grid">
              {publications.map((pub) => (
                <div key={pub.id} className="portfolio-item">
                  {pub.media_type === 'video' ? (
                    <video src={pub.media_url} controls className="portfolio-media" />
                  ) : (
                    <img src={pub.media_url} alt={pub.title || 'Photo'} className="portfolio-media" />
                  )}
                  <div className="portfolio-caption" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      {pub.title && <h4>{pub.title}</h4>}
                      {pub.description && <p>{pub.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditPubId(pub.id); setPubForm({ title: pub.title || '', description: pub.description || '', category: pub.category || 'hair', media: null, media_type: pub.media_type || 'image' }); setShowPubForm(true); }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => handleDeletePublication(pub.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isManager && tab === 'boost' && (
        <div className="profile-card card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Account Boosting</h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Get more visibility with a boosted profile — 10,000 FCFA/month</p>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
            {!salon.subscription_active_until ? (
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>Status:</strong> <span style={{ color: 'var(--primary)' }}>Free Trial (7 days) started today</span>
              </p>
            ) : new Date(salon.subscription_active_until) > new Date() ? (
              <>
                <p style={{ margin: '0 0 4px', fontSize: '14px' }}>
                  <strong>Status:</strong> <span style={{ color: 'var(--success)' }}>Active until {new Date(salon.subscription_active_until).toLocaleDateString()}</span>
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Your salon is visible to clients. Renew before expiry to avoid suspension.</p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 4px', fontSize: '14px' }}>
                  <strong>Status:</strong> <span style={{ color: 'var(--danger)' }}>Suspended — subscription expired on {new Date(salon.subscription_active_until).toLocaleDateString()}</span>
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Your salon is hidden from clients. Pay to reactivate.</p>
              </>
            )}
          </div>

          {(!salon.subscription_active_until || new Date(salon.subscription_active_until) <= new Date()) && (
            <div style={{ padding: '12px 16px', background: 'var(--accent-bg, #fef3c7)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
              <strong>Free trial expired.</strong> Pay 10,000 FCFA to reactivate your account for 30 days.
            </div>
          )}

          <h4 style={{ marginBottom: '16px' }}>Simulate Payment</h4>
          {paymentResult && (
            <div style={{ padding: '12px 16px', background: 'var(--success-bg, #d1fae5)', color: 'var(--success, #059669)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '14px' }}>
              {paymentResult}
            </div>
          )}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setPaying(true);
            setPaymentResult('');
            try {
              const result = await api.subscribeSalon(salon.id, { phone_number: phoneNumber, operator });
              setPaymentResult(result.message);
              setSalon({ ...salon, subscription_active_until: result.subscription_active_until });
              const txns = await api.getSubscriptionTransactions(salon.id);
              setTransactions(txns);
            } catch (err) {
              setPaymentResult('Payment failed. Try again.');
            } finally {
              setPaying(false);
            }
          }}>
            <div className="form-group">
              <label>Mobile Money Operator</label>
              <select className="form-control" value={operator} onChange={(e) => setOperator(e.target.value)}>
                <option value="momo">Mobile Money (MTN)</option>
                <option value="orange">Orange Money</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input className="form-control" required placeholder="e.g. 690000001" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Amount: <strong>10,000 FCFA</strong> — 30 days of boosted visibility
            </div>
            <button type="submit" className="btn btn-primary" disabled={paying}>
              <Zap size={16} /> {paying ? 'Processing...' : 'Pay 10,000 FCFA'}
            </button>
          </form>

          {transactions.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <h4 style={{ marginBottom: '12px' }}>Transaction History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {transactions.map((txn) => (
                  <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                    <div>
                      <strong>{txn.transaction_type === 'trial' ? 'Free Trial' : 'Subscription'}</strong>
                      {txn.operator !== 'system' && <span> via {txn.operator}</span>}
                      {txn.phone_number && <span> ({txn.phone_number})</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: txn.amount === 0 ? 'var(--text-tertiary)' : 'var(--primary)' }}>
                        {parseFloat(txn.amount).toLocaleString()} FCFA
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {new Date(txn.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isManager && tab === 'schedule' && (
        <div className="profile-card card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Manage Schedule</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Configure working hours and shifts for your salon stylists.
              </p>
            </div>
            {selectedHairdresser && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleApplyPreset('standard')}
                  title="Apply 09:00 AM – 06:00 PM from Monday to Saturday"
                >
                  ⚡ Mon–Sat (9AM–6PM)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleApplyPreset('weekdays')}
                  title="Apply 09:00 AM – 05:00 PM from Monday to Friday"
                >
                  ⚡ Mon–Fri (9AM–5PM)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => window.confirm('Clear all schedule slots for this stylist?') && handleApplyPreset('clear')}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {hairdressers.length === 0 ? (
            <div className="empty-state"><p>Add stylists first to manage their schedules.</p></div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Select Stylist</label>
                <select className="form-control" value={selectedHairdresser} onChange={(e) => handleHairdresserChange(e.target.value)}>
                  {hairdressers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.first_name ? `${h.first_name} ${h.last_name || ''}`.trim() : h.username} {h.id === user.id ? '(You · Owner)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Custom Slot Form */}
              <form onSubmit={handleAddAvailability} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '24px', padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                <div className="form-group" style={{ minWidth: '140px', flex: '1 1 140px' }}>
                  <label>Day</label>
                  <select className="form-control" value={availForm.day_of_week} onChange={(e) => setAvailForm({ ...availForm, day_of_week: e.target.value })}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: '110px', flex: '1 1 110px' }}>
                  <label>From</label>
                  <input type="time" className="form-control" value={availForm.start_time} onChange={(e) => setAvailForm({ ...availForm, start_time: e.target.value })} required />
                </div>
                <div className="form-group" style={{ minWidth: '110px', flex: '1 1 110px' }}>
                  <label>To</label>
                  <input type="time" className="form-control" value={availForm.end_time} onChange={(e) => setAvailForm({ ...availForm, end_time: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ height: '42px', padding: '0 16px' }}><Plus size={16} /> Add Slot</button>
              </form>

              {/* Weekly Overview */}
              <h4 style={{ marginBottom: '14px' }}>Weekly Working Schedule</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {DAYS.map((dayName, dayIndex) => {
                  const daySlots = availabilities.filter((a) => a.day_of_week === dayIndex);
                  const isWorking = daySlots.length > 0;
                  return (
                    <div
                      key={dayIndex}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: isWorking ? 'var(--bg-main)' : 'rgba(0,0,0,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ minWidth: '90px', fontWeight: 600, color: isWorking ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {dayName}
                        </span>
                        {isWorking ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {daySlots.map((slot) => (
                              <span
                                key={slot.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: 'var(--primary-bg)',
                                  color: 'var(--primary)',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                }}
                              >
                                {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAvailability(slot.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                  title="Remove slot"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            Day Off / Closed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}