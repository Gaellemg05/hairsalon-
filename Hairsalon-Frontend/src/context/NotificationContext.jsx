import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

const NotificationContext = createContext(null);

// Optional subtle audio chime using Web Audio API
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Ignore if audio context not allowed yet
  }
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevCountRef = useRef(0);

  const getClearedIds = useCallback(() => {
    if (!user) return [];
    try {
      const data = localStorage.getItem(`luxesalon_cleared_notifs_${user.id}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, [user]);

  const getReadIds = useCallback(() => {
    if (!user) return [];
    try {
      const data = localStorage.getItem(`luxesalon_read_notifs_${user.id}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, [user]);

  const saveClearedIds = useCallback((ids) => {
    if (!user) return;
    try {
      localStorage.setItem(`luxesalon_cleared_notifs_${user.id}`, JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const saveReadIds = useCallback((ids) => {
    if (!user) return;
    try {
      localStorage.setItem(`luxesalon_read_notifs_${user.id}`, JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      const clearedIds = new Set(getClearedIds());
      const readIds = new Set(getReadIds());
      const notifs = [];

      // 1. Fetch appointments
      try {
        const appts = await api.getAppointments();
        (appts || []).forEach((appt) => {
          const id = `appt-${appt.id}-${appt.status}`;
          if (clearedIds.has(id)) return;

          const isHairdresser = user.role === 'hairdresser';
          const otherName = isHairdresser
            ? (appt.client_details?.first_name ? `${appt.client_details.first_name} ${appt.client_details.last_name || ''}`.trim() : appt.client_details?.username || 'A client')
            : (appt.hairdresser_details?.first_name ? `${appt.hairdresser_details.first_name} ${appt.hairdresser_details.last_name || ''}`.trim() : appt.hairdresser_details?.username || 'Your stylist');
          const serviceName = appt.service_details?.name || 'Hair Service';
          const salonName = appt.salon_details?.name || 'Salon';
          const timeFormatted = appt.time ? appt.time.slice(0, 5) : '';

          let title = '';
          let message = '';
          let type = '';
          let link = isHairdresser ? '/dashboard?tab=appointments' : '/appointments';

          if (appt.status === 'pending') {
            type = 'booking_pending';
            if (isHairdresser) {
              title = 'New Booking Request';
              message = `${otherName} booked ${serviceName} on ${appt.date} at ${timeFormatted}.`;
            } else {
              title = 'Booking Awaiting Confirmation';
              message = `Your booking for ${serviceName} at ${salonName} on ${appt.date} is pending confirmation.`;
            }
          } else if (appt.status === 'confirmed') {
            // When hairdresser confirms the booking, only the client receives the confirmation notification
            if (!isHairdresser) {
              type = 'booking_confirmed';
              link = '/appointments';
              title = 'Appointment Confirmed! ✅';
              message = `Your appointment for ${serviceName} at ${salonName} on ${appt.date} at ${timeFormatted} is confirmed.`;
            }
          } else if (appt.status === 'cancelled') {
            type = 'booking_cancelled';
            title = 'Booking Cancelled ❌';
            message = isHairdresser
              ? `Appointment with ${otherName} on ${appt.date} at ${timeFormatted} was cancelled.`
              : `Appointment for ${serviceName} on ${appt.date} at ${timeFormatted} was cancelled.`;
          } else if (appt.status === 'completed') {
            type = 'booking_completed';
            title = 'Appointment Completed 🎉';
            message = isHairdresser
              ? `Appointment with ${otherName} on ${appt.date} marked as completed.`
              : `Your session for ${serviceName} at ${salonName} is completed. Hope you love your new look!`;
          }

          if (title) {
            notifs.push({
              id,
              type,
              category: 'appointment',
              title,
              message,
              timestamp: appt.updated_at || appt.created_at || new Date().toISOString(),
              link,
              read: readIds.has(id),
              rawId: appt.id,
            });
          }
        });
      } catch (err) {
        console.error('Failed to fetch appointment notifications', err);
      }

      // 2. Fetch chats for new messages
      try {
        const chats = await api.getChats();
        (chats || []).forEach((chat) => {
          const otherPerson = user.role === 'hairdresser'
            ? (chat.client_details?.first_name ? `${chat.client_details.first_name} ${chat.client_details.last_name || ''}`.trim() : chat.client_details?.username || 'Client')
            : (chat.hairdresser_details?.first_name ? `${chat.hairdresser_details.first_name} ${chat.hairdresser_details.last_name || ''}`.trim() : chat.hairdresser_details?.username || 'Stylist');

          const unreadCount = chat.unread_count || 0;
          const messages = chat.messages || [];
          const incomingMsgs = messages.filter((m) => m.sender !== user.id);
          const latestMsg = incomingMsgs[incomingMsgs.length - 1];

          if (unreadCount > 0 && latestMsg) {
            const id = `chat-${chat.id}-msg-${latestMsg.id}`;
            if (!clearedIds.has(id)) {
              notifs.push({
                id,
                type: 'chat_message',
                category: 'chat',
                title: `New Message from ${otherPerson} 💬`,
                message: latestMsg.text ? `"${latestMsg.text.slice(0, 80)}"` : 'Sent you a photo attachment',
                timestamp: latestMsg.created_at || new Date().toISOString(),
                link: '/chats',
                chatId: chat.id,
                read: readIds.has(id),
              });
            }
          }
        });
      } catch (err) {
        console.error('Failed to fetch chat notifications', err);
      }

      // Sort newest first
      notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Play chime if new unread notification arrived
      const currentUnread = notifs.filter((n) => !n.read).length;
      if (currentUnread > prevCountRef.current && prevCountRef.current !== 0) {
        playChime();
      }
      prevCountRef.current = currentUnread;

      setNotifications(notifs);
    } finally {
      setLoading(false);
    }
  }, [user, getClearedIds, getReadIds]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);

    const handleWindowRefresh = () => fetchNotifications();
    window.addEventListener('notifications-refresh', handleWindowRefresh);
    window.addEventListener('chats-read', handleWindowRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-refresh', handleWindowRefresh);
      window.removeEventListener('chats-read', handleWindowRefresh);
    };
  }, [fetchNotifications]);

  const markAsRead = (id) => {
    const currentRead = new Set(getReadIds());
    currentRead.add(id);
    const updated = Array.from(currentRead);
    saveReadIds(updated);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    const currentRead = new Set(getReadIds());
    notifications.forEach((n) => currentRead.add(n.id));
    const updated = Array.from(currentRead);
    saveReadIds(updated);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id) => {
    const currentCleared = new Set(getClearedIds());
    currentCleared.add(id);
    const updated = Array.from(currentCleared);
    saveClearedIds(updated);

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    const currentCleared = new Set(getClearedIds());
    notifications.forEach((n) => currentCleared.add(n.id));
    const updated = Array.from(currentCleared);
    saveClearedIds(updated);

    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
