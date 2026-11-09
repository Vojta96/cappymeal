import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { Icon, Spinner, Toast, Toggle } from '../components/ui';
import ClearCartSheet from '../components/ClearCartSheet';
import { dayInfo, plural } from '../lib/dates';
import { formatKc } from '../lib/meals';
import {
  COURIER_NOTE_MAX,
  SETTABLE_PAYMENTS,
  SLOT_DAYS,
  dayTabLabel,
  defaultDayTab,
  deliveryPrefs,
  recommendSlot,
} from '../lib/checkout';
import { readStorage, writeStorage } from '../lib/storage';
import { clearSession, loadSession, sessionProducts, updateSession } from '../lib/shopSession';
import {
  fillCart,
  getRohlikCart,
  getRohlikCheckout,
  getRohlikCheckoutLink,
  getRohlikTimeslots,
  needsReconnect,
  syncRohlikOrders,
  updateRohlikCheckout,
} from '../services/rohlik';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './cart.css';
import './checkout.css';

export const ROHLIK_URL = 'https://www.rohlik.cz/';
export const ADDED_KEY = 'cappymeal-cart-added';
const QTY_DELAY = 700;

const UPDATE_ERROR = {
  selectAddress: 'Adresu se nepodařilo změnit.',
  selectSlot: 'Tento termín se nepodařilo vybrat. Zkuste jiný.',
  setPayment: 'Způsob platby se nepodařilo změnit.',
  setPackaging: 'Balení se nepodařilo změnit.',
  setCourierNote: 'Poznámku se nepodařilo uložit.',
  toggleDeliveryNote: 'Nastavení dokladu se nepodařilo změnit.',
  updateCartItem: 'Množství se nepodařilo změnit.',
  removeCartItem: 'Položku se nepodařilo odebrat.',
};

