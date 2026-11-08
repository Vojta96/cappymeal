'use strict';
// Fixed-window rate limiter stored in RTDB under admin-only rateLimits/...

const HOUR = 60 * 60 * 1000;

/**
 * Pure transition: state { start, count } | null -> { allowed, state }.
 * The window restarts once `windowMs` has passed since its start.
 */
function nextState(state, now, limit, windowMs = HOUR) {
  const fresh = !state || typeof state.start !== 'number' || now - state.start >= windowMs || now < state.start;
  const cur = fresh ? { start: now, count: 0 } : { start: state.start, count: Number(state.count) || 0 };
  if (cur.count >= limit) return { allowed: false, state: cur };
  return { allowed: true, state: { start: cur.start, count: cur.count + 1 } };
}

/**
 * Atomically consumes one unit at `path`. Resolves true if allowed.
 * db: admin.database()
 */
async function consume(db, path, limit, windowMs = HOUR, now = Date.now()) {
  let allowed = false;
  await db.ref(path).transaction((cur) => {
    const r = nextState(cur, now, limit, windowMs);
    allowed = r.allowed;
    return r.allowed ? r.state : undefined; // undefined aborts (nothing written)
  });
  return allowed;
}

module.exports = { HOUR, nextState, consume };
