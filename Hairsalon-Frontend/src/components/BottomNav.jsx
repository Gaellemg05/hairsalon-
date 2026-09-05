import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CalendarPlus, Clock, MessageCircle, User, MapPin, LayoutDashboard, Store, Sparkles } from 'lucide-react';
import { useAuth } from '../auth';
import { useUnreadCount } from '../hooks/useUnreadCount';

export default function BottomNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();

  const navItems = user?.role === 'hairdresser'
    ? [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/my-salon', icon: Store, label: 'My Salon' },
        { to: '/try-on', icon: Sparkles, label: 'Try-On' },
        { to: '/appointments', icon: Clock, label: 'Bookings' },
        { to: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadCount },
        { to: '/profile', icon: User, label: 'Profile' },
      ]
    : [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/try-on', icon: Sparkles, label: 'Try-On' },
        { to: '/booking', icon: CalendarPlus, label: 'Book' },
        { to: '/appointments', icon: Clock, label: 'Bookings' },
        { to: '/chats', icon: MessageCircle, label: 'Chats', badge: unreadCount },
        { to: '/profile', icon: User, label: 'Profile' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <item.icon size={22} strokeWidth={2} />
            {item.badge > 0 && (
              <span className="nav-badge nav-badge-mobile">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </div>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button onClick={handleLogout} className="bottom-nav-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Logout</span>
      </button>
    </nav>
  );
}
