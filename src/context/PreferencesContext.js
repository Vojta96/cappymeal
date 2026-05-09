import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PreferencesContext = createContext(null);

const STORAGE_KEY = (uid) => `cappymeal-preferences-${uid}`;

export function PreferencesProvider({ children }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setPreferences(null);
      setPrefsLoaded(false);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY(user.uid));
    setPreferences(stored ? JSON.parse(stored) : null);
    setPrefsLoaded(true);
  }, [user]);

  const savePreferences = (prefs) => {
    if (!user) return;
    localStorage.setItem(STORAGE_KEY(user.uid), JSON.stringify(prefs));
    setPreferences(prefs);
  };

  return (
    <PreferencesContext.Provider value={{ preferences, prefsLoaded, savePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
