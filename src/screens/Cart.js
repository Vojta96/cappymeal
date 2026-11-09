import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import RegularsSheet from '../components/RegularsSheet';
import ClearCartSheet from '../components/ClearCartSheet';
import { clearSession, loadSession, pruneItems, resolveShopDays, updateSession } from '../lib/shopSession';
import { Icon, Spinner, Toast } from '../components/ui';
import { dayInfo, plural } from '../lib/dates';
import {
  MIN_ORDER_KC,
  aggregateIngredients,
  formatKc,
  isInPantry,
  isRegularSelected,
  itemDetail,
  regularItems,
  shoppingListText,
} from '../lib/meals';
import { fillCart, matchProducts, needsReconnect, syncRohlikOrders } from '../services/rohlik';
import { rememberAdded } from './CartCheckout';
import ProductCarousel from '../components/ProductCarousel';
import { formatQty, leftoverText, needForServer, presetQty, sumNeed } from '../lib/quantity';
import { arrangeCandidates, priceInfo, savingsOf, shopPrefs, totalOf } from '../lib/shop';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './cart.css';

const MAX_QTY = 50;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e2) {
      return false;
    }
  }
}

/** "pro: Bolognese, Kaše" / "Pravidelná položka" */
function mealsText(item) {
  if (item.regular) return 'Pravidelná položka';
  if (item.extra) return 'Přidáno ručně';
  if (!item.meals || !item.meals.length) return '';
  return `pro: ${item.meals.join(', ')}`;
}

