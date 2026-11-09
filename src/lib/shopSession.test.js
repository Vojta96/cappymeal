import {
  REVERT_GRACE_MS,
  SESSION_TTL_MS,
  clearSession,
  loadSession,
  pruneItems,
  resolveShopDays,
  saveSession,
  sessionKey,
  sessionProducts,
  updateSession,
} from './shopSession';

const NOW = Date.parse('2026-11-09T18:00:00');
const base = { daysSel: ['2026-11-10'], regSel: { k1: true }, extras: [], step: 'matched', results: {}, picks: {} };

beforeEach(() => {
  window.localStorage.clear();
  clearSession('h1');
});

describe('shopSession storage', () => {
  test('save + load round trip, stamped with v and savedAt', () => {
    saveSession('h1', base, NOW);
    const raw = JSON.parse(window.localStorage.getItem(sessionKey('h1')));
    expect(raw).toMatchObject({ v: 1, savedAt: NOW });
    expect(loadSession('h1', NOW + 1000)).toMatchObject({ daysSel: ['2026-11-10'], regSel: { k1: true }, step: 'matched' });
    expect(loadSession('h2', NOW)).toBeNull();
  });

  test('expires after 48 h and is removed', () => {
    saveSession('h1', base, NOW);
    expect(loadSession('h1', NOW + SESSION_TTL_MS - 1)).not.toBeNull();
    expect(loadSession('h1', NOW + SESSION_TTL_MS + 1)).toBeNull();
    expect(window.localStorage.getItem(sessionKey('h1'))).toBeNull();
  });

  test('garbage / other version is ignored', () => {
    window.localStorage.setItem(sessionKey('h1'), '{oops');
    expect(loadSession('h1', NOW)).toBeNull();
    window.localStorage.setItem(sessionKey('h1'), JSON.stringify({ ...base, v: 99, savedAt: NOW }));
    expect(loadSession('h1', NOW)).toBeNull();
    // a 'checkout' step without submitted days falls back to the product step
    window.localStorage.setItem(sessionKey('h1'), JSON.stringify({ ...base, step: 'checkout', v: 1, savedAt: NOW }));
    expect(loadSession('h1', NOW).step).toBe('matched');
  });

  test('storage failure (private mode) → in-memory fallback, no throw', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(() => saveSession('h1', base, NOW, broken)).not.toThrow();
    expect(loadSession('h1', NOW, broken)).toMatchObject({ daysSel: ['2026-11-10'] });
    expect(() => clearSession('h1', broken)).not.toThrow();
    expect(loadSession('h1', NOW, broken)).toBeNull();
    expect(loadSession('h1', NOW, null)).toBeNull();
  });

  test('updateSession merges and drops undefined keys', () => {
    saveSession('h1', { ...base, submittedDays: ['2026-11-10'], submittedAt: NOW, checkout: { dayTab: 2 } }, NOW);
    updateSession('h1', { submittedDays: undefined, submittedAt: undefined, notice: 'reverted' }, NOW);
    const s = loadSession('h1', NOW);
    expect(s.submittedDays).toBeUndefined();
    expect(s.notice).toBe('reverted');
    expect(s.checkout).toEqual({ dayTab: 2 });
    expect(s.regSel).toEqual({ k1: true });
  });
});

describe('pruning and products', () => {
  const opt = (id, extra = {}) => ({ productId: id, name: `P${id}`, price: 10, ...extra });
  test('pruneItems keeps only existing items', () => {
    const r = pruneItems({ a: { options: [] }, b: { options: [] } }, { a: { idx: 0 }, c: { idx: 1 } }, ['a']);
    expect(r).toEqual({ results: { a: { options: [] } }, picks: { a: { idx: 0 } } });
  });

  test('sessionProducts: chosen variants only (skipped / unavailable / missing left out)', () => {
    const s = {
      results: {
        a: { options: [opt(1), opt(2)] },
        b: { options: [opt(3, { available: false })] },
        c: { options: [opt(4)] },
        d: { options: [opt(5)] },
      },
      picks: { a: { idx: 1, qty: 3 }, b: { idx: 0, qty: 1 }, c: { idx: 0, qty: 2, skip: true }, d: { idx: 0, qty: 99 }, e: { idx: 0 } },
    };
    expect(sessionProducts(s)).toEqual([
      { productId: '2', quantity: 3 },
      { productId: '5', quantity: 50 },
    ]);
    expect(sessionProducts(null)).toEqual([]);
  });
});

