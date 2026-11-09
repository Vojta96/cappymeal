import React, { useMemo, useState } from 'react';
import BottomSheet from './BottomSheet';
import Thumb from './Thumb';
import { Icon } from './ui';
import { dayInfo } from '../lib/dates';
import { SLOTS, SLOT_BY_KEY, recipeHasType } from '../lib/meals';
import { EMPTY, SAME } from '../lib/planModel';
import './mealPicker.css';

const MAX_PREP_CHIPS = 6;

/**
 * Recipe picker for one slot of one day: a grid of cards, search, type and preparation filters,
 * "for whom" (everyone / one member) and – when the week repeats – "this day only / every week".
 *
 * sheet: { day, slot, uid } | null (uid = initially selected member, null = everyone)
 * valueFor(uid): current value for everyone (uid null: rid) or a member (rid | '-' | undefined)
 * onPick(value, { uid, scope }): value = rid | '-' (member doesn't eat) | '=' (member eats the shared meal)
 */
export default function MealPicker({ sheet, onClose, recipes, memberIds, memberName, valueFor, repeats, onPick }) {
  return (
    <BottomSheet
      open={!!sheet}
      onClose={onClose}
      wide
      title={sheet ? `Vybrat ${SLOT_BY_KEY[sheet.slot].acc}` : ''}
      sub={sheet ? dayInfo(sheet.day).long : ''}
      head={null}
    >
      {sheet && (
        <PickerBody
          key={`${sheet.day}:${sheet.slot}:${sheet.uid || ''}`}
          sheet={sheet}
          recipes={recipes}
          memberIds={memberIds}
          memberName={memberName}
          valueFor={valueFor}
          repeats={repeats}
          onPick={onPick}
        />
      )}
    </BottomSheet>
  );
}

function PickerBody({ sheet, recipes, memberIds, memberName, valueFor, repeats, onPick }) {
  const [who, setWho] = useState(sheet.uid || null);
  const [scope, setScope] = useState('day');
  const [q, setQ] = useState('');
  const [type, setType] = useState(sheet.slot);
  const [prep, setPrep] = useState('');
  const current = valueFor(who);
  const shared = valueFor(null);

  const typed = useMemo(
    () => Object.entries(recipes).filter(([, r]) => type === 'all' || recipeHasType(r, type)),
    [recipes, type]
  );
  // Preparation chips: the most common ones among the recipes of the chosen type.
  const preps = useMemo(() => {
    const count = {};
    typed.forEach(([, r]) => {
      const p = (r.preparation || '').trim();
      if (p) count[p] = (count[p] || 0) + 1;
    });
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs'))
      .slice(0, MAX_PREP_CHIPS)
      .map(([p]) => p);
  }, [typed]);
  const activePrep = preps.includes(prep) ? prep : '';

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return typed
      .filter(
        ([, r]) =>
          (!activePrep || (r.preparation || '').trim() === activePrep) &&
          (!needle ||
            r.name.toLowerCase().includes(needle) ||
            (r.ingredients || []).some((g) => String(g.name || '').toLowerCase().includes(needle)))
      )
      .sort((a, b) => a[1].name.localeCompare(b[1].name, 'cs'));
  }, [typed, q, activePrep]);

  const pick = (value) => onPick(value, { uid: who, scope });
  const sharedName = shared && recipes[shared] ? recipes[shared].name : '';

  return (
    <div className="mp">
      <div className="mp__controls">
        {memberIds.length > 1 && (
          <div className="mp__row">
            <span className="mp__label">Pro koho</span>
            <div className="chips chips--scroll mp__chips">
              <button type="button" className={`chip${!who ? ' chip--on' : ''}`} onClick={() => setWho(null)}>
                <Icon name="groups" />
                Všichni
              </button>
              {memberIds.map((u) => (
                <button
                  type="button"
                  key={u}
                  className={`chip${who === u ? ' chip--on' : ''}`}
                  onClick={() => setWho(u)}
                >
                  <Icon name="person" />
                  {memberName(u)}
                </button>
              ))}
            </div>
          </div>
        )}
        {repeats && (
          <div className="segment mp__scope" role="tablist" aria-label="Platnost změny">
            <button type="button" className={scope === 'day' ? 'on' : ''} onClick={() => setScope('day')}>
              Jen tento den
            </button>
            <button type="button" className={scope === 'week' ? 'on' : ''} onClick={() => setScope('week')}>
              <Icon name="repeat" size={16} /> Každý týden
            </button>
          </div>
        )}
        <div className="search sheet-search">
          <Icon name="search" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat recept nebo surovinu" aria-label="Hledat recept" />
          {q && (
            <button type="button" className="mp__clear" onClick={() => setQ('')} aria-label="Vymazat hledání">
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="chips chips--scroll mp__chips" aria-label="Typ jídla">
          {SLOTS.map((s) => (
            <button
              type="button"
              key={s.key}
              className={`chip mp__chip${type === s.key ? ' chip--on' : ''}`}
              onClick={() => setType(s.key)}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip mp__chip${type === 'all' ? ' chip--on' : ''}`}
            onClick={() => setType('all')}
          >
            Vše
          </button>
        </div>
        {preps.length > 1 && (
          <div className="chips chips--scroll mp__chips" aria-label="Příprava">
            <button
              type="button"
              className={`chip mp__chip mp__chip--soft${!activePrep ? ' chip--on' : ''}`}
              onClick={() => setPrep('')}
            >
              Jakákoli příprava
            </button>
            {preps.map((p) => (
              <button
                type="button"
                key={p}
                className={`chip mp__chip mp__chip--soft${activePrep === p ? ' chip--on' : ''}`}
                onClick={() => setPrep(activePrep === p ? '' : p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mp__grid">
        {who && (
          <>
            {shared && current !== undefined && current !== SAME && (
              <button type="button" className="mp__card mp__card--special" onClick={() => pick(SAME)}>
                <span className="mp__special-icon">
                  <Icon name="group" />
                </span>
                <span className="mp__name">Jako ostatní</span>
                {sharedName && <span className="mp__sub">{sharedName}</span>}
              </button>
            )}
            <button
              type="button"
              className={`mp__card mp__card--special${current === EMPTY ? ' mp__card--on' : ''}`}
              onClick={() => pick(EMPTY)}
             
            >
              <span className="mp__special-icon">
                <Icon name="no_meals" />
              </span>
              <span className="mp__name">Nejí</span>
              <span className="mp__sub">{memberName(who)} tento chod vynechá</span>
            </button>
          </>
        )}
        {items.map(([rid, r]) => {
          const on = current === rid;
          return (
            <button
              type="button"
              key={rid}
             
              className={`mp__card${on ? ' mp__card--on' : ''}`}
              onClick={() => pick(rid)}
              aria-pressed={on}
            >
              <Thumb rid={rid} radius={0} emojiSize={30} className="mp__img" />
              {on && (
                <span className="mp__check">
                  <Icon name="check" size={16} />
                </span>
              )}
              <span className="mp__name">{r.name}</span>
              {r.preparation && <span className="mp__sub">{r.preparation}</span>}
            </button>
          );
        })}
      </div>
      {items.length === 0 && (
        <div className="muted mp__empty">
          Nic nenalezeno.
          {type !== 'all' && (
            <button type="button" className="link-btn" onClick={() => setType('all')}>
              Hledat ve všech receptech
            </button>
          )}
        </div>
      )}
    </div>
  );
}
