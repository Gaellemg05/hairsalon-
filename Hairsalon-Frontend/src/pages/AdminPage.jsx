import { Shield, ExternalLink } from 'lucide-react';

export default function AdminPage() {
  const adminUrl = import.meta.env.VITE_ADMIN_URL || '/admin/';

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-card card" style={{ textAlign: 'center', padding: '60px 32px' }}>
        <div className="admin-icon">
          <Shield size={40} color="white" />
        </div>
        <h1 style={{ marginTop: '20px' }}>Administrator Area</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0 28px', maxWidth: '480px', marginInline: 'auto' }}>
          Manage users, salons, services, reviews, and bookings via the Django Admin Portal.
        </p>
        <a
          href={adminUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-lg"
          style={{ textDecoration: 'none', display: 'inline-flex' }}
        >
          <ExternalLink size={18} />
          Go to Django Admin
        </a>
      </div>
    </div>
  );
}
