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
import { DEFAULT_SETTINGS, ensureHouseholdMeta, seedRecipeRecords } from '../services/household';
import { capitalizeFirst } from '../lib/text';
import { prefUpdates } from '../lib/shop';
import { leadShift } from '../lib/checkout';

export const HouseholdContext = createContext(null);

const SUBTREES = [
  'recipes', 'plan', 'orders', 'pantry', 'settings', 'members', 'joinCode', 'name', 'owner', 'rohlik', 'regulars',
  'productPrefs',
];

// Recipe photos: householdPhotos/{hid}/{rid}; households/{hid}/photos/{rid} is the read-only legacy location.
const photoPath = (hid, rid) => `householdPhotos/${hid}/${rid}`;
const legacyPhotoPath = (hid, rid) => `households/${hid}/photos/${rid}`;
const clip = (v, max) => String(v || '').trim().slice(0, max);

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
  const regulars = useMemo(() => data.regulars || {}, [data.regulars]);
  const productPrefs = useMemo(() => data.productPrefs || {}, [data.productPrefs]);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(data.settings || {}) }), [data.settings]);
  const ready = SUBTREES.every((n) => loaded[n]);
  const owner = data.owner || null;
  const isOwner = !!uid && owner === uid;

  // Households created before ownership existed: let the server backfill owner (once).
  const metaRequested = useRef(false);
  useEffect(() => {
    if (!hid || !loaded.owner || !loaded.members || data.owner || metaRequested.current) return;
    if (!data.members || !uid || !data.members[uid]) return;
    metaRequested.current = true;
    ensureHouseholdMeta().catch(() => {
      metaRequested.current = false;
    });
  }, [hid, uid, loaded.owner, loaded.members, data.owner, data.members]);

  const horizon = useMemo(() => horizonKeys(todayKey), [todayKey]);
  const statusOf = useCallback(
    (key) => dayStatus(plan[key], orders[key], recipes),
    [plan, orders, recipes]
  );
  const shift = leadShift(data.settings);
  const alert = useMemo(() => buildAlert(todayKey, horizon, statusOf, shift), [todayKey, horizon, statusOf, shift]);
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
      get(ref(db, photoPath(hid, rid)))
        .then((snap) => (snap.exists() ? snap : get(ref(db, legacyPhotoPath(hid, rid)))))
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
      // Limits mirror database.rules.json.
      const recipe = {
        name: clip(draft.name, 80) || 'Nový recept',
        emoji: clip(draft.emoji || prev.emoji, 16) || '🍽️',
        type: draft.type,
        preparation: clip(draft.preparation, 80),
        instructions: clip(draft.instructions, 5000),
        ingredients: (draft.ingredients || [])
          .filter((g) => g.name && g.name.trim())
          .slice(0, 60)
          .map((g) => ({ name: clip(g.name, 80), amount: clip(g.amount, 40) })),
        builtinImage: typeof photo === 'string' ? null : prev.builtinImage || null,
        hasPhoto,
        createdBy: prev.createdBy || uid,
        updatedAt: now,
      };
      const updates = { [`${base}/recipes/${rid}`]: recipe };
      if (typeof photo === 'string' || photo === null) {
        updates[photoPath(hid, rid)] = photo;
        if (prev.hasPhoto) updates[legacyPhotoPath(hid, rid)] = null;
      }
      await update(ref(db), updates);
      if (typeof photo === 'string') {
        setPhotos((p) => ({ ...p, [`${rid}:${now}`]: photo }));
        photoRequests.current.add(`${rid}:${now}`);
      } else if (photo === undefined && hasPhoto) {
        // Move a legacy photo to the new location (best effort, never blocks the save).
        get(ref(db, photoPath(hid, rid)))
          .then((cur) => (cur.exists() ? null : get(ref(db, legacyPhotoPath(hid, rid)))))
          .then((old) => {
            if (!old || !old.exists()) return null;
            return update(ref(db), { [photoPath(hid, rid)]: old.val(), [legacyPhotoPath(hid, rid)]: null });
          })
          .catch(() => {});
      }
      logActivity('recipe', `${nickname} ${isNew ? 'přidal(a)' : 'upravil(a)'} recept ${recipe.name}`);
      return rid;
    },
    [base, hid, recipes, uid, nickname, logActivity]
  );

  const deleteRecipe = useCallback(
    async (rid) => {
      const r = recipes[rid];
      const updates = { [`${base}/recipes/${rid}`]: null };
      if (r && r.hasPhoto) {
        updates[photoPath(hid, rid)] = null;
        updates[legacyPhotoPath(hid, rid)] = null;
      }
      // Remove upcoming plan references (past days are kept untouched).
      Object.entries(plan).forEach(([day, slots]) => {
        if (day < todayKey || !slots) return;
        Object.entries(slots).forEach(([slot, v]) => {
          if (v === rid) updates[`${base}/plan/${day}/${slot}`] = null;
        });
      });
      await update(ref(db), updates);
      if (r) logActivity('recipe', `${nickname} smazal(a) recept ${r.name}`);
    },
    [base, hid, recipes, plan, todayKey, nickname, logActivity]
  );

  // Owner action: drop every recipe (+ photos, upcoming plan slots using them) and seed the default set, in one write.
  const replaceRecipesWithSeed = useCallback(async () => {
    const updates = {};
    const old = new Set(Object.keys(recipes));
    old.forEach((rid) => {
      updates[`${base}/recipes/${rid}`] = null;
      updates[photoPath(hid, rid)] = null;
      updates[legacyPhotoPath(hid, rid)] = null;
    });
    Object.entries(plan).forEach(([day, slots]) => {
      if (day < todayKey || !slots) return;
      Object.entries(slots).forEach(([slot, v]) => {
        if (old.has(v)) updates[`${base}/plan/${day}/${slot}`] = null;
      });
    });
    const now = Date.now();
    seedRecipeRecords(uid, now).forEach((rec) => {
      updates[`${base}/recipes/${push(ref(db, `${base}/recipes`)).key}`] = rec;
    });
    await update(ref(db), updates);
    logActivity('recipe', `${nickname} nahradil(a) recepty novou sadou`);
  }, [base, hid, recipes, plan, todayKey, uid, nickname, logActivity]);

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

  const updateHouseholdName = useCallback(
    (name) => set(ref(db, `${base}/name`), capitalizeFirst(name).slice(0, 40) || null),
    [base]
  );

  // ---------- regular shopping items (households/{hid}/regulars) ----------
  const addRegular = useCallback(
    ({ name, amount, auto }) => {
      const n = clip(name, 80);
      if (!n) return Promise.reject(new Error('Doplňte název položky.'));
      const item = { name: n, auto: !!auto, createdBy: uid, createdAt: Date.now() };
      const a = clip(amount, 40);
      if (a) item.amount = a;
      return push(ref(db, `${base}/regulars`), item);
    },
    [base, uid]
  );

  const updateRegular = useCallback(
    (id, patch) => {
      const out = {};
      if (patch.name !== undefined) {
        const n = clip(patch.name, 80);
        if (!n) return Promise.reject(new Error('Doplňte název položky.'));
        out.name = n;
      }
      if (patch.amount !== undefined) out.amount = clip(patch.amount, 40) || null;
      if (patch.auto !== undefined) out.auto = !!patch.auto;
      return update(ref(db, `${base}/regulars/${id}`), out);
    },
    [base]
  );

  const deleteRegular = useCallback((id) => remove(ref(db, `${base}/regulars/${id}`)), [base]);

  // ---------- remembered product choices (households/{hid}/productPrefs/{ingredientKey}) ----------
  /** chosen: [{ key, product }] – the variants confirmed with "Vložit do košíku". */
  const saveProductPrefs = useCallback(
    (chosen) => {
      const updates = prefUpdates(chosen, productPrefs, uid, Date.now());
      if (!Object.keys(updates).length) return Promise.resolve();
      return update(ref(db, `${base}/productPrefs`), updates);
    },
    [base, uid, productPrefs]
  );

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
      regulars,
      productPrefs,
      owner,
      isOwner,
      rohlik: data.rohlik || null,
      joinCode: data.joinCode || '',
      name: data.name || '',
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
      replaceRecipesWithSeed,
      togglePantry,
      setOrderStatus,
      clearOrder,
      updateSettings,
      updateHouseholdName,
      logActivity,
      addRegular,
      updateRegular,
      deleteRegular,
      saveProductPrefs,
    }),
    [
      hid, uid, nickname, ready, todayKey, horizon, recipes, plan, orders, pantry, members, settings,
      data.joinCode, data.name, activity, alert, pendingDays, statusOf, requestPhoto, photoFor, setMeal, removeMeal,
      saveRecipe, deleteRecipe, replaceRecipesWithSeed, togglePantry, setOrderStatus, clearOrder, updateSettings, updateHouseholdName, logActivity,
      regulars, productPrefs, owner, isOwner, data.rohlik, addRegular, updateRegular, deleteRegular, saveProductPrefs,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export const useHousehold = () => useContext(HouseholdContext);
