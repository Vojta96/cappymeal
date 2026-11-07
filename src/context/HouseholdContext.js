import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  push,
  query,
  limitToLast,
} from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { dateKey, dayInfo, horizonKeys } from '../lib/dates';
import { SLOT_BY_KEY, dayStatus, buildAlert } from '../lib/meals';
import { DEFAULT_SETTINGS } from '../services/household';

export const HouseholdContext = createContext(null);

const SUBTREES = ['recipes', 'plan', 'orders', 'pantry', 'settings', 'members', 'joinCode'];

function useTodayKey() {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    const check = () => setToday((prev) => (prev === dateKey() ? prev : dateKey()));
    const id = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export function HouseholdProvider({ hid, children }) {
  const { user, nickname } = useAuth();
  const uid = user ? user.uid : null;
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState({});
  const [activity, setActivity] = useState([]);
  const [photos, setPhotos] = useState({}); // cacheKey -> dataURL | null
  const photoRequests = useRef(new Set());
  const todayKey = useTodayKey();

  // One subscription per sub-tree.
  useEffect(() => {
    if (!hid) return undefined;
    const base = `households/${hid}`;
    const unsubs = SUBTREES.map((name) =>
      onValue(
        ref(db, `${base}/${name}`),
        (snap) => {
          setData((d) => ({ ...d, [name]: snap.val() }));
          setLoaded((l) => (l[name] ? l : { ...l, [name]: true }));
        },
        () => setLoaded((l) => ({ ...l, [name]: true }))
      )
    );
    unsubs.push(
      onValue(query(ref(db, `${base}/activity`), limitToLast(60)), (snap) => {
        const list = [];
        snap.forEach((c) => {
          list.push({ id: c.key, ...c.val() });
        });
        setActivity(list.reverse());
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [hid]);

  const recipes = useMemo(() => data.recipes || {}, [data.recipes]);
  const plan = useMemo(() => data.plan || {}, [data.plan]);
  const orders = useMemo(() => data.orders || {}, [data.orders]);
  const pantry = useMemo(() => data.pantry || {}, [data.pantry]);
  const members = useMemo(() => data.members || {}, [data.members]);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(data.settings || {}) }), [data.settings]);
  const ready = SUBTREES.every((n) => loaded[n]);

  const horizon = useMemo(() => horizonKeys(todayKey), [todayKey]);
  const statusOf = useCallback(
    (key) => dayStatus(plan[key], orders[key], recipes),
    [plan, orders, recipes]
  );
  const alert = useMemo(() => buildAlert(todayKey, horizon, statusOf), [todayKey, horizon, statusOf]);
  const pendingDays = useMemo(() => horizon.filter((k) => statusOf(k) === 'pending'), [horizon, statusOf]);

  // ---------- photos (lazy, cached) ----------
  const photoKey = (rid, r) => `${rid}:${(r && r.updatedAt) || 0}`;

  const requestPhoto = useCallback(
    (rid) => {
      const r = recipes[rid];
      if (!r || !r.hasPhoto || !hid) return;
      const k = photoKey(rid, r);
      if (photoRequests.current.has(k)) return;
      photoRequests.current.add(k);
      get(ref(db, `households/${hid}/photos/${rid}`))
        .then((snap) => setPhotos((p) => ({ ...p, [k]: snap.val() || null })))
        .catch(() => {
          photoRequests.current.delete(k);
        });
    },
    [recipes, hid]
  );

  const photoFor = useCallback(
    (rid) => {
      const r = recipes[rid];
      if (!r || !r.hasPhoto) return undefined;
      return photos[photoKey(rid, r)];
    },
    [recipes, photos]
  );

  // ---------- actions ----------
  const base = `households/${hid}`;

  const logActivity = useCallback(
    (type, text) =>
      push(ref(db, `${base}/activity`), { type, text, by: uid, at: Date.now() }).catch(() => {}),
    [base, uid]
  );

  const markPlanChanged = useCallback(
    (day) => {
      const o = orders[day];
      if (o && (o.status === 'in_cart' || o.status === 'ordered') && !o.planChanged) {
        return set(ref(db, `${base}/orders/${day}/planChanged`), true);
      }
      return Promise.resolve();
    },
    [orders, base]
  );

  const setMeal = useCallback(
    async (day, slot, rid) => {
      await set(ref(db, `${base}/plan/${day}/${slot}`), rid);
      await markPlanChanged(day);
      const d = dayInfo(day);
      const r = recipes[rid];
      logActivity(
        'plan',
        `${nickname} přidal(a) ${SLOT_BY_KEY[slot].acc} na ${d.acc} ${d.num}. ${d.m}.${r ? ` – ${r.name}` : ''}`
      );
    },
    [base, recipes, nickname, logActivity, markPlanChanged]
  );

  const removeMeal = useCallback(
    async (day, slot) => {
      await remove(ref(db, `${base}/plan/${day}/${slot}`));
      await markPlanChanged(day);
      const d = dayInfo(day);
      logActivity('plan', `${nickname} zrušil(a) ${SLOT_BY_KEY[slot].acc} na ${d.acc} ${d.num}. ${d.m}.`);
    },
    [base, nickname, logActivity, markPlanChanged]
  );

  /**
   * draft: { id?, name, emoji, type, preparation, instructions, ingredients, builtinImage }
   * photo: string (new data URL) | null (remove photo) | undefined (keep)
   */
  const saveRecipe = useCallback(
    async (draft, photo) => {
      const isNew = !draft.id;
      const rid = draft.id || push(ref(db, `${base}/recipes`)).key;
      const prev = recipes[rid] || {};
      const now = Date.now();
      let hasPhoto = !!prev.hasPhoto;
      if (typeof photo === 'string') hasPhoto = true;
      if (photo === null) hasPhoto = false;
      const recipe = {
        name: draft.name.trim() || 'Nový recept',
        emoji: draft.emoji || prev.emoji || '🍽️',
        type: draft.type,
        preparation: (draft.preparation || '').trim(),
        instructions: (draft.instructions || '').trim(),
        ingredients: (draft.ingredients || [])
          .filter((g) => g.name && g.name.trim())
          .map((g) => ({ name: g.name.trim(), amount: (g.amount || '').trim() })),
        builtinImage: typeof photo === 'string' ? null : prev.builtinImage || null,
        hasPhoto,
        createdBy: prev.createdBy || uid,
        updatedAt: now,
      };
      const updates = { [`recipes/${rid}`]: recipe };
      if (typeof photo === 'string') updates[`photos/${rid}`] = photo;
      if (photo === null) updates[`photos/${rid}`] = null;
      await update(ref(db, base), updates);
      if (typeof photo === 'string') {
        setPhotos((p) => ({ ...p, [`${rid}:${now}`]: photo }));
        photoRequests.current.add(`${rid}:${now}`);
      }
      logActivity('recipe', `${nickname} ${isNew ? 'přidal(a)' : 'upravil(a)'} recept ${recipe.name}`);
      return rid;
    },
    [base, recipes, uid, nickname, logActivity]
  );

  const deleteRecipe = useCallback(
    async (rid) => {
      const r = recipes[rid];
      const updates = { [`recipes/${rid}`]: null, [`photos/${rid}`]: null };
      // Remove upcoming plan references (past days are kept untouched).
      Object.entries(plan).forEach(([day, slots]) => {
        if (day < todayKey || !slots) return;
        Object.entries(slots).forEach(([slot, v]) => {
          if (v === rid) updates[`plan/${day}/${slot}`] = null;
        });
      });
      await update(ref(db, base), updates);
      if (r) logActivity('recipe', `${nickname} smazal(a) recept ${r.name}`);
    },
    [base, recipes, plan, todayKey, nickname, logActivity]
  );

  const togglePantry = useCallback(
    (key, value) => set(ref(db, `${base}/pantry/${key}`), value),
    [base]
  );

  const setOrderStatus = useCallback(
    async (days, status) => {
      const now = Date.now();
      const updates = {};
      days.forEach((d) => {
        updates[`orders/${d}`] = { status, at: now, by: uid };
      });
      await update(ref(db, base), updates);
      if (status === 'ordered') {
        const label = days.map((k) => dayInfo(k).shortLabel).join(', ');
        logActivity('order', `${nickname} dokončil(a) objednávku na ${label}`);
      }
    },
    [base, uid, nickname, logActivity]
  );

  const clearOrder = useCallback((day) => remove(ref(db, `${base}/orders/${day}`)), [base]);

  const updateSettings = useCallback((patch) => update(ref(db, `${base}/settings`), patch), [base]);

  const value = useMemo(
    () => ({
      hid,
      uid,
      nickname,
      ready,
      todayKey,
      horizon,
      recipes,
      plan,
      orders,
      pantry,
      members,
      settings,
      joinCode: data.joinCode || '',
      activity,
      alert,
      pendingDays,
      statusOf,
      requestPhoto,
      photoFor,
      setMeal,
      removeMeal,
      saveRecipe,
      deleteRecipe,
      togglePantry,
      setOrderStatus,
      clearOrder,
      updateSettings,
      logActivity,
    }),
    [
      hid, uid, nickname, ready, todayKey, horizon, recipes, plan, orders, pantry, members, settings,
      data.joinCode, activity, alert, pendingDays, statusOf, requestPhoto, photoFor, setMeal, removeMeal,
      saveRecipe, deleteRecipe, togglePantry, setOrderStatus, clearOrder, updateSettings, logActivity,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export const useHousehold = () => useContext(HouseholdContext);
