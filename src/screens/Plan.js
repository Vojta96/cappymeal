import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { deliveryOnDay, deliveryTimeText } from '../lib/deliveries';
import BottomSheet from '../components/BottomSheet';
import MealPicker from '../components/MealPicker';
import Thumb from '../components/Thumb';
import { Icon } from '../components/ui';
import { dayInfo, plural, HORIZON_DAYS } from '../lib/dates';
import { SLOTS, SLOT_BY_KEY, STATUS } from '../lib/meals';
import { EMPTY, SAME } from '../lib/planModel';
import { readStorage, writeStorage } from '../lib/storage';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './plan.css';

const VIEW_KEY = 'cappymeal-plan-view';

const lenOf = (range) => (range === '3' ? 3 : 7);
const clampStart = (s, range) => Math.min(Math.max(s, 0), HORIZON_DAYS - lenOf(range));
const startFor = (idx, range) => clampStart(idx, range);

export default function Plan() {
  const {
    todayKey, horizon, plan, memberPlan, fromTemplate, weekTemplate, memberIds, memberName, slotMeals, orders,
    recipes, statusOf, setMeal, removeMeal, startRepeat, stopRepeat, deliveries,
  } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState(() => {
    const saved = readStorage('sessionStorage', VIEW_KEY, null);
    const base = saved && horizon.includes(saved.selDay) ? saved : { range: '7', selDay: todayKey };
    const idx = horizon.indexOf(base.selDay);
    const start = typeof base.start === 'number' && base.start <= idx && idx < base.start + lenOf(base.range)
      ? clampStart(base.start, base.range)
      : startFor(idx, base.range);
    return { range: base.range, selDay: base.selDay, start };
  });
  const [sheet, setSheet] = useState(null); // { slot, day, uid }
  const [removing, setRemoving] = useState(null); // { day, slot, uids: null | string[], label }
  const [repeatAsk, setRepeatAsk] = useState(false);
  const isDesktop = useIsDesktop();
  const multi = memberIds.length > 1;

  // Jump to a day passed via navigation state (from Přehled / recipe detail).
  const targetDay = location.state && location.state.day;
  useEffect(() => {
    if (!targetDay) return;
    const idx = horizon.indexOf(targetDay);
    if (idx < 0) return;
    setView((v) => ({ ...v, selDay: targetDay, start: startFor(idx, v.range) }));
  }, [targetDay, location.key, horizon]);

  // Day rolled over: keep selection inside the horizon.
  useEffect(() => {
    if (!horizon.includes(view.selDay)) setView((v) => ({ ...v, selDay: horizon[0], start: 0 }));
  }, [horizon, view.selDay]);

  useEffect(() => {
    writeStorage('sessionStorage', VIEW_KEY, { range: view.range, selDay: view.selDay, start: view.start });
  }, [view.range, view.selDay, view.start]);

  const len = lenOf(view.range);
  const maxStart = HORIZON_DAYS - len;
  const start = Math.min(view.start, maxStart);
  const vis = horizon.slice(start, start + len).map((k) => dayInfo(k, todayKey));
  const first = vis[0];
  const last = vis[vis.length - 1];
  const sel = dayInfo(view.selDay, todayKey);
  const selStatus = statusOf(view.selDay);
  const SS = STATUS[selStatus];
  const order = orders[view.selDay];
  const changedAfterOrder = order && order.planChanged && (selStatus === 'ordered' || selStatus === 'in_cart');
  const visPend = vis.filter((d) => statusOf(d.key) === 'pending').map((d) => d.key);
  const repeatsOn = (day) => !!weekTemplate && day >= weekTemplate.from;
  // The 7 days that "Opakovat každý týden" saves: the visible week (or the 7 days from the visible start).
  const repeatStart = Math.min(start, HORIZON_DAYS - 7);
  const repeatDays = horizon.slice(repeatStart, repeatStart + 7);

  const setRange = (range) => {
    const idx = horizon.indexOf(view.selDay);
    setView((v) => ({ ...v, range, start: startFor(idx, range) }));
  };
  // Arrows move by one day; the selected day stays visible.
  const shift = (dir) => {
    const s = clampStart(start + dir, view.range);
    setView((v) => {
      const idx = horizon.indexOf(v.selDay);
      const selIdx = Math.min(Math.max(idx, s), s + len - 1);
      return { ...v, start: s, selDay: horizon[selIdx] };
    });
  };

  const closeSheet = useCallback(() => setSheet(null), []);
  const closeRemoving = useCallback(() => setRemoving(null), []);
  const closeRepeat = useCallback(() => setRepeatAsk(false), []);
  const openSheet = (slot, day = view.selDay, uid = null) => setSheet({ slot, day, uid });

  const valueFor = (uid) => {
    if (!sheet) return undefined;
    if (!uid) return plan[sheet.day] && plan[sheet.day][sheet.slot];
    const m = memberPlan[sheet.day] && memberPlan[sheet.day][sheet.slot];
    return m ? m[uid] : undefined;
  };

  const doRemove = (r, scope) => {
    if (r.uids) r.uids.forEach((u) => setMeal(r.day, r.slot, SAME, { uid: u, scope }));
    else removeMeal(r.day, r.slot, { scope });
    setRemoving(null);
  };
  /** uids: null = the shared meal, else the members whose own meal / skip is undone. */
  const askRemove = (day, slot, uids, label) => {
    const r = { day, slot, uids, label };
    if (repeatsOn(day)) setRemoving(r);
    else doRemove(r, 'day');
  };

  const whoLabel = (e) => {
    if (!multi) return '';
    if (e.shared) return e.uids.length < memberIds.length ? (e.uids.length ? `Ostatní` : '') : '';
    return e.uids.map(memberName).join(', ');
  };
  const skippers = (day, slot) => {
    const m = memberPlan[day] && memberPlan[day][slot];
    return m ? memberIds.filter((u) => m[u] === EMPTY) : [];
  };
  const isPattern = (day, slot) => !!(fromTemplate[day] && fromTemplate[day][slot]);

  const pickerEl = (
    <MealPicker
      sheet={sheet}
      onClose={closeSheet}
      recipes={recipes}
      memberIds={memberIds}
      memberName={memberName}
      valueFor={valueFor}
      repeats={!!sheet && repeatsOn(sheet.day)}
      onPick={(value, opts) => {
        setMeal(sheet.day, sheet.slot, value, opts);
        setSheet(null);
      }}
    />
  );

  const removeEl = (
    <BottomSheet
      open={!!removing}
      onClose={closeRemoving}
      title={removing ? `Odebrat ${SLOT_BY_KEY[removing.slot].acc}?` : ''}
      sub={removing ? `${dayInfo(removing.day).long}${removing.label ? ` · ${removing.label}` : ''}` : ''}
    >
      <div className="muted" style={{ fontSize: 14, paddingBottom: 6 }}>
        Plán se opakuje každý týden. Změnit jen tento den, nebo všechny další týdny?
      </div>
      <button type="button" className="btn btn--dark" onClick={() => doRemove(removing, 'day')}>
        Jen tento den
      </button>
      <button type="button" className="btn btn--soft" onClick={() => doRemove(removing, 'week')}>
        <Icon name="repeat" size={20} />
        Každý týden
      </button>
    </BottomSheet>
  );

  const repeatEl = (
    <BottomSheet open={repeatAsk} onClose={closeRepeat} title="Opakovat každý týden?">
      <div className="muted" style={{ fontSize: 14, paddingBottom: 6 }}>
        Jídla z dnů {dayInfo(repeatDays[0]).shortLabel} – {dayInfo(repeatDays[6]).shortLabel} (včetně jídel pro
        jednotlivé členy) se budou opakovat každý týden, dokud opakování nezrušíte. Prázdný den zůstane prázdný.
        {weekTemplate ? ' Nahradí se tím současné opakování.' : ''}
      </div>
      <button
        type="button"
        className="btn btn--dark"
        onClick={() => {
          startRepeat(repeatDays);
          setRepeatAsk(false);
        }}
      >
        <Icon name="repeat" size={20} />
        Opakovat každý týden
      </button>
    </BottomSheet>
  );

  const onStopRepeat = () => {
    if (!window.confirm('Zrušit opakování týdne? Dny bez objednávky, které plnilo opakování, se vyprázdní.')) return;
    stopRepeat();
  };

  const repeatBar = weekTemplate ? (
    <div className="plan__repeat plan__repeat--on">
      <Icon name="repeat" size={19} />
      <span className="plan__repeat-text">
        Týden se opakuje (od {dayInfo(weekTemplate.from).shortLabel})
      </span>
      <button type="button" className="link-btn" onClick={() => setRepeatAsk(true)}>
        Změnit
      </button>
      <button type="button" className="link-btn" onClick={onStopRepeat}>
        Zrušit
      </button>
    </div>
  ) : (
    <button type="button" className="plan__repeat" onClick={() => setRepeatAsk(true)}>
      <Icon name="repeat" size={19} />
      <span className="plan__repeat-text">Opakovat tento týden každý týden</span>
    </button>
  );

  const skipLine = (day, slot, compact) => {
    const sk = skippers(day, slot);
    if (!multi || !sk.length) return null;
    return (
      <div className={`plan__skip${compact ? ' plan__skip--compact' : ''}`}>
        <Icon name="no_meals" size={15} />
        <span className="ellipsis">Nejí: {sk.map(memberName).join(', ')}</span>
        <button
          type="button"
          className="plan__skip-undo"
          aria-label="Zrušit vynechání"
          onClick={() => askRemove(day, slot, sk, `Nejí: ${sk.map(memberName).join(', ')}`)}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
    );
  };

  // Rohlík delivery arriving that day (server-written deliveries/{orderId}).
  const deliveryChip = (key) => {
    const dv = deliveryOnDay(deliveries, key);
    if (!dv) return null;
    return (
      <span className="plan__delivery" data-testid="delivery-chip">
        <Icon name="local_shipping" size={15} />
        Doručení {deliveryTimeText(dv)}
      </span>
    );
  };

  if (isDesktop) {
    const cols = `96px repeat(${len}, minmax(124px, 1fr))`;
    return (
      <div className="screen screen--wide">
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <h1 className="h-title" style={{ marginRight: 'auto' }}>
            Plán
          </h1>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="icon-btn icon-btn--sm plan__arrow"
              style={{ opacity: start > 0 ? 1 : 0.35 }}
              disabled={start <= 0}
              onClick={() => shift(-1)}
              aria-label="O den zpět"
            >
              <Icon name="chevron_left" />
            </button>
            <div className="plan__period">
              {first.shortLabel} – {last.shortLabel}
            </div>
            <button
              type="button"
              className="icon-btn icon-btn--sm plan__arrow"
              style={{ opacity: start < maxStart ? 1 : 0.35 }}
              disabled={start >= maxStart}
              onClick={() => shift(1)}
              aria-label="O den dál"
            >
              <Icon name="chevron_right" />
            </button>
          </div>
          <div className="segment plan__segment" role="tablist">
            <button type="button" className={view.range === '3' ? 'on' : ''} onClick={() => setRange('3')}>
              3 dny
            </button>
            <button type="button" className={view.range === '7' ? 'on' : ''} onClick={() => setRange('7')}>
              Týden
            </button>
          </div>
          {visPend.length > 0 && (
            <button
              type="button"
              className="btn btn--dark btn--d plan__order"
              onClick={() => navigate('/cart', { state: { days: visPend } })}
            >
              <Icon name="local_shipping" size={20} />
              Objednat {visPend.length} {plural(visPend.length, 'den', 'dny', 'dní')} z Rohlíku
            </button>
          )}
        </div>

        {repeatBar}

        <div className="plan-grid">
          <div className="plan-grid__row" style={{ gridTemplateColumns: cols }}>
            <div />
            {vis.map((d) => {
              const st = statusOf(d.key);
              const S = STATUS[st];
              const o = orders[d.key];
              const changed = o && o.planChanged && (st === 'ordered' || st === 'in_cart');
              return (
                <div
                  key={d.key}
                  className="plan-grid__head"
                  style={{ background: d.index === 0 ? '#F0E3CE' : 'var(--card)' }}
                >
                  <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                    <span className="plan-grid__short">{d.index === 0 ? 'Dnes' : d.short}</span>
                    <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>
                      {d.num}.
                    </span>
                  </div>
                  <div className="plan-grid__status" style={{ color: S.fg }}>
                    <span className="dot" style={{ width: 7, height: 7, background: S.dot }} />
                    {S.label}
                    {changed && (
                      <span title="Plán se změnil po objednání – zkontrolujte košík." style={{ display: 'flex' }}>
                        <Icon name="info" size={15} />
                      </span>
                    )}
                  </div>
                  {deliveryChip(d.key)}
                </div>
              );
            })}
          </div>
          {SLOTS.map((s) => (
            <div key={s.key} className="plan-grid__row" style={{ gridTemplateColumns: cols }}>
              <div className="eyebrow" style={{ paddingTop: 14 }}>
                {s.label}
              </div>
              {vis.map((d) => {
                const entries = slotMeals(d.key, s.key);
                const main = entries[0];
                // Several meals in one slot: compact cards (small thumb) so every meal and its eater stay readable.
                const split = entries.length > 1;
                return (
                  <div key={d.key} className="plan-grid__cell">
                    {main ? (
                      <div className="plan-grid__stack">
                        {split &&
                          entries.map((e) => (
                            <div
                              key={e.rid}
                              className="plan-grid__compact"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(`/recipes/${e.rid}`)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') navigate(`/recipes/${e.rid}`);
                              }}
                            >
                              <Thumb rid={e.rid} size={34} radius={9} emojiSize={18} />
                              <div className="plan-grid__compact-body">
                                {whoLabel(e) && (
                                  <span className="plan-grid__compact-who">
                                    <Icon name={e.shared ? 'groups' : 'person'} size={13} />
                                    <span className="ellipsis">{whoLabel(e)}</span>
                                  </span>
                                )}
                                <span className="plan-grid__compact-name">{recipes[e.rid].name}</span>
                              </div>
                              <button
                                type="button"
                                className="plan-grid__extra-x"
                                aria-label={`Odebrat ${s.acc}${whoLabel(e) ? ` – ${whoLabel(e)}` : ''}`}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  askRemove(d.key, s.key, e.shared ? null : e.uids, whoLabel(e));
                                }}
                              >
                                <Icon name="close" size={14} />
                              </button>
                            </div>
                          ))}
                        {!split && (
                        <div
                          className="plan-grid__meal"
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/recipes/${main.rid}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') navigate(`/recipes/${main.rid}`);
                          }}
                        >
                          <Thumb rid={main.rid} radius={0} emojiSize={34} className="plan-grid__img" />
                          <div className="plan-grid__name">
                            {whoLabel(main) && <span className="plan-grid__who">{whoLabel(main)}: </span>}
                            {recipes[main.rid].name}
                          </div>
                          {main.shared && isPattern(d.key, s.key) && (
                            <span className="plan-grid__pattern" title="Opakuje se každý týden">
                              <Icon name="repeat" size={14} />
                            </span>
                          )}
                          <button
                            type="button"
                            className="plan-grid__remove"
                            title="Odebrat"
                            aria-label={`Odebrat ${s.acc}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              askRemove(d.key, s.key, main.shared ? null : main.uids, whoLabel(main));
                            }}
                          >
                            <Icon name="close" size={17} />
                          </button>
                        </div>
                        )}
                        {skipLine(d.key, s.key, true)}
                        <button
                          type="button"
                          className="plan-grid__more"
                          onClick={() => openSheet(s.key, d.key, multi ? memberIds[0] : null)}
                        >
                          <Icon name={multi ? 'person_add' : 'swap_horiz'} size={15} />
                          {multi ? 'Jinak pro člena' : 'Změnit'}
                        </button>
                      </div>
                    ) : (
                      <div className="plan-grid__stack">
                        <button
                          type="button"
                          className="plan-grid__add"
                          aria-label={`Přidat ${s.acc} – ${d.long}`}
                          onClick={() => openSheet(s.key, d.key)}
                        >
                          <Icon name="add" />
                        </button>
                        {skipLine(d.key, s.key, true)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {pickerEl}
        {removeEl}
        {repeatEl}
      </div>
    );
  }

  return (
    <div className="screen screen--fill" style={{ gap: 18 }}>
      <div className="row--between">
        <h1 className="h-title" style={{ lineHeight: 1 }}>
          Plán
        </h1>
        <div className="segment" role="tablist">
          <button type="button" className={view.range === '3' ? 'on' : ''} onClick={() => setRange('3')}>
            3 dny
          </button>
          <button type="button" className={view.range === '7' ? 'on' : ''} onClick={() => setRange('7')}>
            Týden
          </button>
        </div>
      </div>

      <div className="row--between">
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          style={{ opacity: start > 0 ? 1 : 0.35 }}
          disabled={start <= 0}
          onClick={() => shift(-1)}
          aria-label="O den zpět"
        >
          <Icon name="chevron_left" />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {first.shortLabel} – {last.shortLabel}
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          style={{ opacity: start < maxStart ? 1 : 0.35 }}
          disabled={start >= maxStart}
          onClick={() => shift(1)}
          aria-label="O den dál"
        >
          <Icon name="chevron_right" />
        </button>
      </div>

      <div className="plan__strip" style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
        {vis.map((d) => {
          const on = d.key === view.selDay;
          return (
            <button
              type="button"
              key={d.key}
              className={`plan__day${on ? ' plan__day--on' : ''}`}
              onClick={() => setView((v) => ({ ...v, selDay: d.key }))}
            >
              <span className="plan__day-short">{d.index === 0 ? 'Dnes' : d.short}</span>
              <span className="plan__day-num">{d.num}</span>
              <span className="plan__day-dot" style={{ background: STATUS[statusOf(d.key)].dot }} />
            </button>
          );
        })}
      </div>

      {repeatBar}

      <div className="row--between" style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{sel.long}</div>
        <span className="status-pill" style={{ background: SS.bg, color: SS.fg }}>
          {SS.label}
        </span>
      </div>
      {deliveryChip(view.selDay)}

      {changedAfterOrder && (
        <div className="plan__warn">
          <Icon name="info" size={18} />
          Plán se změnil po objednání – zkontrolujte košík.
        </div>
      )}

      <div className="stack" style={{ gap: 10 }}>
        {SLOTS.map((s) => {
          const entries = slotMeals(view.selDay, s.key);
          return (
            <div key={s.key} className="stack" style={{ gap: 7 }}>
              <div className="eyebrow" style={{ paddingLeft: 4 }}>
                {s.label}
              </div>
              {entries.map((e) => {
                const who = whoLabel(e);
                const r = recipes[e.rid];
                return (
                  <div
                    key={e.rid}
                    className="plan__meal"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/recipes/${e.rid}`)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') navigate(`/recipes/${e.rid}`);
                    }}
                  >
                    <Thumb rid={e.rid} size={56} emojiSize={27} />
                    <div className="list-row__body" style={{ gap: 3 }}>
                      {who && (
                        <div className="plan__who">
                          <Icon name={e.shared ? 'groups' : 'person'} size={14} />
                          {who}
                        </div>
                      )}
                      <div className="list-row__title">{r.name}</div>
                      <div className="list-row__sub">
                        {e.shared && isPattern(view.selDay, s.key) && (
                          <Icon name="repeat" size={13} className="plan__pattern" />
                        )}
                        {r.preparation}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-btn icon-btn--plain"
                      aria-label={`Odebrat ${s.acc}${who ? ` – ${who}` : ''}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        askRemove(view.selDay, s.key, e.shared ? null : e.uids, who);
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                );
              })}
              {skipLine(view.selDay, s.key, false)}
              {entries.length === 0 ? (
                <button type="button" className="plan__add" onClick={() => openSheet(s.key)}>
                  <Icon name="add" size={20} />
                  Přidat {s.acc}
                </button>
              ) : (
                multi && (
                  <button
                    type="button"
                    className="plan__member-btn"
                    onClick={() => openSheet(s.key, view.selDay, memberIds[0])}
                  >
                    <Icon name="person_add" size={17} />
                    Jiné jídlo pro člena
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {visPend.length > 0 && (
        <div className="sticky-action">
          <button
            type="button"
            className="btn btn--dark"
            onClick={() => navigate('/cart', { state: { days: visPend } })}
          >
            <Icon name="local_shipping" />
            Objednat {visPend.length} {plural(visPend.length, 'den', 'dny', 'dní')} z Rohlíku
          </button>
        </div>
      )}

      {pickerEl}
      {removeEl}
      {repeatEl}
    </div>
  );
}
