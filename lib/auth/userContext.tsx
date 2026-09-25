'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User;
  setUsername: (name: string) => void;
}

const defaultUser: User = {
  id: 'viewer_' + Math.random().toString(36).substring(2, 9),
  username: 'Fan_' + Math.floor(100 + Math.random() * 900),
  role: 'viewer',
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  setUsername: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(defaultUser);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('streampulse_viewer_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username) {
            setUser(parsed);
            return;
          }
        }
        const newViewer: User = {
          id: 'viewer_' + Math.random().toString(36).substring(2, 9),
          username: 'Fan_' + Math.floor(100 + Math.random() * 900),
          role: 'viewer',
        };
        setUser(newViewer);
        localStorage.setItem('streampulse_viewer_profile', JSON.stringify(newViewer));
      } catch (e) {
        console.error('Error with viewer storage:', e);
      }
    }
  }, []);

  const setUsername = (name: string) => {
    const cleanName = name.trim().slice(0, 20) || 'Fan_' + Math.floor(100 + Math.random() * 900);
    const updated: User = { ...user, username: cleanName };
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('streampulse_viewer_profile', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
