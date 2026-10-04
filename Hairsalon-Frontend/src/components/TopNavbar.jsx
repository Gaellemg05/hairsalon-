import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { getMediaUrl } from '../api';
import logoImg from '../assets/logo.jpeg';
import {
  Scissors,
  User,
  Bell,
  Sparkles,
  Calendar,
  CheckCircle,
  XCircle,
  MessageCircle,
  Clock,
  CheckCheck,
  Trash2,
  X
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function TopNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [imgError, setImgError] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    setImgError(false);
  }, [user?.profile_picture, user?.profile_image]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showNotifs]);

  if (!user) return null;

  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user.username;

  const roleLabel =
    user.role === 'hairdresser'
      ? 'Stylist & Salon Partner'
      : user.role === 'admin'
      ? 'Administrator'
      : 'Client';

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        <div className="top-navbar-mobile-brand" onClick={() => navigate('/')}>
          <div className="sidebar-logo top-nav-logo">
            <img src={logoImg} alt="LuxeSalon" className="sidebar-logo-img" />
          </div>
          <span className="brand-name top-nav-brand-name">LuxeSalon</span>
        </div>

        <div className="top-navbar-welcome">
          <span className="top-navbar-greeting">Hello, </span>
          <strong className="top-navbar-name">{displayName}</strong>
          <span className="top-navbar-role-badge">{roleLabel}</span>
        </div>
      </div>

      <div className="top-navbar-right">
        {user.role === 'client' && (
          <Link to="/try-on" className="top-navbar-action-btn top-nav-tryon-btn" title="Try Virtual Hair">
            <Sparkles size={16} />
            <span className="hide-mobile">Virtual Try-On</span>
          </Link>
        )}

        {/* Notification Bell & Dropdown */}
        <div className="notif-wrapper" ref={notifRef}>
          <button
            type="button"
            className={`top-navbar-icon-btn ${showNotifs ? 'top-navbar-icon-btn-active' : ''}`}
            onClick={() => setShowNotifs(!showNotifs)}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="nav-badge top-nav-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="notif-dropdown animate-fade-in">
              <div className="notif-header">
                <div className="notif-title-area">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="notif-count-badge">{unreadCount} new</span>
                  )}
                </div>
                <div className="notif-header-actions">
                  {notifications.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="notif-action-btn"
                        onClick={markAllAsRead}
                        title="Mark all as read"
                      >
                        <CheckCheck size={13} />
                        <span>Mark all read</span>
                      </button>
                      <button
                        type="button"
                        className="notif-action-btn notif-clear-all-btn"
                        onClick={clearAll}
                        title="Clear all notifications"
                      >
                        <Trash2 size={13} />
                        <span>Clear all</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <div className="notif-empty-icon">🔔</div>
                    <p className="notif-empty-title">No notifications</p>
                    <span className="notif-empty-sub">You're all caught up!</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const getIcon = () => {
                      switch (notif.type) {
                        case 'booking_pending':
                          return <Clock size={16} color="#d97706" />;
                        case 'booking_confirmed':
                          return <CheckCircle size={16} color="#16a34a" />;
                        case 'booking_cancelled':
                          return <XCircle size={16} color="#dc2626" />;
                        case 'booking_completed':
                          return <Sparkles size={16} color="#7c3aed" />;
                        case 'chat_message':
                          return <MessageCircle size={16} color="#0284c7" />;
                        default:
                          return <Calendar size={16} color="#7c3aed" />;
                      }
                    };

                    const formatTime = (ts) => {
                      if (!ts) return '';
                      const diff = (Date.now() - new Date(ts).getTime()) / 1000;
                      if (diff < 60) return 'Just now';
                      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                      return new Date(ts).toLocaleDateString();
                    };

                    return (
                      <div
                        key={notif.id}
                        className={`notif-item ${!notif.read ? 'notif-item-unread' : ''}`}
                        onClick={() => {
                          markAsRead(notif.id);
                          setShowNotifs(false);
                          if (notif.link) {
                            navigate(notif.link, notif.chatId ? { state: { chatId: notif.chatId } } : {});
                          }
                        }}
                      >
                        <div className={`notif-icon-badge notif-icon-${notif.type}`}>
                          {getIcon()}
                        </div>

                        <div className="notif-content">
                          <div className="notif-item-top">
                            <span className="notif-item-title">{notif.title}</span>
                            <span className="notif-time">{formatTime(notif.timestamp)}</span>
                          </div>
                          <p className="notif-msg">{notif.message}</p>
                        </div>

                        <button
                          type="button"
                          className="notif-item-clear-btn"
                          title="Clear notification"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notif.id);
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <Link to="/profile" className="top-navbar-profile" title="View Profile">
          <div className="top-navbar-avatar">
            {(user.profile_picture || user.profile_image) && !imgError ? (
              <img
                src={getMediaUrl(user.profile_picture || user.profile_image)}
                alt={displayName}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="top-navbar-avatar-fallback">
                {user.first_name?.charAt(0) || user.username?.charAt(0) || <User size={16} />}
              </div>
            )}
          </div>
          <div className="top-navbar-user-text">
            <span className="top-navbar-user-name">{displayName}</span>
            <span className="top-navbar-user-sub">@{user.username}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
