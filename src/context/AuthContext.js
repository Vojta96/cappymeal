import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { ref, onValue, set } from 'firebase/database';
import { auth, db } from '../firebase';

export const AuthContext = createContext(null);

export const normalizeNickname = (nickname) => nickname.trim().toLowerCase();
const toEmail = (nickname) => `${normalizeNickname(nickname)}@cappymeal.app`;
const nicknameFromUser = (u) => (u && u.email ? u.email.split('@')[0] : '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // users/{uid}: { nickname, householdId }
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setProfileLoading(!!u);
      if (!u) setProfile(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const unsub = onValue(
      ref(db, `users/${user.uid}`),
      (snap) => {
        setProfile(snap.val() || {});
        setProfileLoading(false);
      },
      () => {
        setProfile({});
        setProfileLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const register = useCallback(async (nickname, password) => {
    const cred = await createUserWithEmailAndPassword(auth, toEmail(nickname), password);
    await set(ref(db, `users/${cred.user.uid}`), {
      nickname: nickname.trim(),
      householdId: null,
    });
    return cred;
  }, []);

  const login = useCallback(
    (nickname, password) => signInWithEmailAndPassword(auth, toEmail(nickname), password),
    []
  );

  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      profile,
      profileLoading,
      nickname: (profile && profile.nickname) || nicknameFromUser(user),
      householdId: (profile && profile.householdId) || null,
      login,
      register,
      logout,
    }),
    [user, loading, profile, profileLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