/** One shopping item: header (name, need, meals, "Hledat jinak", "Přeskočit"), variant carousel, quantity. */
function ShopItem({ item, need, entry, pick, busy, loading, xtra, onPick, onSearch }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = (entry && entry.options) || [];
  const prod = !pick.skip && pick.idx >= 0 ? options[pick.idx] : null;
  const sub = [need ? `Potřeba: ${formatQty(need)}` : '', mealsText(item)].filter(Boolean).join(' · ');
  const hints = options.map((o, i) => leftoverText(need, o, i === pick.idx ? pick.qty : presetQty(need, o)));
  const info = prod ? priceInfo(prod, xtra) : null;
  const price = info ? info.price : null;

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    onSearch(q);
    setSearchOpen(false);
  };

  return (
    <div className={`shop-item${pick.skip ? ' shop-item--skip' : ''}`}>
      <div className="shop-item__head">
        <div className="shop-item__body">
          <div className="shop-item__title">
            {item.name}
            {item.regular && <span className="cart__reg-badge">pravidelná</span>}
          </div>
          {sub && <div className="shop-item__sub">{sub}</div>}
        </div>
        <button
          type="button"
          className={`shop-item__act${searchOpen ? ' shop-item__act--on' : ''}`}
          onClick={() => {
            setSearchOpen((o) => !o);
            if (!query) setQuery((entry && entry.query) || item.name);
          }}
          aria-expanded={searchOpen}
          disabled={busy || loading}
          title="Hledat jinak"
        >
          <Icon name="manage_search" size={18} />
          <span className="shop-item__act-label">Hledat jinak</span>
        </button>
        <button
          type="button"
          className={`shop-item__act shop-item__skip${pick.skip ? ' shop-item__act--on' : ''}`}
          onClick={() => {
            if (!pick.skip) {
              onPick({ skip: true });
              return;
            }
            const keep = pick.idx >= 0 && options[pick.idx] && options[pick.idx].available !== false;
            const i = keep ? pick.idx : options.findIndex((o) => o.available !== false);
            if (i >= 0) onPick({ skip: false, idx: i, qty: keep ? pick.qty : presetQty(need, options[i]) });
          }}
          aria-pressed={!!pick.skip}
          disabled={busy || loading || (pick.skip && !options.some((o) => o.available !== false))}
        >
          <Icon name="block" size={18} />
          Přeskočit
        </button>
      </div>

      {searchOpen && (
        <form className="shop-item__search" onSubmit={submit}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={60}
            placeholder="Co hledat na Rohlíku"
            aria-label={`Hledat jinak – ${item.name}`}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <button type="submit" className="btn btn--sm btn--auto" disabled={!query.trim() || loading}>
            Hledat
          </button>
        </form>
      )}

      {entry && entry.note === 'unavailable' && (
        <div className="shop-item__note">
          <Icon name="info" size={17} />
          Vaše volba není dostupná – vybrali jsme jinou variantu.
        </div>
      )}

      {loading ? (
        <div className="shop-item__loading">
          <Spinner small />
          Hledám na Rohlíku…
        </div>
      ) : !entry ? (
        <div className="cart__none">
          Položka přibyla do seznamu.{' '}
          <button type="button" className="link-btn" onClick={() => onSearch('')} disabled={busy}>
            Najít na Rohlíku
          </button>
        </div>
      ) : options.length > 0 ? (
        <ProductCarousel
          options={options}
          selected={pick.skip ? -1 : pick.idx}
          onSelect={(i) => onPick({ idx: i, skip: false, qty: presetQty(need, options[i]) })}
          label={`Varianty – ${item.name}`}
          hints={hints}
          disabled={busy}
          xtra={xtra}
        />
      ) : (
        <div className="cart__none">Rohlík nenašel žádný vhodný produkt. Zkuste „Hledat jinak“.</div>
      )}

      {prod && !loading && (
        <div className="shop-item__foot">
          <div className="shop-item__total">
            {price != null ? (
              <>
                <span>
                  {pick.qty} × {info.text || formatKc(price)}
                  {info.refPrice ? <span className="shop-item__sale"> −{info.percent} %</span> : null}
                </span>
                <strong>{formatKc(price * pick.qty)}</strong>
              </>
            ) : (
              <span>{prod.priceText ? `${pick.qty} × ${prod.priceText}` : `${pick.qty} ks`}</span>
            )}
          </div>
          <div className="stepper">
            <button
              type="button"
              onClick={() => onPick({ qty: pick.qty - 1 })}
              aria-label="Méně"
              disabled={busy || pick.qty <= 1}
            >
              <Icon name="remove" size={18} />
            </button>
            <span aria-live="polite">{pick.qty}</span>
            <button
              type="button"
              onClick={() => onPick({ qty: pick.qty + 1 })}
              aria-label="Více"
              disabled={busy || pick.qty >= MAX_QTY}
            >
              <Icon name="add" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Cart() {
  const {
    hid,
    ready = true,
    horizon,
    todayKey,
    plan,
    memberPlan,
    memberIds,
    recipes,
    pantry,
    regulars,
    rohlik,
    statusOf,
    togglePantry,
    setOrderStatus,
    settings,
    productPrefs,
    saveProductPrefs,
  } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  // The shopping session survives navigation / reload / the PWA being killed (src/lib/shopSession.js).
  const [restored] = useState(() => loadSession(hid));
  const rs = restored || {};
  const [daysSel, setDaysSel] = useState(rs.daysSel || null); // null = brand-new session (default selection)
  const [step, setStep] = useState(rs.step && rs.step !== 'list' ? 'matched' : 'list'); // list | matching | matched | filling
  const [results, setResults] = useState(rs.results || {}); // key -> { options, note, query } (arranged candidates)
  const [picks, setPicks] = useState(rs.picks || {}); // key -> { idx, qty, skip }
  const [itemBusy, setItemBusy] = useState({}); // key -> true while "Hledat jinak" runs
  const [error, setError] = useState(null); // CallError | Error | null
  const [regSel, setRegSel] = useState(rs.regSel || {}); // regular id -> bool (this shopping only)
  const [regSheet, setRegSheet] = useState(null); // 'add' | 'manage' | null
  const [toast, setToast] = useState('');
  // One-off items added while picking products ("kdybych si na něco vzpomněl"); this shopping only.
  const [extras, setExtras] = useState(rs.extras || []);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  // Cart filled from this session: { days, at, addedIds } – days waiting in the Rohlík cart.
  const [submitted, setSubmitted] = useState(() =>
    rs.submittedDays ? { days: rs.submittedDays, at: rs.submittedAt || 0, addedIds: rs.addedIds || [] } : null
  );
  const [notice, setNotice] = useState(rs.notice || null); // 'reverted' = the cart was emptied, picks kept
  const [navKey, setNavKey] = useState(rs.navKey || null);
  const [clearOpen, setClearOpen] = useState(false);
  const clearToast = useCallback(() => setToast(''), []);

  // Arriving from the plan button with explicit days (once per navigation – a reload keeps the user's changes).
  useEffect(() => {
    const nav = location.state && location.state.days;
    if (!nav || navKey === location.key) return;
    setNavKey(location.key);
    if (submitted) return; // a cart in progress keeps its card; "Začít nový nákup" starts over
    const next = [...nav].sort();
    if (daysSel && daysSel.join() === next.join()) return;
    setDaysSel(next);
    setStep('list');
    setResults({});
    setPicks({});
    setNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const connected = !!(rohlik && rohlik.connected);

  // Days waiting in the Rohlík cart: let the server check whether the order was placed or the cart emptied
  // (throttled, best effort – the household subscription shows the result).
  const hasInCart = horizon.some((k) => statusOf(k) === 'in_cart');
  useEffect(() => {
    if (!connected || !hasInCart) return;
    syncRohlikOrders().catch(() => {});
  }, [connected, hasInCart]);

  const mustConnect = !connected || needsReconnect(error);
  const reconnect = (!connected && !!(rohlik && rohlik.needsReconnect)) || (connected && needsReconnect(error));

  // Explicit, stable day selection (status changes never flip it) + the "Rozpracovaná objednávka" banner.
  const resolved = useMemo(
    () =>
      resolveShopDays({
        session: { daysSel, submittedDays: submitted && submitted.days, submittedAt: submitted && submitted.at },
        horizon,
        statusOf,
      }),
    [daysSel, submitted, horizon, statusOf]
  );
  const { days, chipDays, banner } = resolved;

  const all = useMemo(
    () => aggregateIngredients(days, plan, recipes, memberPlan, memberIds),
    [days, plan, recipes, memberPlan, memberIds]
  );
  const allRegulars = useMemo(() => regularItems(regulars, regSel, { onlySelected: false }), [regulars, regSel]);
  const chosenRegulars = useMemo(() => allRegulars.filter((r) => isRegularSelected(r.id, r, regSel)), [
    allRegulars,
    regSel,
  ]);
  const buyIngredients = all.filter((it) => !isInPantry(it, pantry));
  const home = all.filter((it) => isInPantry(it, pantry));
  // Regulars are never auto-marked as "Mám doma"; they go first.
  const buy = [...extras, ...chosenRegulars, ...buyIngredients];
  // Summed need per item in base units ("Potřeba: 450 g"); null when unknown / incompatible.
  const needs = useMemo(() => {
    const out = {};
    [...extras, ...allRegulars, ...all].forEach((it) => {
      out[it.key] = sumNeed(it.amounts, it.name);
    });
    return out;
  }, [all, allRegulars, extras]);
  const shop = shopPrefs(settings);

  // ---------- session persistence ----------
  const buyKeys = buy.map((it) => it.key).join('\n');
  const pristine = !daysSel && step === 'list' && !extras.length && !Object.keys(regSel).length && !submitted;
  const latest = useRef(null);
  const dead = useRef(false); // order finished → nothing may be written back on unmount
  latest.current = ready
    ? {
        pristine,
        data: {
          daysSel,
          regSel,
          extras,
          step: submitted ? 'checkout' : step === 'matched' || step === 'filling' ? 'matched' : 'list',
          // only items that still exist (plan / pantry changes drop the rest)
          ...pruneItems(results, picks, buyKeys ? buyKeys.split('\n') : []),
          submittedDays: submitted ? submitted.days : undefined,
          submittedAt: submitted ? submitted.at : undefined,
          addedIds: submitted ? submitted.addedIds : undefined,
          notice: notice || undefined,
          navKey: navKey || undefined,
        },
      }
    : null; // household not loaded yet: never overwrite the stored session with half-computed state
  const flush = useCallback(() => {
    const cur = latest.current;
    if (dead.current || !cur || !hid) return;
    if (cur.pristine) clearSession(hid);
    else updateSession(hid, cur.data);
  }, [hid]);
  useEffect(() => {
    const t = setTimeout(flush, 300);
    return () => clearTimeout(t);
  }, [flush, daysSel, regSel, extras, step, results, picks, submitted, notice, navKey, buyKeys, ready]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  /** "Začít nový nákup" (or an order was placed): forget the session, default selection again. */
  const startNew = useCallback(() => {
    clearSession(hid);
    setDaysSel(null);
    setRegSel({});
    setExtras([]);
    setResults({});
    setPicks({});
    setItemBusy({});
    setStep('list');
    setSubmitted(null);
    setNotice(null);
    setError(null);
  }, [hid]);

  // Status of the submitted days decides: order placed → start fresh; cart emptied → keep the picks.
  useEffect(() => {
    if (!ready) return;
    if (resolved.action === 'clear') startNew();
    else if (resolved.action === 'reverted') {
      setSubmitted(null);
      setStep('matched');
      setNotice('reverted');
    }
  }, [ready, resolved.action, startNew]);

  const resetMatch = () => {
    setStep('list');
    setResults({});
    setPicks({});
    setItemBusy({});
    setError(null);
    setNotice(null);
  };

  const toggleDay = (k) => {
    const on = days.includes(k);
    setDaysSel(on ? days.filter((x) => x !== k) : [...days, k].sort());
    resetMatch();
  };

  const toggleRegular = (r) => {
    setRegSel((s) => ({ ...s, [r.id]: !isRegularSelected(r.id, r, s) }));
    if (step !== 'list') resetMatch();
  };

  // A custom "Hledat jinak" query asks for alternatives: the remembered product is not forced back in
  // (and the call stays a single search).
  const requestFor = (it, query) => {
    const pref = !query && productPrefs && productPrefs[it.key];
    return {
      key: it.key,
      name: it.name,
      amounts: it.amounts,
      need: needForServer(needs[it.key]),
      query,
      preferredProductId: pref ? pref.productId : undefined,
      preferredName: pref ? pref.name : undefined,
    };
  };

  /** Server result → arranged entry + preset pick (remembered product first, packs from the need). */
  const applyResult = (it, r, custom = false) => {
    const pref = custom ? null : productPrefs && productPrefs[it.key];
    const arranged = arrangeCandidates((r && r.candidates) || [], pref, r && r.preferred);
    const sel = arranged.selected;
    const entry = { options: arranged.options, note: arranged.note, query: (r && r.query) || '' };
    const pick = { idx: sel, qty: sel >= 0 ? presetQty(needs[it.key], arranged.options[sel]) : 1, skip: sel < 0 };
    return { entry, pick };
  };

  const findOnRohlik = async () => {
    setError(null);
    setNotice(null);
    setDaysSel(days); // the default selection becomes explicit: later status changes never alter it
    setStep('matching');
    try {
      const res = await matchProducts(buy.map((it) => requestFor(it)), shop);
      const byKey = {};
      ((res && res.results) || []).forEach((r) => {
        byKey[r.key] = r;
      });
      const map = {};
      const p = {};
      buy.forEach((it) => {
        const { entry, pick } = applyResult(it, byKey[it.key]);
        map[it.key] = entry;
        p[it.key] = pick;
      });
      setResults(map);
      setPicks(p);
      setStep('matched');
    } catch (e) {
      setError(e);
      setStep('list');
    }
  };

  /** "Hledat jinak": one rohlikMatch call for a single item with the user's query. */
  const searchItem = async (it, query) => {
    setItemBusy((b) => ({ ...b, [it.key]: true }));
    try {
      const res = await matchProducts([requestFor(it, query)], shop);
      const r = ((res && res.results) || []).find((x) => x.key === it.key);
      const { entry, pick } = applyResult(it, r || { candidates: [], query }, !!query);
      setResults((m) => ({ ...m, [it.key]: entry }));
      setPicks((m) => ({ ...m, [it.key]: pick }));
    } catch (e) {
      if (needsReconnect(e)) setError(e);
      else setToast(e.message || 'Hledání se nepovedlo');
    } finally {
      setItemBusy((b) => ({ ...b, [it.key]: false }));
    }
  };

  /** "Přidat položku": a one-off item, searched right away (remembered product applies via its key). */
  const addExtra = async (e) => {
    e.preventDefault();
    const name = extraName.trim().slice(0, 80);
    if (!name) return;
    const key = `extra:${name.toLowerCase().replace(/[.#$[\]/]/g, '_')}`.slice(0, 120);
    if (buy.some((x) => x.key === key)) {
      setToast('Tahle položka už v seznamu je');
      return;
    }
    const amount = extraAmount.trim().slice(0, 40);
    const it = { key, name, amounts: amount ? [amount] : [], meals: [], extra: true };
    setExtras((xs) => [it, ...xs]);
    setExtraName('');
    setExtraAmount('');
    setExtraOpen(false);
    setItemBusy((b) => ({ ...b, [key]: true }));
    try {
      const pref = productPrefs && productPrefs[key];
      const res = await matchProducts(
        [
          {
            key,
            name,
            amounts: it.amounts,
            need: needForServer(sumNeed(it.amounts, name)),
            preferredProductId: pref ? pref.productId : undefined,
            preferredName: pref ? pref.name : undefined,
          },
        ],
        shop,
      );
      const r = ((res && res.results) || []).find((x) => x.key === key);
      const arranged = arrangeCandidates((r && r.candidates) || [], pref, r && r.preferred);
      const sel = arranged.selected;
      setResults((m) => ({ ...m, [key]: { options: arranged.options, note: arranged.note, query: '' } }));
      setPicks((m) => ({
        ...m,
        [key]: {
          idx: sel,
          qty: sel >= 0 ? presetQty(sumNeed(it.amounts, name), arranged.options[sel]) : 1,
          skip: sel < 0,
        },
      }));
    } catch (err) {
      if (needsReconnect(err)) setError(err);
      else setToast(err.message || 'Hledání se nepovedlo');
    } finally {
      setItemBusy((b) => ({ ...b, [key]: false }));
    }
  };

  const chosen = buy
    .map((it) => {
      const pk = picks[it.key];
      const c = (results[it.key] && results[it.key].options) || [];
      if (!pk || pk.skip || pk.idx < 0 || !c[pk.idx] || c[pk.idx].available === false) return null;
      return { item: it, product: c[pk.idx], qty: pk.qty };
    })
    .filter(Boolean);
  const total = totalOf(chosen, shop.xtra);
  const savings = savingsOf(chosen, shop.xtra);
  const savingsLine =
    savings >= 1 ? (
      <div className="cart__savings">
        <Icon name="sell" size={18} />
        Ušetříte cca {formatKc(savings)}
      </div>
    ) : null;

  const toCart = async () => {
    setError(null);
    setStep('filling');
    // Remember the confirmed variants for next time (best effort, never blocks the cart).
    Promise.resolve()
      .then(() => saveProductPrefs && saveProductPrefs(chosen.map((x) => ({ key: x.item.key, product: x.product }))))
      .catch(() => {});
    try {
      const res = await fillCart(
        days,
        chosen.map((x) => ({ productId: String(x.product.productId), quantity: x.qty })),
      );
      if (!res || (!res.ok && !res.added)) {
        throw new Error('Do košíku se nepodařilo nic vložit.');
      }
      const failedIds = new Set((res.failed || []).map((f) => String(f.productId)));
      const addedIds = chosen.map((x) => String(x.product.productId)).filter((id) => !failedIds.has(id));
      rememberAdded(addedIds);
      // Persist right away (this screen unmounts with the navigation, state updates would be lost).
      const sub = { days, at: Date.now(), addedIds };
      if (latest.current) {
        latest.current = {
          pristine: false,
          data: {
            ...latest.current.data,
            daysSel: days,
            step: 'checkout',
            submittedDays: sub.days,
            submittedAt: sub.at,
            addedIds,
            notice: undefined,
          },
        };
        flush();
      }
      setSubmitted(sub);
      navigate('/cart/checkout', {
        state: {
          days,
          added: res.added,
          failed: (res.failed || []).length,
          addedIds,
        },
      });
    } catch (e) {
      setError(e);
      setStep('matched');
    }
  };

  const copyList = async () => {
    const ok = await copyText(shoppingListText(buy, days));
    setToast(ok ? 'Seznam zkopírován' : 'Kopírování se nepovedlo');
  };

  const markOrdered = async () => {
    await setOrderStatus(days, 'ordered');
    clearSession(hid);
    dead.current = true;
    navigate('/', { replace: true });
  };

  const continueCheckout = () =>
    navigate('/cart/checkout', { state: { days: submitted.days, addedIds: submitted.addedIds } });

  /** "Vysypat košík" done: the picks stay (back to the product step), the days are pending again. */
  const onCartCleared = (res, mode) => {
    setClearOpen(false);
    const emptied = !!(res.cart && res.cart.count === 0);
    if ((res.days && res.days.length) || emptied || (mode === 'added' && res.ok)) {
      setSubmitted(null);
      setStep('matched');
      setNotice('reverted');
      setToast(emptied || mode === 'all' ? 'Košík je prázdný' : 'Nákup z CappyMeal je z košíku odebraný');
    } else {
      setToast('Některé položky se nepodařilo odebrat. Zkontrolujte košík na Rohlíku.');
    }
  };

  const setPick = (key, patch) =>
    setPicks((p) => {
      const next = { ...p[key], ...patch };
      if (next.qty !== undefined) next.qty = Math.max(1, Math.min(MAX_QTY, next.qty));
      return { ...p, [key]: next };
    });

  const errorText = error ? error.message || 'Rohlík teď neodpovídá.' : '';

  // ---------- render ----------
  const header = (
    <div className="stack" style={{ gap: 4 }}>
      <h1 className="h-title" style={{ lineHeight: 1 }}>
        Nákup
      </h1>
      <div style={{ fontSize: 14, color: 'var(--muted-2)' }}>
        Suroviny z plánu se pošlou do košíku na Rohlíku
      </div>
    </div>
  );

  const regSheetEl = <RegularsSheet open={!!regSheet} mode={regSheet || 'add'} onClose={() => setRegSheet(null)} />;

  // The shopping of this session waits in the Rohlík cart: continue it instead of offering other days.
  if (banner && banner.state === 'in_cart' && submitted) {
    return (
      <div className="screen screen--fill" style={{ gap: 18 }}>
        {header}
        <div className="cart-resume">
          <div className="cart-resume__head">
            <div className="cart-resume__icon">
              <Icon name="shopping_cart_checkout" size={22} />
            </div>
            <div className="stack" style={{ gap: 0, minWidth: 0 }}>
              <div className="cart-resume__title">Rozpracovaná objednávka</div>
              <div className="cart-resume__days">
                {banner.days.map((k) => dayInfo(k, todayKey).shortLabel).join(', ')}
              </div>
              <span className="cart-resume__status">V košíku na Rohlíku</span>
            </div>
          </div>
          <div className="cart-resume__actions">
            <button type="button" className="btn btn--dark" onClick={continueCheckout}>
              <Icon name="arrow_forward" />
              Pokračovat v pokladně
            </button>
            {connected && (
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setClearOpen(true)}>
                <Icon name="delete_sweep" size={19} />
                Vysypat košík
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={startNew}>
              <Icon name="restart_alt" size={19} />
              Začít nový nákup
            </button>
          </div>
        </div>
        <ClearCartSheet
          open={clearOpen}
          onClose={() => setClearOpen(false)}
          cart={null}
          addedIds={submitted.addedIds}
          days={submitted.days}
          onCleared={onCartCleared}
        />
        <Toast text={toast} onDone={clearToast} />
      </div>
    );
  }

  // Ordered days stay visible as chips, but alone they are nothing to shop for.
  const openDays = chipDays.filter((k) => days.includes(k) || statusOf(k) !== 'ordered');
  if (openDays.length === 0) {
    return (
      <div className="screen screen--fill" style={{ gap: 18 }}>
        {header}
        <div className="empty-card">
          <Icon name="task_alt" size={40} style={{ color: 'var(--success-dot)' }} />
          <div className="empty-card__title">Vše je objednáno</div>
          <div className="empty-card__text">Naplánujte další dny a košík se tu sestaví sám.</div>
          <button type="button" className="btn btn--soft btn--sm btn--auto" onClick={() => navigate('/plan')}>
            Otevřít plán
          </button>
        </div>
      </div>
    );
  }

  const busy = step === 'matching' || step === 'filling';
  const submitLabel = notice === 'reverted' ? 'Vložit znovu do košíku' : 'Vložit do košíku na Rohlíku';

  const connectCard = (
    <div className="cart__fallback">
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="alert-card__icon" style={{ background: 'var(--alert-icon-bg)' }}>
          <Icon name="link_off" size={21} />
        </div>
        <div className="stack" style={{ gap: 3 }}>
          <div className="cart__fallback-title">
            {reconnect ? 'Účet Rohlík je potřeba připojit znovu' : 'Připojte účet Rohlík'}
          </div>
          <div className="cart__fallback-text">
            {reconnect && errorText ? `${errorText} ` : ''}
            Aby šel nákup vložit rovnou do košíku, připojte v Nastavení účet Rohlík vaší domácnosti. Mezitím si
            seznam můžete zkopírovat a objednat ručně.
          </div>
        </div>
      </div>
      <div className="cart__fallback-actions">
        <button type="button" className="btn btn--sm" onClick={() => navigate('/settings')}>
          <Icon name="settings" size={19} />
          Otevřít nastavení
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={copyList}>
          <Icon name="content_copy" size={19} />
          Zkopírovat seznam
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={markOrdered}>
          <Icon name="task_alt" size={19} />
          Označit jako objednané
        </button>
      </div>
    </div>
  );

  const errorCard = (
    <div className="cart__fallback">
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="alert-card__icon" style={{ background: 'var(--alert-icon-bg)' }}>
          <Icon name="cloud_off" size={21} />
        </div>
        <div className="stack" style={{ gap: 3 }}>
          <div className="cart__fallback-title">Rohlík teď nespolupracuje</div>
          <div className="cart__fallback-text">
            {errorText} Seznam si můžete zkopírovat a objednat ručně v aplikaci Rohlík.
          </div>
        </div>
      </div>
      <div className="cart__fallback-actions">
        <button type="button" className="btn btn--sm" onClick={copyList}>
          <Icon name="content_copy" size={19} />
          Zkopírovat seznam
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={markOrdered}>
          <Icon name="task_alt" size={19} />
          Označit jako objednané
        </button>
      </div>
    </div>
  );

  const regularsSection = (
    <div className="stack cart__regs">
      <div className="row--between" style={{ alignItems: 'baseline' }}>
        <h2 className="h-section">Pravidelné položky</h2>
        {allRegulars.length > 0 && (
          <button type="button" className="link-btn" onClick={() => setRegSheet('manage')} disabled={busy}>
            Upravit
          </button>
        )}
      </div>
      <div className="chips">
        {allRegulars.map((r) => {
          const on = isRegularSelected(r.id, r, regSel);
          return (
            <button
              type="button"
              key={r.id}
              className={`chip${on ? ' chip--on' : ''}`}
              style={{ height: 38, padding: '0 13px 0 9px' }}
              onClick={() => toggleRegular(r)}
              aria-pressed={on}
              disabled={busy}
            >
              <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} />
              {r.name}
              {r.amounts.length > 0 && <span className="cart__incart">{r.amounts[0]}</span>}
            </button>
          );
        })}
        <button
          type="button"
          className="chip cart__reg-add"
          style={{ height: 38, padding: '0 13px 0 9px' }}
          onClick={() => setRegSheet('add')}
          disabled={busy}
        >
          <Icon name="add" />
          Přidat položku
        </button>
      </div>
      {allRegulars.length === 0 && (
        <div className="cart__regs-hint">Káva, mléko, toaletní papír… Přidejte věci, které kupujete pořád.</div>
      )}
    </div>
  );

  // Desktop right column (design2 "Doručení" card, adapted to the real Rohlík flow).
  const panel = (
    <aside className="cart__panel">
      <div className="h-section">Košík na Rohlíku</div>
      {step === 'list' &&
        (mustConnect ? (
          <div className="cart__panel-text">
            Účet Rohlík není připojený. Připojte ho v Nastavení, nebo si seznam zkopírujte a objednejte ručně.
          </div>
        ) : (
          <>
            <div className="cart__panel-text">
              Najdeme na Rohlíku produkty pro {buy.length}{' '}
              {plural(buy.length, 'položku', 'položky', 'položek')}. U každé vyberete z několika variant a pošlete
              do košíku.
            </div>
            <button
              type="button"
              className="btn btn--dark cart__panel-btn"
              onClick={findOnRohlik}
              disabled={buy.length === 0}
            >
              <Icon name="travel_explore" />
              Najít na Rohlíku
            </button>
          </>
        ))}
      {step === 'matching' && (
        <div className="row" style={{ gap: 12 }}>
          <Spinner />
          <div className="cart__panel-text">Hledám produkty na Rohlíku…</div>
        </div>
      )}
      {(step === 'matched' || step === 'filling') && (
        <>
          <div className="cart__panel-text">
            Vybráno {chosen.length} {plural(chosen.length, 'položka', 'položky', 'položek')}
          </div>
          <div className="cart__total">
            <span>Celkem</span>
            <strong>{formatKc(total)}</strong>
          </div>
          {savingsLine}
          {total > 0 && total < MIN_ORDER_KC && (
            <div className="cart__min">
              <Icon name="info" size={18} />
              Minimální objednávka na Rohlíku je {formatKc(MIN_ORDER_KC)} – chybí{' '}
              {formatKc(MIN_ORDER_KC - total)}.
            </div>
          )}
          <button
            type="button"
            className="btn btn--dark cart__panel-btn"
            onClick={toCart}
            disabled={busy || chosen.length === 0}
          >
            {step === 'filling' ? <Spinner small /> : <Icon name="local_shipping" />}
            {step === 'filling' ? 'Vkládám do košíku…' : submitLabel}
          </button>
          <div className="cart__panel-note">
            Pak tu zvolíte doručení a platbu a objednávku potvrdíte na Rohlíku.
          </div>
        </>
      )}
    </aside>
  );

  const nothingToBuy = days.length === 0 || (all.length === 0 && chosenRegulars.length === 0);

  return (
    <div className="screen screen--fill" style={{ gap: 18 }}>
      {header}

      <div className="stack cart__days">
        <div className="row--between" style={{ alignItems: 'baseline' }}>
          <div className="cart__days-label">Objednat na dny</div>
          {!pristine && (
            <button type="button" className="link-btn" onClick={startNew} disabled={busy}>
              Začít nový nákup
            </button>
          )}
        </div>
        <div className="chips">
          {chipDays.map((k) => {
            const d = dayInfo(k, todayKey);
            const on = days.includes(k);
            const st = statusOf(k);
            return (
              <button
                type="button"
                key={k}
                className={`chip${on ? ' chip--on' : ''}`}
                style={{ height: 38, padding: '0 13px 0 9px' }}
                onClick={() => toggleDay(k)}
                aria-pressed={on}
                disabled={busy}
              >
                <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} />
                {d.shortLabel}
                {st === 'in_cart' && <span className="cart__incart">v košíku</span>}
                {st === 'ordered' && <span className="cart__incart">objednáno</span>}
              </button>
            );
          })}
        </div>
      </div>

      {notice === 'reverted' && step !== 'list' && (
        <div className="cart-notice" role="status">
          <Icon name="remove_shopping_cart" size={20} />
          <span>
            Košík na Rohlíku je prázdný a objednávka z něj nevznikla. Váš výběr zůstal – můžete ho vložit do košíku
            znovu.
          </span>
        </div>
      )}

      {nothingToBuy ? (
        <>
          {days.length > 0 && regularsSection}
          <div className="empty-card">
            <Icon name="event_busy" size={40} style={{ color: 'var(--muted-3)' }} />
            <div className="empty-card__title">{days.length ? 'Žádné suroviny' : 'Vyberte dny'}</div>
            <div className="empty-card__text">
              {days.length
                ? 'Vybrané dny nemají naplánovaná jídla se surovinami.'
                : 'Zvolte, na které dny chcete nakoupit.'}
            </div>
          </div>
        </>
      ) : (
        <>
          {mustConnect ? connectCard : error ? errorCard : null}

          <div className="cart__cols">
            <div className="cart__left">
              {step === 'list' && (
                <>
                  {regularsSection}
                  <div className="stack">
                    <div className="row--between" style={{ alignItems: 'baseline' }}>
                      <h2 className="h-section">Do košíku</h2>
                      <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>
                        {buy.length} {plural(buy.length, 'položka', 'položky', 'položek')}
                      </div>
                    </div>
                    {buy.length > 0 ? (
                      <div className="list-card" style={{ padding: '4px 14px' }}>
                        {buy.map((it) => (
                          <div key={it.key} className="list-row" style={{ gap: 12 }}>
                            <div className="list-row__body">
                              <div className="list-row__title">
                                {it.name}
                                {it.regular && <span className="cart__reg-badge">pravidelná</span>}
                              </div>
                              <div className="list-row__sub ellipsis">{itemDetail(it)}</div>
                            </div>
                            {it.regular ? (
                              <button type="button" className="cart__home-btn" onClick={() => toggleRegular(it)}>
                                Tentokrát ne
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="cart__home-btn"
                                onClick={() => togglePantry(it.key, true)}
                              >
                                Mám doma
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted" style={{ fontSize: 14, padding: '6px 4px' }}>
                        Všechno máte doma.
                      </div>
                    )}
                  </div>
                  {home.length > 0 && (
                    <div className="stack">
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>
                        Máme doma · {home.length}
                      </div>
                      <div className="chips">
                        {home.map((it) => (
                          <button
                            type="button"
                            key={it.key}
                            className="cart__pantry-chip"
                            onClick={() => togglePantry(it.key, false)}
                            title="Klepnutím vrátíte do košíku"
                          >
                            <Icon name="check" size={16} />
                            <s>{it.name}</s>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isDesktop && !mustConnect && buy.length > 0 && (
                    <div className="sticky-action">
                      <button type="button" className="btn btn--dark" onClick={findOnRohlik}>
                        <Icon name="travel_explore" />
                        Najít na Rohlíku
                      </button>
                    </div>
                  )}
                </>
              )}

              {step === 'matching' && (
                <div className="stack">
                  <h2 className="h-section">Hledám na Rohlíku…</h2>
                  <div className="list-card" style={{ padding: '4px 14px' }}>
                    {buy.slice(0, 8).map((it) => (
                      <div key={it.key} className="list-row" style={{ gap: 12 }}>
                        <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 14 }} />
                        <div className="list-row__body" style={{ gap: 6 }}>
                          <div style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>{it.name}</div>
                          <div className="skeleton" style={{ height: 14, width: '70%' }} />
                          <div className="skeleton" style={{ height: 12, width: '35%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(step === 'matched' || step === 'filling') && (
                <>
                  <div className="stack">
                    <div className="cart__pick-head">
                      <div className="row--between">
                        <h2 className="h-section">Vyberte produkty</h2>
                        <div className="cart__pick-actions">
                          <button type="button" className="link-btn" onClick={resetMatch} disabled={busy}>
                            Upravit seznam
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--auto"
                            onClick={() => setExtraOpen((o) => !o)}
                            aria-expanded={extraOpen}
                            disabled={busy}
                          >
                            <Icon name={extraOpen ? 'close' : 'add'} size={18} />
                            Přidat položku
                          </button>
                        </div>
                      </div>
                      {extraOpen && (
                        <form className="cart__extra-form" onSubmit={addExtra}>
                          <input
                            className="input"
                            value={extraName}
                            onChange={(e) => setExtraName(e.target.value)}
                            maxLength={80}
                            placeholder="Co přikoupit (např. káva, toaletní papír)"
                            aria-label="Název položky"
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                          />
                          <input
                            className="input cart__extra-amount"
                            value={extraAmount}
                            onChange={(e) => setExtraAmount(e.target.value)}
                            maxLength={40}
                            placeholder="Množství"
                            aria-label="Množství (volitelné)"
                          />
                          <button type="submit" className="btn btn--sm btn--auto" disabled={!extraName.trim()}>
                            Přidat
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="list-card cart__matched">
                      {buy.map((it) => (
                        <ShopItem
                          key={it.key}
                          item={it}
                          need={needs[it.key]}
                          entry={results[it.key]}
                          pick={picks[it.key] || { idx: -1, qty: 1, skip: true }}
                          busy={busy}
                          loading={!!itemBusy[it.key]}
                          xtra={shop.xtra}
                          onPick={(patch) => setPick(it.key, patch)}
                          onSearch={(q) => searchItem(it, q)}
                        />
                      ))}
                    </div>
                  </div>
                  {!isDesktop && total > 0 && total < MIN_ORDER_KC && (
                    <div className="cart__min">
                      <Icon name="info" size={18} />
                      Minimální objednávka na Rohlíku je {formatKc(MIN_ORDER_KC)} – chybí{' '}
                      {formatKc(MIN_ORDER_KC - total)}. Zbytek můžete doplnit v aplikaci Rohlík.
                    </div>
                  )}
                  {!isDesktop && savingsLine}
                  {!isDesktop && (
                    <div className="sticky-action">
                      <button
                        type="button"
                        className="btn btn--dark cart__submit"
                        onClick={toCart}
                        disabled={busy || chosen.length === 0}
                      >
                        <span>
                          {step === 'filling' ? 'Vkládám do košíku…' : submitLabel}
                        </span>
                        {step === 'filling' ? <Spinner small /> : <strong>{formatKc(total)}</strong>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            {isDesktop && panel}
          </div>
        </>
      )}

      {regSheetEl}
      <Toast text={toast} onDone={clearToast} />
    </div>
  );
}
