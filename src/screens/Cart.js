import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import RegularsSheet from '../components/RegularsSheet';
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
import { fillCart, matchProducts, needsReconnect } from '../services/rohlik';
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

function ProductImg({ url, className = 'cart__pimg' }) {
  return (
    <div className={className}>
      {url ? <img src={url} alt="" loading="lazy" /> : <Icon name="shopping_basket" size={22} />}
    </div>
  );
}

/** One shopping item with its Rohlík variants (up to 5) shown directly as cards. */
function MatchedItem({ item, candidates, pick, busy, onPick }) {
  const prod = !pick.skip && candidates[pick.idx];
  return (
    <div className={`cart__item${prod ? '' : ' cart__item--skip'}`}>
      <div className="cart__item-head">
        <div className="list-row__body">
          <div className="list-row__title">
            {item.name}
            {item.regular && <span className="cart__reg-badge">pravidelná</span>}
          </div>
          {item.amounts.length > 0 && <div className="list-row__sub ellipsis">{item.amounts.join(' + ')}</div>}
        </div>
        {prod && (
          <div className="stepper">
            <button
              type="button"
              onClick={() => onPick({ qty: pick.qty - 1 })}
              aria-label="Méně"
              disabled={busy || pick.qty <= 1}
            >
              <Icon name="remove" size={18} />
            </button>
            <span>{pick.qty}</span>
            <button
              type="button"
              onClick={() => onPick({ qty: pick.qty + 1 })}
              aria-label="Více"
              disabled={busy || pick.qty >= MAX_QTY}
            >
              <Icon name="add" size={18} />
            </button>
          </div>
        )}
      </div>
      {candidates.length > 0 ? (
        <div className="variants" role="radiogroup" aria-label={`Varianty – ${item.name}`}>
          {candidates.map((c, i) => {
            const on = !pick.skip && pick.idx === i;
            return (
              <button
                type="button"
                key={c.productId}
                role="radio"
                aria-checked={on}
                className={`variant${on ? ' variant--on' : ''}`}
                onClick={() => onPick({ idx: i, skip: false })}
                disabled={busy}
              >
                {on && <Icon name="check_circle" size={20} className="variant__check" />}
                <ProductImg url={c.imageUrl} className="variant__img" />
                <div className="variant__name">{c.name}</div>
                <div className="variant__meta">
                  <span className="variant__price">{c.priceText || (c.price != null ? formatKc(c.price) : '')}</span>
                  {c.unit && <span className="variant__unit">{c.unit}</span>}
                </div>
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={!!pick.skip}
            className={`variant variant--skip${pick.skip ? ' variant--on' : ''}`}
            onClick={() => onPick({ skip: true })}
            disabled={busy}
          >
            <Icon name="block" size={22} />
            Přeskočit
          </button>
        </div>
      ) : (
        <div className="cart__none">Rohlík nenašel žádný vhodný produkt.</div>
      )}
    </div>
  );
}

export default function Cart() {
  const {
    horizon,
    todayKey,
    plan,
    recipes,
    pantry,
    regulars,
    rohlik,
    pendingDays,
    statusOf,
    togglePantry,
    setOrderStatus,
  } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const [daysSel, setDaysSel] = useState(() => (location.state && location.state.days) || null);
  const [step, setStep] = useState('list'); // list | matching | matched | filling
  const [results, setResults] = useState({}); // key -> candidates[]
  const [picks, setPicks] = useState({}); // key -> { idx, qty, skip }
  const [error, setError] = useState(null); // CallError | Error | null
  const [regSel, setRegSel] = useState({}); // regular id -> bool (this shopping only)
  const [regSheet, setRegSheet] = useState(null); // 'add' | 'manage' | null
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);

  // Re-apply navigation state when arriving again from the plan button.
  useEffect(() => {
    if (location.state && location.state.days) setDaysSel(location.state.days);
  }, [location.key, location.state]);

  const connected = !!(rohlik && rohlik.connected);
  const mustConnect = !connected || needsReconnect(error);

  const days = useMemo(
    () => (daysSel || pendingDays).filter((k) => horizon.includes(k)).sort(),
    [daysSel, pendingDays, horizon],
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
  const allRegulars = useMemo(() => regularItems(regulars, regSel, { onlySelected: false }), [regulars, regSel]);
  const chosenRegulars = useMemo(() => allRegulars.filter((r) => isRegularSelected(r.id, r, regSel)), [
    allRegulars,
    regSel,
  ]);
  const buyIngredients = all.filter((it) => !isInPantry(it, pantry));
  const home = all.filter((it) => isInPantry(it, pantry));
  // Regulars are never auto-marked as "Mám doma"; they go first.
  const buy = [...chosenRegulars, ...buyIngredients];

  const resetMatch = () => {
    setStep('list');
    setResults({});
    setPicks({});
    setError(null);
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

  const findOnRohlik = async () => {
    setError(null);
    setStep('matching');
    try {
      const res = await matchProducts(buy.map((it) => ({ key: it.key, name: it.name, amounts: it.amounts })));
      const map = {};
      const p = {};
      ((res && res.results) || []).forEach((r) => {
        map[r.key] = (r.candidates || []).slice(0, 5);
      });
      buy.forEach((it) => {
        const c = map[it.key] || [];
        p[it.key] = { idx: 0, qty: 1, skip: c.length === 0 };
      });
      setResults(map);
      setPicks(p);
      setStep('matched');
    } catch (e) {
      setError(e);
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
    setError(null);
    setStep('filling');
    try {
      const res = await fillCart(
        days,
        chosen.map((x) => ({ productId: String(x.product.productId), quantity: x.qty })),
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
    navigate('/', { replace: true });
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

  const connectCard = (
    <div className="cart__fallback">
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="alert-card__icon" style={{ background: 'var(--alert-icon-bg)' }}>
          <Icon name="link_off" size={21} />
        </div>
        <div className="stack" style={{ gap: 3 }}>
          <div className="cart__fallback-title">
            {connected ? 'Účet Rohlík je potřeba připojit znovu' : 'Připojte účet Rohlík'}
          </div>
          <div className="cart__fallback-text">
            {connected && errorText ? `${errorText} ` : ''}
            Aby šel nákup vložit rovnou do košíku, připojte v Nastavení účet Rohlík vaší domácnosti. Mezitím si
            seznam můžete zkopírovat a objednat ručně.
          </div>
        </div>
      </div>
      <div className="cart__fallback-actions">
        <button type="button" className="btn btn--sm" onClick={() => navigate('/notifications')}>
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
            {step === 'filling' ? 'Vkládám do košíku…' : 'Vložit do košíku na Rohlíku'}
          </button>
          <div className="cart__panel-note">
            Objednávku pak potvrdíte v aplikaci Rohlík, kde zvolíte i čas doručení.
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
        <div className="cart__days-label">Objednat na dny</div>
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
                    <div className="row--between" style={{ alignItems: 'baseline' }}>
                      <h2 className="h-section">Vyberte produkty</h2>
                      <button type="button" className="link-btn" onClick={resetMatch} disabled={busy}>
                        Upravit seznam
                      </button>
                    </div>
                    <div className="list-card cart__matched">
                      {buy.map((it) => (
                        <MatchedItem
                          key={it.key}
                          item={it}
                          candidates={results[it.key] || []}
                          pick={picks[it.key] || { idx: 0, qty: 1, skip: true }}
                          busy={busy}
                          onPick={(patch) => setPick(it.key, patch)}
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
                  {!isDesktop && (
                    <div className="sticky-action">
                      <button
                        type="button"
                        className="btn btn--dark cart__submit"
                        onClick={toCart}
                        disabled={busy || chosen.length === 0}
                      >
                        <span>
                          {step === 'filling' ? 'Vkládám do košíku…' : 'Vložit do košíku na Rohlíku'}
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
