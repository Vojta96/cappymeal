import React, { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useRecipeImage } from '../components/Thumb';
import BottomSheet from '../components/BottomSheet';
import { Icon } from '../components/ui';
import { dayInfo } from '../lib/dates';
import { SLOT_BY_KEY, TYPE_LABEL } from '../lib/meals';
import './recipes.css';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, horizon, todayKey, plan, setMeal } = useHousehold();
  const r = recipes[id];
  const img = useRecipeImage(id);
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);

  if (!r) return <Navigate to="/recipes" replace />;
  const slot = SLOT_BY_KEY[r.type] || SLOT_BY_KEY.lunch;

  const back = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/recipes');
  };

  return (
    <div className="detail">
      <div className="detail__hero">
        {img ? <img src={img} alt={r.name} /> : <span className="detail__emoji">{r.emoji || '🍽️'}</span>}
        <div className="detail__bar">
          <button type="button" className="glass-btn" onClick={back} aria-label="Zpět">
            <Icon name="arrow_back" size={22} />
          </button>
          <button type="button" className="glass-btn glass-btn--text" onClick={() => navigate(`/recipes/${id}/edit`)}>
            <Icon name="edit" size={19} />
            Upravit
          </button>
        </div>
      </div>
      <div className="detail__body">
        <div className="stack" style={{ gap: 10 }}>
          <div className="chips" style={{ gap: 6 }}>
            <span className="tag">{TYPE_LABEL[r.type] || 'Jídlo'}</span>
            {r.preparation && <span className="tag">{r.preparation}</span>}
          </div>
          <h1 className="detail__name">{r.name}</h1>
        </div>

        <div className="stack" style={{ gap: 4 }}>
          <h2 className="h-section" style={{ paddingBottom: 6 }}>
            Suroviny
          </h2>
          {(r.ingredients || []).map((g, i) => (
            <div key={i} className="detail__ing">
              <span>{g.name}</span>
              <span className="detail__amount">{g.amount}</span>
            </div>
          ))}
          {!(r.ingredients || []).length && <div className="muted">Bez surovin.</div>}
        </div>

        {r.instructions && (
          <div className="stack">
            <h2 className="h-section">Postup</h2>
            <div className="detail__instr">{r.instructions}</div>
          </div>
        )}

        <button type="button" className="btn" style={{ marginTop: 'auto' }} onClick={() => setSheet(true)}>
          <Icon name="calendar_add_on" />
          Přidat do plánu
        </button>
      </div>

      <BottomSheet
        open={sheet}
        onClose={closeSheet}
        title="Na který den?"
        sub={`${r.name} · ${TYPE_LABEL[r.type] || ''}`}
      >
        {horizon.map((k) => {
          const d = dayInfo(k, todayKey);
          const ex = plan[k] && plan[k][r.type];
          const er = ex && ex !== id && recipes[ex];
          const same = ex === id;
          return (
            <button
              type="button"
              key={k}
              className="sheet-item"
              disabled={same}
              onClick={async () => {
                await setMeal(k, r.type, id);
                navigate('/plan', { state: { day: k } });
              }}
            >
              <div className="day-num-tile">
                {d.num}
                <small>{d.index === 0 ? 'dnes' : d.short}</small>
              </div>
              <div className="list-row__body">
                <div className="list-row__title">{d.long}</div>
                <div className="list-row__sub">
                  {same ? 'Už je v plánu' : er ? `Nahradí: ${er.name}` : `${slot.label} – volné místo`}
                </div>
              </div>
              <Icon name={same ? 'check_circle' : 'add_circle'} className="sheet-item__add" />
            </button>
          );
        })}
      </BottomSheet>
    </div>
  );
}
