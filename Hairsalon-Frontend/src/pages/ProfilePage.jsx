import { useState } from 'react';
import { LogOut, Edit3, Calendar, Star, ChevronRight, Shield, User, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone_number: '', profile_picture: '' });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const startEdit = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        profile_picture: user.profile_picture || '',
      });
    }
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateUser(user.id, formData);
      updateUser(formData);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    }
  };

  if (!user) return <div className="page-loading">Loading...</div>;

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account settings</p>
      </header>

      <div className="profile-card card animate-fade-in">
        <div className="profile-avatar-section">
          <div className="profile-avatar" style={user.profile_picture ? { background: 'none', padding: 0, overflow: 'hidden' } : {}}>
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              user.first_name?.charAt(0) || user.username?.charAt(0) || <User size={28} />
            )}
          </div>
          <div>
            <h2>{user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'capitalize' }}>{user.role} Account</p>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="profile-form" style={{ marginTop: '24px' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>First Name</label>
                <input className="form-control" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input className="form-control" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input className="form-control" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Profile Picture URL</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input className="form-control" placeholder="https://..." value={formData.profile_picture} onChange={(e) => setFormData({...formData, profile_picture: e.target.value})} />
                <Camera size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              </div>
              {formData.profile_picture && (
                <img src={formData.profile_picture} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', marginTop: '6px', border: '2px solid var(--border-light)' }} />
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        ) : (
          <div className="profile-info" style={{ marginTop: '24px' }}>
            <div className="profile-info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email || 'Not set'}</span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">{user.phone_number || 'Not set'}</span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Role</span>
              <span className="info-value">{user.role}</span>
            </div>
            <button className="btn btn-secondary" style={{ marginTop: '24px', width: '100%' }} onClick={startEdit}>
              <Edit3 size={16} /> Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="profile-settings">
        <button className="setting-item">
          <div className="setting-icon" style={{ background: 'var(--primary-bg)' }}>
            <Calendar size={18} color="var(--primary)" />
          </div>
          <span>My Appointments</span>
          <ChevronRight size={18} className="setting-arrow" />
        </button>
        <button className="setting-item">
          <div className="setting-icon" style={{ background: 'var(--accent-bg)' }}>
            <Star size={18} color="var(--accent)" />
          </div>
          <span>My Reviews</span>
          <ChevronRight size={18} className="setting-arrow" />
        </button>
        <button className="setting-item">
          <div className="setting-icon" style={{ background: '#f0fdf4' }}>
            <Shield size={18} color="#10b981" />
          </div>
          <span>Privacy & Security</span>
          <ChevronRight size={18} className="setting-arrow" />
        </button>
      </div>

      <button className="btn btn-logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </div>
  );
}
