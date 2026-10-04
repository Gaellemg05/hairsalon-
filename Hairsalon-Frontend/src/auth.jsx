/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { getMediaUrl, api } from './api';

const AuthContext = createContext(null);

const normalizeUser = (u) => {
  if (!u) return null;
  const pic = u.profile_picture || u.profile_image || '';
  const fullPic = pic ? getMediaUrl(pic) : '';
  return {
    ...u,
    profile_picture: fullPic,
    profile_image: fullPic,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (saved && token) {
      try {
        return normalizeUser(JSON.parse(saved));
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user?.id) {
      api.getUser(user.id)
        .then((freshUser) => {
          if (freshUser && freshUser.id) {
            setUser((prev) => {
              const updated = normalizeUser({ ...prev, ...freshUser });
              localStorage.setItem('user', JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch((err) => {
          console.warn('Failed to refresh user profile:', err);
        });
    }
  }, [user?.id]);

  const login = (userData) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const next = normalizeUser({ ...prev, ...updatedFields });
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