describe('resolveShopDays', () => {
  const horizon = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
  const statuses = (map) => (k) => map[k] || 'empty';
  // Owner's report: Po 9., Út 10., St 11., Čt 12., Ne 15. planned; he picked Út + St and filled the cart.
  const afterFill = statuses({
    '2026-11-09': 'pending',
    '2026-11-10': 'in_cart',
    '2026-11-11': 'in_cart',
    '2026-11-12': 'pending',
    '2026-11-15': 'pending',
  });
  const submitted = {
    daysSel: ['2026-11-10', '2026-11-11'],
    submittedDays: ['2026-11-10', '2026-11-11'],
    submittedAt: NOW - 10 * 60000,
  };

  test('reported scenario: returning to Nákup keeps Út + St and shows the cart in progress', () => {
    const r = resolveShopDays({ session: submitted, horizon, statusOf: afterFill, now: NOW });
    expect(r.days).toEqual(['2026-11-10', '2026-11-11']);
    expect(r.banner).toEqual({ state: 'in_cart', days: ['2026-11-10', '2026-11-11'] });
    expect(r.action).toBeNull();
    // chips still show the other days (not selected) and the in-cart ones
    expect(r.chipDays).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-15']);
  });

  test('explicit selection never flips when statuses change', () => {
    const before = statuses({ '2026-11-09': 'pending', '2026-11-10': 'pending', '2026-11-11': 'pending', '2026-11-12': 'pending' });
    const s = { daysSel: ['2026-11-10', '2026-11-11'] };
    expect(resolveShopDays({ session: s, horizon, statusOf: before, now: NOW }).days).toEqual(['2026-11-10', '2026-11-11']);
    expect(resolveShopDays({ session: s, horizon, statusOf: afterFill, now: NOW }).days).toEqual(['2026-11-10', '2026-11-11']);
  });

  test('brand-new session: pending days only, never in_cart ones', () => {
    const r = resolveShopDays({ session: null, horizon, statusOf: afterFill, now: NOW });
    expect(r.days).toEqual(['2026-11-09', '2026-11-12', '2026-11-15']);
    expect(r.banner).toBeNull();
    expect(resolveShopDays({ session: { daysSel: null }, horizon, statusOf: afterFill, now: NOW }).days).toEqual([
      '2026-11-09',
      '2026-11-12',
      '2026-11-15',
    ]);
  });

  test('cart emptied on Rohlík (sync reverted the days) → reverted, selection kept', () => {
    const reverted = statuses({ '2026-11-09': 'pending', '2026-11-10': 'pending', '2026-11-11': 'pending', '2026-11-12': 'pending' });
    const r = resolveShopDays({ session: submitted, horizon, statusOf: reverted, now: NOW });
    expect(r.action).toBe('reverted');
    expect(r.banner.state).toBe('reverted');
    expect(r.days).toEqual(['2026-11-10', '2026-11-11']);
    // right after filling a lagging status is not trusted yet
    const fresh = { ...submitted, submittedAt: NOW - REVERT_GRACE_MS + 1000 };
    expect(resolveShopDays({ session: fresh, horizon, statusOf: reverted, now: NOW }).banner.state).toBe('in_cart');
  });

  test('order placed → clear (fresh default selection)', () => {
    const ordered = statuses({ '2026-11-09': 'pending', '2026-11-10': 'ordered', '2026-11-11': 'ordered', '2026-11-12': 'pending' });
    const r = resolveShopDays({ session: submitted, horizon, statusOf: ordered, now: NOW });
    expect(r.action).toBe('clear');
    expect(r.days).toEqual(['2026-11-09', '2026-11-12']);
    expect(r.chipDays).toContain('2026-11-10'); // shown with its "objednáno" label
  });

  test('days that left the horizon are dropped; none left → clear', () => {
    const later = horizon.slice(2);
    const s = { daysSel: ['2026-11-09', '2026-11-11'] };
    expect(resolveShopDays({ session: s, horizon: later, statusOf: afterFill, now: NOW }).days).toEqual(['2026-11-11']);
    const past = { submittedDays: ['2026-11-09'], submittedAt: NOW - 3600000 };
    expect(resolveShopDays({ session: past, horizon: later, statusOf: afterFill, now: NOW }).action).toBe('clear');
  });

  test('meals removed from the submitted days → clear', () => {
    const r = resolveShopDays({ session: submitted, horizon, statusOf: statuses({ '2026-11-09': 'pending' }), now: NOW });
    expect(r.action).toBe('clear');
  });
});
