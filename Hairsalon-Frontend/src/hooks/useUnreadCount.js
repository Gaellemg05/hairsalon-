import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

/**
 * Returns the total unread message count across all chats.
 * Polls every 30 seconds and also refreshes instantly whenever
 * a "chats-read" custom event is dispatched on window.
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const chats = await api.getChats();
      const total = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {
      // silently ignore (e.g. user not logged in yet)
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    // Re-fetch immediately whenever a conversation is marked as read
    window.addEventListener('chats-read', fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chats-read', fetchCount);
    };
  }, [fetchCount]);

  return unreadCount;
}