function Section({ n, title, children, aside }) {
  return (
    <section className="co-card">
      <div className="co-card__head">
        <span className="co-card__n">{n}</span>
        <h2 className="co-card__title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function CartRow({ item, qty, busy, before, onQty, onRemove }) {
  const max = item.maxQuantity || 50;
  return (
    <div className="co-item">
      <div className="cart__pimg co-item__img">
        {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <Icon name="grocery" size={24} />}
      </div>
      <div className="co-item__body">
        <div className="co-item__name">{item.name}</div>
        <div className="co-item__sub">
          {[item.unit, item.unitPriceText ? `${item.unitPriceText}/ks` : ''].filter(Boolean).join(' · ')}
          {before && <span className="co-item__before">už v košíku</span>}
          {item.sale && <span className="co-item__sale">Akce</span>}
        </div>
      </div>
      <div className="co-item__side">
        <strong className="co-item__price">{item.priceText}</strong>
        <div className="row" style={{ gap: 6 }}>
          <div className="stepper">
            <button
              type="button"
              onClick={() => (qty <= 1 ? onRemove() : onQty(qty - 1))}
              aria-label={qty <= 1 ? `Odebrat ${item.name}` : `Méně – ${item.name}`}
              disabled={busy}
            >
              <Icon name={qty <= 1 ? 'delete' : 'remove'} size={18} />
            </button>
            <span aria-live="polite">{qty}</span>
            <button
              type="button"
              onClick={() => onQty(qty + 1)}
              aria-label={`Více – ${item.name}`}
              disabled={busy || qty >= max}
            >
              <Icon name="add" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartCheckout() {
  const { hid, horizon, todayKey, statusOf, setOrderStatus, clearOrder, rohlik, settings, deliveries } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const st = location.state || {};
  const connected = !!(rohlik && rohlik.connected);
  const prefs = deliveryPrefs(settings);

  // The shopping session (src/lib/shopSession.js): days, CappyMeal's products and this screen's UI choices
  // survive leaving the screen, a reload and the PWA being killed while the user is in the Rohlík app.
  const [session0] = useState(() => loadSession(hid));
  const savedUi = (session0 && session0.checkout) || {};
  // Days of this shopping: from the cart screen, else the stored session, else the days waiting in the cart.
  const [days] = useState(() => {
    if (st.days && st.days.length) return st.days;
    if (session0 && session0.submittedDays && session0.submittedDays.length) {
      const own = session0.submittedDays.filter((k) => horizon.includes(k));
      if (own.length) return own;
    }
    return horizon.filter((k) => statusOf(k) === 'in_cart');
  });
  const label = days.map((k) => dayInfo(k).shortLabel).join(', ');
  const [addedList, setAddedList] = useState(() => {
    const ids = st.addedIds || (session0 && session0.addedIds) || readStorage('sessionStorage', ADDED_KEY, []);
    return (Array.isArray(ids) ? ids : []).map(String);
  });
  const addedIds = useMemo(() => new Set(addedList), [addedList]);
  const noteKey = `cappymeal-co-note-${hid}`;

  const [cart, setCart] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [dayTab, setDayTab] = useState(() =>
    Number.isInteger(savedUi.dayTab) && savedUi.dayTab >= 0 && savedUi.dayTab < SLOT_DAYS
      ? savedUi.dayTab
      : defaultDayTab(todayKey, days, prefs.lead)
  );
  const [slots, setSlots] = useState({}); // day -> { loading, list, error }
  // slot id chosen here (kept in the session until Rohlík's checkout shows it)
  const [picked, setPicked] = useState(() => (typeof savedUi.picked === 'string' ? savedUi.picked : null));
  const [busy, setBusy] = useState(''); // what is being saved
  const [qtyDraft, setQtyDraft] = useState({}); // productId -> quantity waiting to be sent
  // Courier note draft: sessionStorage only (may hold a door code – never kept for days in localStorage).
  const [noteDraft, setNoteDraft] = useState(() => {
    const v = readStorage('sessionStorage', noteKey, null);
    return typeof v === 'string' ? v : null;
  }); // null = untouched
  const [link, setLink] = useState(null);
  const [phase, setPhase] = useState('prepare'); // prepare | waiting | ordered | cleared
  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);
  const touched = useRef(new Set());
  const qtyTimers = useRef({});
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const timers = qtyTimers.current;
    return () => {
      alive.current = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const onError = useCallback((e, fallback) => {
    if (!alive.current) return;
    if (needsReconnect(e)) setLoadError(e);
    else if (e && e.message && ['RATE_LIMITED', 'ROHLIK_UNAVAILABLE', 'unavailable', 'deadline-exceeded'].includes(e.reason)) {
      setToast(e.message);
    } else setToast(fallback || 'Rohlík teď neodpovídá.');
  }, []);

  // ---------- session persistence ----------
  useEffect(() => {
    // Only alongside a shopping session of this device (never creates one).
    if (!hid || !loadSession(hid)) return;
    updateSession(hid, { checkout: { dayTab, picked: picked || undefined } });
  }, [hid, dayTab, picked]);
  useEffect(() => {
    if (noteDraft === null) {
      try {
        window.sessionStorage.removeItem(noteKey);
      } catch (e) {
        // ignore
      }
    } else writeStorage('sessionStorage', noteKey, noteDraft);
  }, [noteKey, noteDraft]);

  /** The order exists: the shopping is over, forget the session. */
  const endSession = useCallback(() => {
    clearSession(hid);
    try {
      window.sessionStorage.removeItem(ADDED_KEY);
      window.sessionStorage.removeItem(noteKey);
    } catch (e) {
      // ignore
    }
  }, [hid, noteKey]);

  /** The cart was emptied (on Rohlík or here): days are pending again, the picks stay for "Vložit znovu". */
  const markCleared = useCallback(() => {
    const s = loadSession(hid);
    if (s && s.submittedDays) {
      updateSession(hid, {
        submittedDays: undefined,
        submittedAt: undefined,
        step: 'matched',
        notice: 'reverted',
        daysSel: s.daysSel || s.submittedDays,
      });
    }
    if (alive.current) setPhase('cleared');
  }, [hid]);

  // ---------- sync: placed order / emptied cart ----------
  const handleSync = useCallback(
    (res) => {
      if (!res || !alive.current) return;
      if (res.result === 'ordered') {
        setOrder(res.order || {});
        setPhase('ordered');
        endSession();
      } else if (res.result === 'cleared') {
        markCleared();
      }
    },
    [endSession, markCleared]
  );

  // The household data may change under us (another device's sync, "Vrátit dny"): react to the days' statuses,
  // but only after they were seen in the cart here (right after filling, the subscription can lag behind).
  const seenInCart = useRef(false);
  const dayStates = days.map((k) => statusOf(k)).join();
  useEffect(() => {
    if (phase === 'ordered' || phase === 'cleared' || refilling) return;
    const sts = dayStates.split(',');
    if (sts.includes('in_cart')) {
      seenInCart.current = true;
      return;
    }
    if (!seenInCart.current) return;
    if (sts.includes('ordered')) {
      setPhase('ordered');
      endSession();
    } else if (sts.includes('pending')) markCleared();
  }, [dayStates, phase, refilling, endSession, markCleared]);

  const runSync = useCallback(
    (force) => {
      if (!connected) return Promise.resolve();
      return syncRohlikOrders({ force })
        .then(handleSync)
        .catch(() => {});
    },
    [connected, handleSync]
  );

  useEffect(() => {
    runSync(false);
  }, [runSync]);

  // Back from the Rohlík tab/app: check right away.
  useEffect(() => {
    if (!connected || phase === 'ordered') return undefined;
    const onBack = () => {
      if (document.visibilityState === 'visible') runSync(true);
    };
    window.addEventListener('focus', onBack);
    document.addEventListener('visibilitychange', onBack);
    return () => {
      window.removeEventListener('focus', onBack);
      document.removeEventListener('visibilitychange', onBack);
    };
  }, [connected, phase, runSync]);

  // ---------- initial load ----------
  const load = useCallback(() => {
    getRohlikCart()
      .then((r) => alive.current && setCart(r.cart))
      .catch((e) => {
        if (alive.current) setLoadError(e);
      });
    getRohlikCheckout({ applyDefaults: true, skip: [] })
      .then((r) => {
        if (!alive.current) return;
        setCheckout(r.checkout);
        return getRohlikCheckoutLink()
          .then((l) => alive.current && setLink(l.url))
          .catch(() => {});
      })
      .catch((e) => {
        if (alive.current) setLoadError(e);
      });
  }, []);
  useEffect(() => {
    if (!connected || !days.length) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Timeslots of the open day tab (once per tab).
  useEffect(() => {
    if (!connected || !days.length || slots[dayTab]) return;
    setSlots((s) => ({ ...s, [dayTab]: { loading: true, list: [] } }));
    getRohlikTimeslots(dayTab)
      .then((r) => alive.current && setSlots((s) => ({ ...s, [dayTab]: { loading: false, list: r.slots || [] } })))
      .catch((e) => {
        if (!alive.current) return;
        setSlots((s) => ({ ...s, [dayTab]: { loading: false, list: [], error: e.message || 'Termíny se nepodařilo načíst.' } }));
      });
  }, [connected, days.length, dayTab, slots]);

  // ---------- updates ----------
  const update = useCallback(
    async (action, payload, key, field) => {
      if (field) touched.current.add(field);
      setBusy(key || action);
      try {
        const r = await updateRohlikCheckout(action, payload);
        if (!alive.current) return null;
        if (r.checkout) setCheckout(r.checkout);
        if (r.cart) setCart(r.cart);
        return r;
      } catch (e) {
        onError(e, UPDATE_ERROR[action]);
        return null;
      } finally {
        if (alive.current) setBusy('');
      }
    },
    [onError]
  );

  const setQty = (item, q) => {
    const quantity = Math.max(0, Math.min(item.maxQuantity || 50, q));
    setQtyDraft((d) => ({ ...d, [item.productId]: quantity }));
    clearTimeout(qtyTimers.current[item.productId]);
    qtyTimers.current[item.productId] = setTimeout(async () => {
      await update('updateCartItem', { productId: item.productId, quantity }, `cart:${item.productId}`);
      if (alive.current) {
        setQtyDraft((d) => {
          const n = { ...d };
          delete n[item.productId];
          return n;
        });
      }
    }, QTY_DELAY);
  };

  const removeItem = async (item) => {
    clearTimeout(qtyTimers.current[item.productId]);
    const r = await update('removeCartItem', { productId: item.productId }, `cart:${item.productId}`);
    if (r) setToast(`${item.name} odebráno z košíku`);
  };

  const selectSlot = async (slot) => {
    if (!slot.available || !slot.id) return;
    const prev = picked;
    setPicked(slot.id);
    const r = await update(
      'selectSlot',
      slot.reservable ? { slotId: slot.id, reserve: true, slotType: slot.type } : { slotId: slot.id },
      'slot'
    );
    if (!r) setPicked(prev);
  };

  const saveNote = async () => {
    const note = (noteDraft || '').trim().slice(0, COURIER_NOTE_MAX);
    const r = await update('setCourierNote', { note }, 'note', 'courierNote');
    if (r) {
      setNoteDraft(null);
      setToast('Poznámka pro kurýra je uložená');
    }
  };

  // ---------- final step: confirm + pay in Rohlík ----------
  const openRohlik = async () => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
      setPhase('waiting');
      return;
    }
    // Link not ready yet: open the tab synchronously (popup blockers), then point it at the link.
    const w = window.open('', '_blank');
    let url = ROHLIK_URL;
    try {
      const r = await getRohlikCheckoutLink();
      if (r && r.url) url = r.url;
    } catch (e) {
      setToast('Odkaz na pokladnu se nepodařilo získat – otevírám Rohlík.');
    }
    if (w) {
      w.opener = null;
      w.location.href = url;
    } else {
      window.location.href = url;
    }
    setPhase('waiting');
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const r = await syncRohlikOrders({ force: true, minGapMs: 0 });
      handleSync(r);
      if (r && r.result === 'none') setToast('Objednávku na Rohlíku zatím nevidíme.');
    } catch (e) {
      onError(e, 'Kontrola se nepovedla. Zkuste to znovu.');
    } finally {
      if (alive.current) setChecking(false);
    }
  };

  const finishManually = async () => {
    setManualBusy(true);
    try {
      await setOrderStatus(days, 'ordered');
      endSession();
      navigate('/', { replace: true });
    } catch (e) {
      setManualBusy(false);
      setToast('Nepodařilo se uložit. Zkontrolujte připojení.');
    }
  };

  const cancelDays = async () => {
    if (!window.confirm('Vrátit tyto dny mezi neobjednané? Košík na Rohlíku tím neměníme.')) return;
    setManualBusy(true);
    try {
      await Promise.all(days.map((d) => clearOrder(d)));
      markCleared();
      navigate('/cart', { replace: true });
    } catch (e) {
      setManualBusy(false);
      setToast('Nepodařilo se uložit. Zkontrolujte připojení.');
    }
  };

  /** "Vložit znovu do košíku": the same picks of the stored session, one tap. */
  const refillProducts = phase === 'cleared' ? sessionProducts(loadSession(hid)) : [];
  const refill = async () => {
    setRefilling(true);
    try {
      const res = await fillCart(days, refillProducts);
      if (!res || (!res.ok && !res.added)) throw new Error('Do košíku se nepodařilo nic vložit.');
      const failedIds = new Set((res.failed || []).map((f) => String(f.productId)));
      const ids = refillProducts.map((p) => p.productId).filter((id) => !failedIds.has(id));
      rememberAdded(ids);
      updateSession(hid, {
        submittedDays: days,
        submittedAt: Date.now(),
        addedIds: ids,
        step: 'checkout',
        notice: undefined,
        daysSel: days,
      });
      if (!alive.current) return;
      setAddedList(ids);
      seenInCart.current = false;
      setCart(null);
      setCheckout(null);
      setLoadError(null);
      setPhase('prepare');
      load();
      setToast(`Do košíku jsme znovu vložili ${res.added} ${plural(res.added, 'položku', 'položky', 'položek')}.`);
    } catch (e) {
      onError(e, e && e.message ? e.message : 'Do košíku se nepodařilo nic vložit.');
    } finally {
      if (alive.current) setRefilling(false);
    }
  };

  /** "Vysypat košík" done. */
  const onCartCleared = (res, mode) => {
    setClearOpen(false);
    if (res.cart) setCart(res.cart);
    const emptied = !!(res.cart && res.cart.count === 0);
    if ((res.days && res.days.length) || emptied || (mode === 'added' && res.ok)) {
      setToast(emptied || mode === 'all' ? 'Košík je prázdný' : 'Nákup z CappyMeal je z košíku odebraný');
      markCleared();
    } else {
      setToast('Některé položky se nepodařilo odebrat. Zkontrolujte košík na Rohlíku.');
    }
  };

  const manualLinks = (
    <div className="co-manual">
      <button type="button" className="link-btn" onClick={finishManually} disabled={manualBusy}>
        Objednávku jsem dokončil(a)
      </button>
      <button type="button" className="link-btn" onClick={cancelDays} disabled={manualBusy}>
        Košík jsem zrušil – vrátit dny mezi neobjednané
      </button>
    </div>
  );

  // ---------- simple states ----------
  if (phase === 'ordered') {
    // Delivery window: from the sync result, else from the stored delivery (server parsed it), else nothing.
    const stored = order && order.id != null && deliveries ? deliveries[String(order.id)] : null;
    const deliveryText = (order && order.delivery && order.delivery.text) || (stored && stored.text) || '';
    const slotText = deliveryText ? '' : order && order.slotText;
    return (
      <div className="screen screen--fill done">
        <div className="done__icon">
          <Icon name="task_alt" size={50} />
        </div>
        <h1 className="done__title">Objednávka přijata ✓</h1>
        <div className="done__text">
          Rohlík objednávku potvrdil{slotText ? ` – doručení ${slotText}` : ''}
          {order && order.totalText ? ` (${order.totalText})` : ''}. Připomínky pro tyto dny jsme vypnuli.
        </div>
        {deliveryText && (
          <div className="done__delivery" data-testid="done-delivery">
            <Icon name="local_shipping" size={20} />
            Doručení {deliveryText}
          </div>
        )}
        <div className="done__actions">
          <button type="button" className="btn" onClick={() => navigate('/', { replace: true })}>
            Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'cleared') {
    const canRefill = connected && refillProducts.length > 0;
    return (
      <div className="screen screen--fill done">
        <div className="done__icon" style={{ background: 'var(--alert-bg)', color: 'var(--alert-text)' }}>
          <Icon name="remove_shopping_cart" size={46} />
        </div>
        <h1 className="done__title">Košík je prázdný</h1>
        <div className="done__text">
          Košík na Rohlíku je prázdný a objednávka z něj nevznikla, proto jsou dny {label} zase mezi neobjednanými.
          {canRefill ? ' Váš výběr produktů zůstal uložený – můžete ho vložit do košíku znovu.' : ''}
        </div>
        <div className="done__actions">
          {canRefill && (
            <button type="button" className="btn btn--dark" onClick={refill} disabled={refilling}>
              {refilling ? <Spinner small /> : <Icon name="add_shopping_cart" />}
              {refilling ? 'Vkládám do košíku…' : 'Vložit znovu do košíku'}
            </button>
          )}
          <button
            type="button"
            className={canRefill ? 'btn btn--ghost' : 'btn'}
            onClick={() => navigate('/cart', { replace: true })}
            disabled={refilling}
          >
            {canRefill ? 'Upravit nákup' : 'Zpět na nákup'}
          </button>
        </div>
        <Toast text={toast} onDone={clearToast} />
      </div>
    );
  }

  if (!days.length) {
    return (
      <div className="screen screen--fill done">
        <div className="done__icon">
          <Icon name="check" size={50} />
        </div>
        <h1 className="done__title">Hotovo</h1>
        <div className="done__text">Žádný košík nečeká na dokončení.</div>
        <div className="done__actions">
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  const intro =
    typeof st.added === 'number'
      ? `Do košíku na Rohlíku jsme vložili ${st.added} ${plural(st.added, 'položku', 'položky', 'položek')} na ${label}.${
          st.failed > 0 ? ` ${st.failed} ${plural(st.failed, 'položku', 'položky', 'položek')} se nepodařilo přidat.` : ''
        }`
      : `Suroviny na ${label} čekají v košíku na Rohlíku.`;

  const header = (
    <div className="stack" style={{ gap: 4 }}>
      <button type="button" className="link-btn co-back" onClick={() => navigate('/cart')}>
        <Icon name="arrow_back" size={18} />
        Nákup
      </button>
      <h1 className="h-title" style={{ lineHeight: 1 }}>
        Objednávka
      </h1>
      <div className="co-intro">{intro}</div>
    </div>
  );

  // Not connected / login expired: the old manual flow.
  if (!connected || needsReconnect(loadError)) {
    return (
      <div className="screen screen--fill" style={{ gap: 18 }}>
        {header}
        <div className="cart__fallback">
          <div className="cart__fallback-title">Účet Rohlík není připojený</div>
          <div className="cart__fallback-text">
            {loadError && loadError.message ? `${loadError.message} ` : ''}
            Objednávku dokončete v aplikaci Rohlík a pak ji tu označte jako dokončenou – připomínky se vypnou.
          </div>
          <div className="cart__fallback-actions">
            <a className="btn btn--sm" href={ROHLIK_URL} target="_blank" rel="noopener noreferrer">
              <Icon name="open_in_new" size={19} />
              Otevřít Rohlík
            </a>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => navigate('/settings')}>
              <Icon name="settings" size={19} />
              Připojit účet v Nastavení
            </button>
          </div>
        </div>
        {manualLinks}
        <Toast text={toast} onDone={clearToast} />
      </div>
    );
  }

  const loading = !cart || !checkout;
  const items = (cart && cart.items) || [];
  const daySlots = slots[dayTab] || { loading: true, list: [] };
  const selectedSlotId = picked || (checkout && checkout.slot.id) || null;
  const recommended = selectedSlotId ? -1 : recommendSlot(daySlots.list, prefs.window);
  const missingMin = cart && !cart.minOrderOk && cart.minOrder ? Math.max(0, cart.minOrder - cart.total) : 0;
  const cartEmpty = !!cart && items.length === 0;

  const cartSection = (
    <Section
      n={1}
      title="Košík na Rohlíku"
      aside={cart ? <span className="co-card__meta">{items.length} {plural(items.length, 'položka', 'položky', 'položek')}</span> : null}
    >
      {!cart ? (
        <div className="co-skel">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 14 }} />
          ))}
        </div>
      ) : cartEmpty ? (
        <div className="co-empty">Košík na Rohlíku je prázdný.</div>
      ) : (
        <>
          <div className="co-items">
            {items.map((it) => (
              <CartRow
                key={it.productId}
                item={it}
                qty={qtyDraft[it.productId] !== undefined ? qtyDraft[it.productId] : it.quantity}
                busy={busy === `cart:${it.productId}`}
                before={addedIds.size > 0 && !addedIds.has(String(it.productId))}
                onQty={(q) => setQty(it, q)}
                onRemove={() => removeItem(it)}
              />
            ))}
            <div className="co-total">
              <span>Zboží celkem</span>
              <strong>{cart.totalText}</strong>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--danger btn--sm btn--auto co-clear"
            onClick={() => setClearOpen(true)}
            disabled={!!busy}
          >
            <Icon name="delete_sweep" size={19} />
            Vysypat košík
          </button>
        </>
      )}
    </Section>
  );

  const deliverySection = (
    <Section n={2} title="Doručení">
      {!checkout ? (
        <div className="skeleton" style={{ height: 40, borderRadius: 12 }} />
      ) : checkout.addresses.length > 1 ? (
        <div className="co-options" role="radiogroup" aria-label="Adresa doručení">
          {checkout.addresses.map((a) => (
            <button
              type="button"
              key={a.id}
              role="radio"
              aria-checked={a.selected}
              className={`co-option${a.selected ? ' co-option--on' : ''}`}
              disabled={!!busy}
              onClick={() => !a.selected && update('selectAddress', { addressId: a.id }, 'address', 'address')}
            >
              <Icon name={a.selected ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
              <span>{a.label}</span>
              {!a.deliveredTo && <span className="co-option__hint">mimo oblast</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="co-line">
          <Icon name="location_on" size={20} />
          <span>{checkout.address.label || 'Adresu zvolíte na Rohlíku'}</span>
        </div>
      )}

      <div className="segment co-days" role="tablist" aria-label="Den doručení">
        {Array.from({ length: SLOT_DAYS }, (_, i) => (
          <button
            type="button"
            key={i}
            role="tab"
            aria-selected={dayTab === i}
            className={dayTab === i ? 'on' : ''}
            onClick={() => setDayTab(i)}
          >
            {dayTabLabel(i, todayKey)}
          </button>
        ))}
      </div>

      {daySlots.loading ? (
        <div className="co-slots">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 54, borderRadius: 14 }} />
          ))}
        </div>
      ) : daySlots.error ? (
        <div className="co-empty">{daySlots.error}</div>
      ) : daySlots.list.length === 0 ? (
        <div className="co-empty">Na tento den Rohlík nenabízí žádné termíny.</div>
      ) : (
        <div className="co-slots" role="radiogroup" aria-label="Čas doručení">
          {daySlots.list.map((s, i) => {
            const on = !!s.id && s.id === selectedSlotId;
            return (
              <button
                type="button"
                key={`${s.id || 'x'}-${s.label}-${s.type}`}
                role="radio"
                aria-checked={on}
                className={`co-slot${on ? ' co-slot--on' : ''}${i === recommended ? ' co-slot--rec' : ''}`}
                disabled={!s.available || busy === 'slot'}
                onClick={() => selectSlot(s)}
              >
                <span className="co-slot__time">{s.label}</span>
                <span className="co-slot__price">{s.available ? s.priceText || ' ' : 'Obsazeno'}</span>
                {i === recommended && <span className="co-slot__badge">Doporučeno</span>}
              </button>
            );
          })}
        </div>
      )}
      {checkout && checkout.slot.id && checkout.slot.text && (
        <div className="co-note">
          <Icon name="schedule" size={18} />
          Vybráno: {checkout.slot.text}
        </div>
      )}
    </Section>
  );

  const paymentSection = (
    <Section n={3} title="Platba">
      {!checkout ? (
        <div className="skeleton" style={{ height: 40, borderRadius: 12 }} />
      ) : (
        <>
          <div className="co-options" role="radiogroup" aria-label="Způsob platby">
            {checkout.payment.methods.map((m) => (
              <button
                type="button"
                key={m.id}
                role="radio"
                aria-checked={m.selected}
                className={`co-option${m.selected ? ' co-option--on' : ''}`}
                disabled={!!busy || (!m.settable && !m.selected)}
                onClick={() => m.settable && !m.selected && update('setPayment', { method: m.id }, 'payment', 'payment')}
              >
                <Icon name={m.selected ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                <span>{m.label}</span>
                {!m.settable && <span className="co-option__hint">zvolíte na Rohlíku</span>}
              </button>
            ))}
          </div>
          <div className="co-hint">
            Kartu ani platební údaje CappyMeal nikdy nevidí – online platba proběhne až na Rohlíku.
          </div>
          {checkout.receipt && (
            <button
              type="button"
              className="co-switch"
              role="switch"
              aria-checked={!checkout.receipt.doNotPrint}
              disabled={!!busy}
              onClick={() =>
                update('toggleDeliveryNote', { doNotPrint: !checkout.receipt.doNotPrint }, 'receipt')
              }
            >
              <span>Tištěný doklad k objednávce</span>
              <Toggle on={!checkout.receipt.doNotPrint} />
            </button>
          )}
        </>
      )}
    </Section>
  );

  const noteValue = noteDraft !== null ? noteDraft : (checkout && checkout.courier.note) || '';
  const noteSection = (
    <Section n={4} title="Pro kurýra">
      {!checkout ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
      ) : (
        <>
          <textarea
            className="input co-textarea"
            value={noteValue}
            maxLength={COURIER_NOTE_MAX}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Např. kód od vchodu, patro, kam nechat nákup (nepovinné)"
            aria-label="Poznámka pro kurýra"
            rows={3}
          />
          {noteDraft !== null && noteDraft !== ((checkout && checkout.courier.note) || '') && (
            <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <span className="co-hint">
                {noteValue.length}/{COURIER_NOTE_MAX}
              </span>
              <button type="button" className="btn btn--sm btn--auto" onClick={saveNote} disabled={busy === 'note'}>
                {busy === 'note' ? <Spinner small /> : 'Uložit poznámku'}
              </button>
            </div>
          )}
          {checkout.courier.callOnArrival !== null && (
            <button
              type="button"
              className="co-switch"
              role="switch"
              aria-checked={checkout.courier.callOnArrival}
              disabled={!!busy}
              onClick={() => update('setCourierNote', { callOnArrival: !checkout.courier.callOnArrival }, 'call')}
            >
              <span>Kurýr zavolá při příjezdu</span>
              <Toggle on={checkout.courier.callOnArrival} />
            </button>
          )}
          <div className="co-sub">Balení</div>
          <div className="segment co-pack" role="radiogroup" aria-label="Balení">
            {checkout.packaging.options.map((p) => (
              <button
                type="button"
                key={p.id}
                role="radio"
                aria-checked={p.selected}
                className={p.selected ? 'on' : ''}
                disabled={!!busy}
                onClick={() => !p.selected && update('setPackaging', { packaging: p.id }, 'packaging', 'packaging')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </Section>
  );

  // Paying on delivery (card / cash at the door) → nothing is paid on Rohlík, the order is only confirmed.
  const selectedPayment =
    checkout && checkout.payment && (checkout.payment.methods || []).find((m) => m.selected);
  const payOnDelivery = !!(selectedPayment && SETTABLE_PAYMENTS.includes(selectedPayment.id));
  const confirmBtn = (
    <button
      type="button"
      className="btn btn--dark co-confirm"
      onClick={openRohlik}
      disabled={loading || cartEmpty || !!busy}
    >
      <Icon name="open_in_new" />
      Odeslat objednávku v aplikaci Rohlík
    </button>
  );

  const summary = (
    <section className="co-card co-summary">
      <div className="co-card__head">
        <span className="co-card__n">5</span>
        <h2 className="co-card__title">Souhrn</h2>
      </div>
      {!checkout || !cart ? (
        <div className="co-skel">
          <div className="skeleton" style={{ height: 16, width: '70%' }} />
          <div className="skeleton" style={{ height: 16, width: '55%' }} />
          <div className="skeleton" style={{ height: 28, width: '40%' }} />
        </div>
      ) : (
        <>
          {checkout.totals.lines.length > 0 ? (
            <div className="co-lines">
              {checkout.totals.lines.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="co-lines__row">
                  <span>{l.label}</span>
                  <span>{l.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="co-lines__row">
              <span>Zboží</span>
              <span>{cart.totalText}</span>
            </div>
          )}
          <div className="co-total co-total--big">
            <span>Celkem</span>
            <strong>{checkout.totals.estimated || cart.totalText || formatKc(cart.total)}</strong>
          </div>
          {checkout.totals.cardHold && checkout.totals.cardHold !== checkout.totals.estimated && (
            <div className="co-hint">Při platbě kartou online Rohlík dočasně blokuje {checkout.totals.cardHold}.</div>
          )}
          {checkout.totals.note && <div className="co-hint">{checkout.totals.note}</div>}
          {missingMin > 0 && (
            <div className="cart__min">
              <Icon name="info" size={18} />
              Minimální objednávka je {cart.minOrderText} – chybí {formatKc(missingMin)}.
            </div>
          )}
          {checkout.warnings.length > 0 && (
            <ul className="co-warnings">
              {checkout.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {phase === 'waiting' ? (
        <div className="co-waiting">
          <div className="row" style={{ gap: 10 }}>
            <Spinner small />
            <span>Čekáme, až objednávku potvrdíte na Rohlíku…</span>
          </div>
          <button type="button" className="btn btn--soft btn--sm" onClick={checkNow} disabled={checking}>
            {checking ? <Spinner small /> : <Icon name="refresh" size={19} />}
            Zkontrolovat objednávku
          </button>
          <button type="button" className="link-btn" onClick={openRohlik}>
            Otevřít pokladnu Rohlíku znovu
          </button>
        </div>
      ) : (
        isDesktop && confirmBtn
      )}
      <div className="co-hint co-hint--center" data-testid="confirm-help">
        Rohlík vyžaduje, aby objednávku odeslal zákazník u nich – otevře se jejich pokladna s vším předvyplněným, stačí
        ji odeslat.{payOnDelivery ? '' : ' Zaplatíte až tam.'} Pak se vraťte sem, objednávku poznáme sami.
      </div>
      {manualLinks}
    </section>
  );

  return (
    <div className="screen screen--fill co" style={{ gap: 18 }}>
      {header}
      {loadError && !needsReconnect(loadError) && (
        <div className="cart__fallback">
          <div className="cart__fallback-title">Rohlík teď nespolupracuje</div>
          <div className="cart__fallback-text">
            {loadError.message || 'Zkuste to za chvíli.'} Objednávku můžete dokončit i přímo v aplikaci Rohlík.
          </div>
          <div className="cart__fallback-actions">
            <a className="btn btn--sm" href={ROHLIK_URL} target="_blank" rel="noopener noreferrer">
              <Icon name="open_in_new" size={19} />
              Otevřít Rohlík
            </a>
          </div>
        </div>
      )}
      <div className="co-cols">
        <div className="co-main">
          {cartSection}
          {deliverySection}
          {paymentSection}
          {noteSection}
          {!isDesktop && summary}
        </div>
        {isDesktop && <aside className="co-side">{summary}</aside>}
      </div>
      {!isDesktop && phase !== 'waiting' && <div className="sticky-action">{confirmBtn}</div>}
      <ClearCartSheet
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        cart={cart}
        addedIds={addedList}
        days={days}
        onCleared={onCartCleared}
      />
      <Toast text={toast} onDone={clearToast} />
    </div>
  );
}

/** Remembers which products CappyMeal just added (to mark the rest as "už v košíku"). */
export function rememberAdded(ids) {
  writeStorage('sessionStorage', ADDED_KEY, (ids || []).map(String).slice(0, 200));
}
