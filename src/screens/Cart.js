import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import BottomSheet from '../components/BottomSheet';
import { Icon, Spinner, Toast } from '../components/ui';
import { dayInfo, plural } from '../lib/dates';
import {
  MIN_ORDER_KC,
  aggregateIngredients,
  formatKc,
  isInPantry,
  itemDetail,
  shoppingListText,
} from '../lib/meals';
import { fillCart, getRohlikStatus, matchProducts } from '../services/rohlik';
import './cart.css';

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

function ProductImg({ url }) {
  return (
    <div className="cart__pimg">
      {url ? <img src={url} alt="" loading="lazy" /> : <Icon name="shopping_basket" size={22} />}
    </div>
  );
}

export default function Cart() {
  const { horizon, todayKey, plan, recipes, pantry, pendingDays, statusOf, togglePantry, setOrderStatus } =
    useHousehold();
  const location = useLocation();
  const navigate = useNavigate();

  const [daysSel, setDaysSel] = useState(() => (location.state && location.state.days) || null);
  const [step, setStep] = useState('list'); // list | matching | matched | filling
  const [results, setResults] = useState({}); // key -> candidates[]
  const [picks, setPicks] = useState({}); // key -> { idx, qty, skip }
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [pickSheet, setPickSheet] = useState(null); // item key
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);

  // Re-apply navigation state when arriving again from the plan button.
  useEffect(() => {
    if (location.state && location.state.days) setDaysSel(location.state.days);
  }, [location.key, location.state]);

  // Warm up the function and learn early whether Rohlík is configured.
  useEffect(() => {
    let alive = true;
    getRohlikStatus()
      .then((s) => {
        if (alive && s && s.configured === false) setNotConfigured(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const days = useMemo(
    () => (daysSel || pendingDays).filter((k) => horizon.includes(k)).sort(),
    [daysSel, pendingDays, horizon]
  );
  const chipDays = useMemo(() => {
    const set = new Set(days);
    horizon.forEach((k) => {
      const st = statusOf(k);
      if (st === 'pending' || st === 'in_cart') set.add(k);
    });
    return [...set].sort();
  }, [days, horizon, statusOf]);

  const all = useMemo(() => aggregateIngredients(days, plan, recipes), [days, plan, recipes]);
  const buy = all.filter((it) => !isInPantry(it, pantry));
  const home = all.filter((it) => isInPantry(it, pantry));

  const resetMatch = () => {
    setStep('list');
    setResults({});
    setPicks({});
    setError('');
  };

  const toggleDay = (k) => {
    const on = days.includes(k);
    setDaysSel(on ? days.filter((x) => x !== k) : [...days, k].sort());
    resetMatch();
  };

  const findOnRohlik = async () => {
    setError('');
    setStep('matching');
    try {
      const res = await matchProducts(buy.map((it) => ({ key: it.key, name: it.name, amounts: it.amounts })));
      const map = {};
      const p = {};
      ((res && res.results) || []).forEach((r) => {
        map[r.key] = r.candidates || [];
      });
      buy.forEach((it) => {
        const c = map[it.key] || [];
        p[it.key] = { idx: 0, qty: 1, skip: c.length === 0 };
      });
      setResults(map);
      setPicks(p);
      setStep('matched');
    } catch (e) {
      setError(e.message || 'Rohlík teď neodpovídá.');
      setStep('list');
    }
  };

  const chosen = buy
    .map((it) => {
      const pk = picks[it.key];
      const c = results[it.key] || [];
      if (!pk || pk.skip || !c[pk.idx]) return null;
      return { item: it, product: c[pk.idx], qty: pk.qty };
    })
    .filter(Boolean);
  const total = chosen.reduce((a, x) => a + (Number(x.product.price) || 0) * x.qty, 0);

  const toCart = async () => {
    setError('');
    setStep('filling');
    try {
      const res = await fillCart(
        days,
        chosen.map((x) => ({ productId: x.product.productId, quantity: x.qty }))
      );
      if (!res || (!res.ok && !res.added)) {
        throw new Error('Do košíku se nepodařilo nic vložit.');
      }
      navigate('/cart/done', {
        state: {
          days,
          added: res.added,
          failed: (res.failed || []).length,
          cartTotalText: res.cartTotalText || formatKc(total),
        },
      });
    } catch (e) {
      setError(e.message || 'Rohlík teď neodpovídá.');
      setStep('matched');
    }
  };

  const copyList = async () => {
    const ok = await copyText(shoppingListText(buy, days));
    setToast(ok ? 'Seznam zkopírován' : 'Kopírování se nepovedlo');
  };

  const markOrdered = async () => {
    await setOrderStatus(days, 'ordered');
    navigate('/', { replace: true });
  };

  const setPick = (key, patch) => setPicks((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const showFallback = !!error || notConfigured;
  const sheetItem = pickSheet ? buy.find((it) => it.key === pickSheet) : null;

  // ---------- render ----------
  const header = (
    <div className="stack" style={{ gap: 4 }}>
      <h1 className="h-title" style={{ lineHeight: 1 }}>
        Nákup
      </h1>
      <div style={{ fontSize: 14, color: 'var(--muted-2)' }}>Suroviny z plánu se pošlou do košíku na Rohlíku</div>
    </div>
  );

  if (chipDays.length === 0) {
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

  return (
    <div className="screen screen--fill" style={{ gap: 18 }}>
      {header}

      <div className="stack">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Objednat na dny</div>
        <div className="chips">
          {chipDays.map((k) => {
            const d = dayInfo(k, todayKey);
            const on = days.includes(k);
            const inCart = statusOf(k) === 'in_cart';
            return (
              <button
                type="button"
                key={k}
                className={`chip${on ? ' chip--on' : ''}`}
                style={{ height: 38, padding: '0 13px 0 9px' }}
                onClick={() => toggleDay(k)}
                disabled={busy}
              >
                <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} />
                {d.shortLabel}
                {inCart && <span className="cart__incart">v košíku</span>}
              </button>
            );
          })}
        </div>
      </div>

      {days.length === 0 || all.length === 0 ? (
        <div className="empty-card">
          <Icon name="event_busy" size={40} style={{ color: 'var(--muted-3)' }} />
          <div className="empty-card__title">{days.length ? 'Žádné suroviny' : 'Vyberte dny'}</div>
          <div className="empty-card__text">
            {days.length
              ? 'Vybrané dny nemají naplánovaná jídla se surovinami.'
              : 'Zvolte, na které dny chcete nakoupit.'}
          </div>
        </div>
      ) : (
        <>
          {showFallback && (
            <div className="cart__fallback">
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="alert-card__icon" style={{ background: 'var(--alert-icon-bg)' }}>
                  <Icon name="cloud_off" size={21} />
                </div>
                <div className="stack" style={{ gap: 3 }}>
                  <div className="cart__fallback-title">
                    {notConfigured && !error ? 'Rohlík zatím není propojený' : 'Rohlík teď nespolupracuje'}
                  </div>
                  <div className="cart__fallback-text">
                    {error || 'Propojení s Rohlíkem ještě není nastavené.'} Seznam si můžete zkopírovat a
                    objednat ručně v aplikaci Rohlík.
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
          )}

          {step === 'list' && (
            <>
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
                          <div className="list-row__title">{it.name}</div>
                          <div className="list-row__sub ellipsis">{itemDetail(it)}</div>
                        </div>
                        <button
                          type="button"
                          className="cart__home-btn"
                          onClick={() => togglePantry(it.key, true)}
                        >
                          Mám doma
                        </button>
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
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>Máme doma · {home.length}</div>
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
              {!notConfigured && buy.length > 0 && (
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
                <div className="row--between" style={{ alignItems: 'baseline' }}>
                  <h2 className="h-section">Košík na Rohlíku</h2>
                  <button type="button" className="link-btn" onClick={resetMatch} disabled={busy}>
                    Upravit seznam
                  </button>
                </div>
                <div className="list-card" style={{ padding: '4px 14px' }}>
                  {buy.map((it) => {
                    const pk = picks[it.key] || { idx: 0, qty: 1, skip: true };
                    const c = results[it.key] || [];
                    const prod = !pk.skip && c[pk.idx];
                    return (
                      <div key={it.key} className={`list-row cart__match${prod ? '' : ' cart__match--skip'}`}>
                        <button
                          type="button"
                          className="cart__match-main"
                          onClick={() => setPickSheet(it.key)}
                          disabled={busy}
                        >
                          <ProductImg url={prod && prod.imageUrl} />
                          <div className="list-row__body">
                            <div className="cart__for">
                              {it.name}
                              {it.amounts.length > 0 && ` · ${it.amounts.join(' + ')}`}
                            </div>
                            <div className="list-row__title cart__pname">
                              {prod ? prod.name : c.length ? 'Přeskočeno' : 'Nenalezeno'}
                            </div>
                            {prod && (
                              <div className="cart__price">
                                {prod.priceText || formatKc(prod.price)}
                                {prod.unit ? <span> · {prod.unit}</span> : null}
                              </div>
                            )}
                          </div>
                        </button>
                        {prod && (
                          <div className="stepper">
                            <button
                              type="button"
                              onClick={() =>
                                pk.qty <= 1 ? setPick(it.key, { skip: true }) : setPick(it.key, { qty: pk.qty - 1 })
                              }
                              aria-label="Méně"
                              disabled={busy}
                            >
                              <Icon name={pk.qty <= 1 ? 'delete' : 'remove'} size={18} />
                            </button>
                            <span>{pk.qty}</span>
                            <button
                              type="button"
                              onClick={() => setPick(it.key, { qty: pk.qty + 1 })}
                              aria-label="Více"
                              disabled={busy}
                            >
                              <Icon name="add" size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {total > 0 && total < MIN_ORDER_KC && (
                <div className="cart__min">
                  <Icon name="info" size={18} />
                  Minimální objednávka na Rohlíku je {formatKc(MIN_ORDER_KC)} – chybí {formatKc(MIN_ORDER_KC - total)}.
                  Zbytek můžete doplnit v aplikaci Rohlík.
                </div>
              )}
              <div className="sticky-action">
                <button
                  type="button"
                  className="btn btn--dark cart__submit"
                  onClick={toCart}
                  disabled={busy || chosen.length === 0}
                >
                  <span>{step === 'filling' ? 'Vkládám do košíku…' : 'Vložit do košíku na Rohlíku'}</span>
                  {step === 'filling' ? <Spinner small /> : <strong>{formatKc(total)}</strong>}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <BottomSheet
        open={!!sheetItem}
        onClose={() => setPickSheet(null)}
        title={sheetItem ? sheetItem.name : ''}
        sub={sheetItem ? itemDetail(sheetItem) : ''}
      >
        {sheetItem &&
          (results[sheetItem.key] || []).map((c, i) => {
            const on = !picks[sheetItem.key].skip && picks[sheetItem.key].idx === i;
            return (
              <button
                type="button"
                key={c.productId}
                className={`sheet-item${on ? ' sheet-item--on' : ''}`}
                onClick={() => {
                  setPick(sheetItem.key, { idx: i, skip: false });
                  setPickSheet(null);
                }}
              >
                <ProductImg url={c.imageUrl} />
                <div className="list-row__body">
                  <div className="list-row__title">{c.name}</div>
                  <div className="list-row__sub">
                    {c.priceText || formatKc(c.price)}
                    {c.unit ? ` · ${c.unit}` : ''}
                  </div>
                </div>
                <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} className="sheet-item__add" />
              </button>
            );
          })}
        {sheetItem && (results[sheetItem.key] || []).length === 0 && (
          <div className="muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: 14 }}>
            Rohlík nenašel žádný vhodný produkt.
          </div>
        )}
        {sheetItem && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginTop: 6 }}
            onClick={() => {
              setPick(sheetItem.key, { skip: true });
              setPickSheet(null);
            }}
          >
            Přeskočit
          </button>
        )}
      </BottomSheet>

      <Toast text={toast} onDone={clearToast} />
    </div>
  );
}
