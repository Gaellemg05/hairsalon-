import { useState, useEffect } from 'react';
import { api } from '../api';
import { Scissors, Store } from 'lucide-react';

export default function RegisterPage({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    profile_picture: '',
    role: 'client',
  });
  const [affiliated, setAffiliated] = useState('no');
  const [salons, setSalons] = useState([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (formData.role === 'hairdresser') {
      api.getSalons().then(setSalons).catch(() => {});
    }
  }, [formData.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...formData };
      if (formData.role === 'hairdresser' && affiliated === 'yes' && selectedSalonId) {
        payload.affiliated_salon_id = parseInt(selectedSalonId);
      }
      const data = await api.register(payload);
      localStorage.setItem('token', data.token);
      onLoginSuccess(data.user);
    } catch {
      setError('Registration failed. Username may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-brand">
          <div className="auth-logo">
            <Scissors size={26} />
          </div>
          <h1>LuxeSalon</h1>
          <p className="auth-sub">Connect</p>
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-desc">Join us and book your next visit</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username *</label>
            <input id="username" name="username" type="text" className="form-control" value={formData.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input id="password" name="password" type="password" className="form-control" value={formData.password} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>First Name</label>
              <input id="first_name" name="first_name" type="text" className="form-control" value={formData.first_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input id="last_name" name="last_name" type="text" className="form-control" value={formData.last_name} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input id="email" name="email" type="email" className="form-control" value={formData.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input id="phone_number" name="phone_number" type="text" className="form-control" value={formData.phone_number} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select id="role" name="role" className="form-control" value={formData.role} onChange={handleChange}>
              <option value="client">Client</option>
              <option value="hairdresser">Hairdresser / Stylist</option>
            </select>
          </div>

          {formData.role === 'hairdresser' && (
            <>
              <div className="form-group">
                <label>Are you affiliated with a salon?</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" name="affiliated" value="yes" checked={affiliated === 'yes'} onChange={(e) => setAffiliated(e.target.value)} />
                    Yes, I work at a salon
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" name="affiliated" value="no" checked={affiliated === 'no'} onChange={(e) => setAffiliated(e.target.value)} />
                    No, I&apos;m independent
                  </label>
                </div>
              </div>

              {affiliated === 'yes' && (
                <div className="form-group">
                  <label><Store size={14} /> Select your salon</label>
                  <select className="form-control" value={selectedSalonId} onChange={(e) => setSelectedSalonId(e.target.value)} required={affiliated === 'yes'}>
                    <option value="">Choose a salon...</option>
                    {salons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.address}</option>
                    ))}
                  </select>
                  {salons.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>No salons found. You can register as independent.</p>}
                </div>
              )}

              {affiliated === 'no' && (
                <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  You can register your own salon later from the <strong>My Salon</strong> page.
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn btn-primary btn-lg auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <a href="#/login" className="auth-link">Sign in</a>
        </p>
      </div>
    </div>
  );
}