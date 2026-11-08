import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import Thumb from '../components/Thumb';
import { Icon } from '../components/ui';
import { SLOTS, TYPE_LABEL } from '../lib/meals';
import { readStorage, writeStorage } from '../lib/storage';
import './recipes.css';

const KEY = 'cappymeal-recipes-filter';
const FILTERS = [{ key: null, label: 'Vše' }, ...SLOTS.map((s) => ({ key: s.key, label: s.label }))];

export default function Recipes() {
  const { recipes } = useHousehold();
  const navigate = useNavigate();
  const saved = readStorage('sessionStorage', KEY, {});
  const [query, setQuery] = useState(saved.query || '');
  const [filter, setFilter] = useState(saved.filter || null);

  useEffect(() => {
    writeStorage('sessionStorage', KEY, { query, filter });
  }, [query, filter]);

  const all = useMemo(
    () => Object.entries(recipes).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0) || a[1].name.localeCompare(b[1].name, 'cs')),
    [recipes]
  );
  const q = query.trim().toLowerCase();
  const list = all.filter(
    ([, r]) =>
      (!filter || r.type === filter) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        (r.ingredients || []).some((i) => String(i.name).toLowerCase().includes(q)))
  );

  return (
    <div className="screen screen--tight">
      <div className="recipes__head">
        <div className="row recipes__title" style={{ alignItems: 'baseline', gap: 10 }}>
          <h1 className="h-title" style={{ lineHeight: 1 }}>
            Recepty
          </h1>
          <div className="recipes__count">{all.length}</div>
        </div>
        <div className="search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat recept nebo surovinu"
            aria-label="Hledat recept nebo surovinu"
            type="search"
          />
          {query && (
            <button type="button" className="icon-btn icon-btn--plain" onClick={() => setQuery('')} aria-label="Smazat hledání">
              <Icon name="close" />
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--primary recipes__new"
          onClick={() => navigate('/recipes/new')}
          aria-label="Nový recept"
        >
          <Icon name="add" size={24} />
          <span className="only-desktop">Nový recept</span>
        </button>
      </div>

      <div className="chips chips--scroll">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.label}
            className={`chip${filter === f.key ? ' chip--on' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="recipes__grid">
        {list.map(([rid, r]) => (
          <Link key={rid} to={`/recipes/${rid}`} className="recipes__card">
            <Thumb rid={rid} radius={22} className="recipes__img" lazy />
            <div className="stack" style={{ gap: 2, padding: '0 2px' }}>
              <div className="recipes__name">{r.name}</div>
              <div className="list-row__sub">
                {[TYPE_LABEL[r.type], r.preparation].filter(Boolean).join(' · ')}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && (
        <div className="muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 15 }}>
          Žádné recepty neodpovídají filtru.
        </div>
      )}
    </div>
  );
}
