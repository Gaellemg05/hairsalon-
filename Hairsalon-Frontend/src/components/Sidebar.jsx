import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CalendarPlus, Clock, MessageCircle, User, Scissors, MapPin, LayoutDashboard, Store, Sparkles } from 'lucide-react';
import { useAuth } from '../auth';
import { useUnreadCount } from '../hooks/useUnreadCount';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();

  const navItems = user?.role === 'hairdresser'
    ? [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-salon', icon: Store, label: 'My Salon' },
        { to: '/try-on', icon: Sparkles, label: 'Virtual Try-On' },
        { to: '/appointments', icon: Clock, label: 'Bookings' },
        { to: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadCount },
        { to: '/profile', icon: User, label: 'Profile' },
      ]
    : [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/try-on', icon: Sparkles, label: 'Virtual Try-On' },
        { to: '/booking', icon: CalendarPlus, label: 'Book' },
        { to: '/appointments', icon: Clock, label: 'Bookings' },
        { to: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadCount },
        { to: '/map', icon: MapPin, label: 'Near Me' },
        { to: '/profile', icon: User, label: 'Profile' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          <div className="sidebar-logo">
            <Scissors size={22} strokeWidth={2.5} />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-name">LuxeSalon</span>
            <span className="brand-sub">Connect</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <item.icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
