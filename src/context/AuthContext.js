import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { ref, onValue, set, get, update } from 'firebase/database';
import { auth, db } from '../firebase';
import { capitalizeFirst } from '../lib/text';

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
      nickname: capitalizeFirst(nickname),
      householdId: null,
    });
    return cred;
  }, []);

  const login = useCallback(async (nickname, password) => {
    const cred = await signInWithEmailAndPassword(auth, toEmail(nickname), password);
    // Older accounts stored no nickname or the lowercase email-derived one ("vojta").
    // Save the nickname as typed, capitalized, to the profile and household membership.
    try {
      const uid = cred.user.uid;
      const snap = await get(ref(db, `users/${uid}`));
      const prof = snap.val() || {};
      const stored = prof.nickname;
      const display = capitalizeFirst(nickname);
      if (display && (!stored || stored === normalizeNickname(nickname)) && stored !== display) {
        const updates = { [`users/${uid}/nickname`]: display };
        if (prof.householdId) updates[`households/${prof.householdId}/members/${uid}/nickname`] = display;
        await update(ref(db), updates);
      }
    } catch (e) {
      // non-fatal – login already succeeded
    }
    return cred;
  }, []);

  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      profile,
      profileLoading,
      nickname: capitalizeFirst((profile && profile.nickname) || nicknameFromUser(user)),
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
