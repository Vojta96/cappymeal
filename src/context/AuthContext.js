import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { capitalizeFirst } from '../lib/text';
import { callFunction } from '../services/functions';

export const AuthContext = createContext(null);

// Login e-mails live on a subdomain of the Firebase-controlled domain (nobody can receive
// mail there). Accounts created before the switch used @cappymeal.app and are migrated
// on their next login / app start.
export const LOGIN_DOMAIN = 'users.cappymeal-go.firebaseapp.com';
export const LEGACY_DOMAIN = 'cappymeal.app';
export const normalizeNickname = (nickname) => nickname.trim().toLowerCase();
export const toEmail = (nickname) => `${normalizeNickname(nickname)}@${LOGIN_DOMAIN}`;
const toLegacyEmail = (nickname) => `${normalizeNickname(nickname)}@${LEGACY_DOMAIN}`;
const isLegacy = (u) => !!(u && u.email && u.email.toLowerCase().endsWith(`@${LEGACY_DOMAIN}`));
const nicknameFromUser = (u) => (u && u.email ? u.email.split('@')[0] : '');

const CREDENTIAL_ERRORS = [
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/user-not-found',
  'auth/wrong-password',
  'auth/invalid-email',
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // users/{uid}: { nickname, householdId }
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const migrating = useRef(false);

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

  // Sessions that are still signed in with a legacy e-mail get migrated in the background.
  useEffect(() => {
    if (!isLegacy(user) || migrating.current) return;
    migrating.current = true;
    callFunction('migrateLoginEmail', {})
      .then((r) => (r && r.migrated ? user.reload().then(() => user.getIdToken(true)) : null))
      .catch(() => {
        // non-fatal – the account keeps working with the old e-mail and retries next time
      });
  }, [user]);

  const register = useCallback(async (nickname, password) => {
    await callFunction('registerAccount', { nickname: nickname.trim(), password });
    return signInWithEmailAndPassword(auth, toEmail(nickname), password);
  }, []);

  const login = useCallback(async (nickname, password) => {
    try {
      return await signInWithEmailAndPassword(auth, toEmail(nickname), password);
    } catch (e) {
      if (!CREDENTIAL_ERRORS.includes(e && e.code)) throw e;
      // Account from before the domain switch?
      let legacy;
      try {
        migrating.current = true;
        legacy = await signInWithEmailAndPassword(auth, toLegacyEmail(nickname), password);
      } catch (e2) {
        migrating.current = false;
        throw CREDENTIAL_ERRORS.includes(e2 && e2.code) ? e : e2;
      }
      try {
        const r = await callFunction('migrateLoginEmail', { nickname: capitalizeFirst(nickname) });
        if (r && r.migrated) return await signInWithEmailAndPassword(auth, toEmail(nickname), password);
      } catch (e3) {
        // non-fatal – stays signed in with the legacy e-mail
      }
      return legacy;
    }
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
