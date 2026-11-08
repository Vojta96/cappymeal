import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import BottomSheet from '../components/BottomSheet';
import Thumb from '../components/Thumb';
import { Icon } from '../components/ui';
import { dayInfo, plural, HORIZON_DAYS } from '../lib/dates';
import { SLOTS, SLOT_BY_KEY, STATUS } from '../lib/meals';
import { readStorage, writeStorage } from '../lib/storage';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './plan.css';

const VIEW_KEY = 'cappymeal-plan-view';

const startFor = (idx, range) => (range === '3' ? Math.min(Math.max(idx, 0), HORIZON_DAYS - 3) : idx >= 7 ? 7 : 0);

export default function Plan() {
  const { todayKey, horizon, plan, orders, recipes, statusOf, setMeal, removeMeal } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState(() => {
    const saved = readStorage('sessionStorage', VIEW_KEY, null);
    const base = saved && horizon.includes(saved.selDay) ? saved : { range: '7', selDay: todayKey };
    const idx = horizon.indexOf(base.selDay);
    return { range: base.range, selDay: base.selDay, start: startFor(idx, base.range) };
  });
  const [sheet, setSheet] = useState(null); // { slot, day }
  const isDesktop = useIsDesktop();
  const [sheetQ, setSheetQ] = useState('');
  const [allTypes, setAllTypes] = useState(false);

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
    writeStorage('sessionStorage', VIEW_KEY, { range: view.range, selDay: view.selDay });
  }, [view.range, view.selDay]);

  const len = view.range === '3' ? 3 : 7;
  const maxStart = HORIZON_DAYS - len;
  const start = Math.min(view.start, maxStart);
  const vis = horizon.slice(start, start + len).map((k) => dayInfo(k, todayKey));
  const first = vis[0];
  const last = vis[vis.length - 1];
  const sel = dayInfo(view.selDay, todayKey);
  const selStatus = statusOf(view.selDay);
  const SS = STATUS[selStatus];
  const dayPlan = plan[view.selDay] || {};
  const order = orders[view.selDay];
  const changedAfterOrder = order && order.planChanged && (selStatus === 'ordered' || selStatus === 'in_cart');
  const visPend = vis.filter((d) => statusOf(d.key) === 'pending').map((d) => d.key);

  const setRange = (range) => {
    const idx = horizon.indexOf(view.selDay);
    setView((v) => ({ ...v, range, start: startFor(idx, range) }));
  };
  const shift = (dir) => {
    const s = Math.min(maxStart, Math.max(0, start + dir * len));
    setView((v) => ({ ...v, start: s, selDay: horizon[s] }));
  };

  const closeSheet = useCallback(() => setSheet(null), []);
  const openSheet = (slot, day = view.selDay) => {
    setSheetQ('');
    setAllTypes(false);
    setSheet({ slot, day });
  };

  const sheetItems = useMemo(() => {
    if (!sheet) return [];
    const q = sheetQ.trim().toLowerCase();
    return Object.entries(recipes)
      .filter(([, r]) => (allTypes || r.type === sheet.slot) && (!q || r.name.toLowerCase().includes(q)))
      .sort((a, b) => a[1].name.localeCompare(b[1].name, 'cs'));
  }, [sheet, sheetQ, allTypes, recipes]);

  const slotMeta = sheet ? SLOT_BY_KEY[sheet.slot] : null;

  const sheetEl = (
      <BottomSheet
        open={!!sheet}
        onClose={closeSheet}
        title={slotMeta ? `Vybrat ${slotMeta.acc}` : ''}
        sub={sheet ? dayInfo(sheet.day).long : ''}
        head={
          <>
            <div className="search sheet-search">
              <Icon name="search" size={20} />
              <input
                value={sheetQ}
                onChange={(e) => setSheetQ(e.target.value)}
                placeholder="Hledat"
                aria-label="Hledat recept"
              />
            </div>
            <div className="chips">
              <button
                type="button"
                className={`chip${!allTypes ? ' chip--on' : ''}`}
                style={{ height: 32 }}
                onClick={() => setAllTypes(false)}
              >
                {slotMeta ? slotMeta.label : ''}
              </button>
              <button
                type="button"
                className={`chip${allTypes ? ' chip--on' : ''}`}
                style={{ height: 32 }}
                onClick={() => setAllTypes(true)}
              >
                Všechny recepty
              </button>
            </div>
          </>
        }
      >
        {sheetItems.map(([rid, r]) => (
          <button
            type="button"
            key={rid}
            className="sheet-item"
            onClick={() => {
              setMeal(sheet.day, sheet.slot, rid);
              setSheet(null);
            }}
          >
            <Thumb rid={rid} size={50} radius={13} emojiSize={24} lazy />
            <div className="list-row__body">
              <div className="list-row__title">{r.name}</div>
              <div className="list-row__sub">{r.preparation}</div>
            </div>
            <Icon name="add_circle" className="sheet-item__add" />
          </button>
        ))}
        {sheetItems.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
            Nic nenalezeno.
          </div>
        )}
      </BottomSheet>
  );

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
              aria-label="Předchozí období"
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
              aria-label="Další období"
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
                const rid = plan[d.key] && plan[d.key][s.key];
                const r = rid && recipes[rid];
                return (
                  <div key={d.key} className="plan-grid__cell">
                    {r ? (
                      <div
                        className="plan-grid__meal"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/recipes/${rid}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/recipes/${rid}`);
                        }}
                      >
                        <Thumb rid={rid} radius={0} emojiSize={34} className="plan-grid__img" />
                        <div className="plan-grid__name">{r.name}</div>
                        <button
                          type="button"
                          className="plan-grid__remove"
                          title="Odebrat"
                          aria-label={`Odebrat ${s.acc}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMeal(d.key, s.key);
                          }}
                        >
                          <Icon name="close" size={17} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="plan-grid__add"
                        aria-label={`Přidat ${s.acc} – ${d.long}`}
                        onClick={() => openSheet(s.key, d.key)}
                      >
                        <Icon name="add" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {sheetEl}
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
          aria-label="Předchozí období"
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
          aria-label="Další období"
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

      <div className="row--between" style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{sel.long}</div>
        <span className="status-pill" style={{ background: SS.bg, color: SS.fg }}>
          {SS.label}
        </span>
      </div>

      {changedAfterOrder && (
        <div className="plan__warn">
          <Icon name="info" size={18} />
          Plán se změnil po objednání – zkontrolujte košík.
        </div>
      )}

      <div className="stack" style={{ gap: 10 }}>
        {SLOTS.map((s) => {
          const rid = dayPlan[s.key];
          const r = rid && recipes[rid];
          return (
            <div key={s.key} className="stack" style={{ gap: 7 }}>
              <div className="eyebrow" style={{ paddingLeft: 4 }}>
                {s.label}
              </div>
              {r ? (
                <div
                  className="plan__meal"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/recipes/${rid}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/recipes/${rid}`);
                  }}
                >
                  <Thumb rid={rid} size={56} emojiSize={27} />
                  <div className="list-row__body" style={{ gap: 3 }}>
                    <div className="list-row__title">{r.name}</div>
                    <div className="list-row__sub">{r.preparation}</div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn--plain"
                    aria-label={`Odebrat ${s.acc}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMeal(view.selDay, s.key);
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ) : (
                <button type="button" className="plan__add" onClick={() => openSheet(s.key)}>
                  <Icon name="add" size={20} />
                  Přidat {s.acc}
                </button>
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

      {sheetEl}
    </div>
  );
}
