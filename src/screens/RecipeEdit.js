import React, { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useRecipeImageFull } from '../components/Thumb';
import { Icon, Spinner } from '../components/ui';
import { SLOTS, recipeTypes } from '../lib/meals';
import { resizeImage } from '../lib/image';
import './recipes.css';

function lastGrapheme(s) {
  if (!s) return '';
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const parts = Array.from(new Intl.Segmenter('cs', { granularity: 'grapheme' }).segment(s));
    return parts.length ? parts[parts.length - 1].segment : '';
  }
  return Array.from(s).slice(-1).join('');
}

const emptyDraft = () => ({
  name: '',
  emoji: '🍽️',
  type: 'lunch',
  types: ['lunch'],
  preparation: '',
  ingredients: [{ name: '', amount: '' }],
  instructions: '',
});

export default function RecipeEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { recipes, saveRecipe, deleteRecipe } = useHousehold();
  const existing = id ? recipes[id] : null;
  const { src: currentImg, loading: currentLoading } = useRecipeImageFull(id);

  const [draft, setDraft] = useState(() =>
    existing
      ? {
          id,
          name: existing.name || '',
          emoji: existing.emoji || '🍽️',
          type: existing.type || 'lunch',
          types: recipeTypes(existing).length ? recipeTypes(existing) : [existing.type || 'lunch'],
          preparation: existing.preparation || '',
          ingredients: (existing.ingredients || []).length
            ? existing.ingredients.map((g) => ({ name: g.name || '', amount: g.amount || '' }))
            : [{ name: '', amount: '' }],
          instructions: existing.instructions || '',
        }
      : emptyDraft(),
  );
  const [photo, setPhoto] = useState(undefined); // undefined = keep, string = new
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  if (!isNew && !existing && !saving) return <Navigate to="/recipes" replace />;

  const setD = (patch) => setDraft((d) => ({ ...d, ...patch }));
  // Multi-select; at least one stays on. Primary type stays if still selected, else the first in SLOTS order.
  const toggleType = (key) =>
    setDraft((d) => {
      const on = d.types.includes(key);
      if (on && d.types.length === 1) return d;
      const set = new Set(d.types);
      if (on) set.delete(key); else set.add(key);
      const types = SLOTS.map((x) => x.key).filter((k) => set.has(k));
      return { ...d, types, type: set.has(d.type) ? d.type : types[0] };
    });
  const setIng = (i, patch) =>
    setDraft((d) => {
      const a = [...d.ingredients];
      a[i] = { ...a[i], ...patch };
      return { ...d, ingredients: a };
    });

  const handleFile = async (f) => {
    if (!f) return;
    if (f.type && !f.type.startsWith('image/')) {
      setError('Vyberte prosím obrázek.');
      return;
    }
    setError('');
    setPhotoBusy(true);
    try {
      setPhoto(await resizeImage(f, 1000, 0.8));
    } catch (err) {
      setError(err.message || 'Fotku se nepodařilo zpracovat.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    handleFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  };

  const cancel = () => navigate(isNew ? '/recipes' : `/recipes/${id}`, { replace: true });

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Doplňte název receptu.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setSaving(true);
    try {
      const rid = await saveRecipe(draft, photo);
      navigate(`/recipes/${rid}`, { replace: true });
    } catch (e) {
      setSaving(false);
      setError('Recept se nepodařilo uložit. Zkontrolujte připojení a zkuste to znovu.');
    }
  };

  const del = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Opravdu smazat recept „${draft.name}“? Zmizí i z naplánovaných dnů.`)) return;
    setSaving(true);
    try {
      await deleteRecipe(id);
      navigate('/recipes', { replace: true });
    } catch (e) {
      setSaving(false);
      setError('Recept se nepodařilo smazat.');
    }
  };

  const shownImg = photo || currentImg;

  return (
    <div className="screen" style={{ gap: 20, paddingBottom: 'calc(var(--safe-bottom) + 32px)' }}>
      <div className="row--between only-mobile">
        <button type="button" className="icon-btn" onClick={cancel} aria-label="Zrušit">
          <Icon name="close" />
        </button>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{isNew ? 'Nový recept' : 'Upravit recept'}</div>
        <button
          type="button"
          className="link-btn"
          style={{ fontSize: 15, fontWeight: 800, height: 44, padding: '0 6px' }}
          onClick={save}
          disabled={saving || photoBusy}
        >
          Uložit
        </button>
      </div>

      <div className="row only-desktop" style={{ gap: 12 }}>
        <h1 className="serif edit__title">{isNew ? 'Nový recept' : 'Upravit recept'}</h1>
        <button type="button" className="btn btn--outline-d" style={{ fontSize: 15 }} onClick={cancel}>
          Zrušit
        </button>
        <button
          type="button"
          className="btn btn--d"
          style={{ fontSize: 15, padding: '0 22px' }}
          onClick={save}
          disabled={saving || photoBusy}
        >
          {saving ? <Spinner small /> : 'Uložit recept'}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="edit__grid">
        <label
          className={`edit__photo${shownImg ? ' edit__photo--has' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
          {photoBusy ? (
            <Spinner />
          ) : shownImg ? (
            <>
              <img src={shownImg} alt="" className={!photo && currentLoading ? 'img-placeholder' : undefined} />
              <span className="edit__photo-change">
                <Icon name="photo_camera" size={18} />
                Změnit fotku
              </span>
            </>
          ) : (
            <div className="edit__photo-empty">
              <div className="edit__photo-icon">
                <Icon name="add_a_photo" size={26} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Nahrát fotku</div>
              <div className="edit__photo-hint">
                <span className="only-mobile">Vyfoťte hotové jídlo nebo vyberte z galerie</span>
                <span className="only-desktop">Přetáhněte sem obrázek nebo klikněte a vyberte</span>
              </div>
            </div>
          )}
        </label>

        <div className="edit__fields">
          <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: 1 }}>
              Název
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setD({ name: e.target.value })}
                placeholder="Např. Kuřecí curry"
                maxLength={80}
              />
            </label>
            <input
              className="edit__emoji"
              value={draft.emoji}
              onChange={(e) => setD({ emoji: lastGrapheme(e.target.value) })}
              aria-label="Emoji receptu"
              title="Emoji, které se ukáže, když recept nemá fotku"
            />
          </div>

          <div className="edit__row2">
            <div className="stack">
              <div className="field">Typ jídla</div>
              <div className="chips">
                {SLOTS.map((s) => (
                  <button
                    type="button"
                    key={s.key}
                    className={`chip${draft.types.includes(s.key) ? ' chip--on' : ''}`}
                    aria-pressed={draft.types.includes(s.key)}
                    onClick={() => toggleType(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              Příprava
              <input
                className="input"
                value={draft.preparation}
                onChange={(e) => setD({ preparation: e.target.value })}
                placeholder="Vaření, Pečení…"
                maxLength={80}
              />
            </label>
          </div>

          <div className="stack">
            <div className="field">Suroviny</div>
            {draft.ingredients.map((g, i) => (
              <div className="edit__ing" key={i}>
                <input
                  className="input input--amount"
                  value={g.amount}
                  onChange={(e) => setIng(i, { amount: e.target.value })}
                  placeholder="Množství"
                  aria-label="Množství"
                  maxLength={40}
                />
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={g.name}
                  onChange={(e) => setIng(i, { name: e.target.value })}
                  placeholder="Surovina"
                  aria-label="Surovina"
                  maxLength={80}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--plain"
                  onClick={() => setD({ ingredients: draft.ingredients.filter((_, j) => j !== i) })}
                  aria-label="Odebrat surovinu"
                >
                  <Icon name="remove_circle" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="edit__add-ing"
              disabled={draft.ingredients.length >= 60}
              onClick={() => setD({ ingredients: [...draft.ingredients, { name: '', amount: '' }] })}
            >
              <Icon name="add" size={19} />
              Přidat surovinu
            </button>
          </div>

          <label className="field">
            Postup
            <textarea
              className="input"
              rows={5}
              value={draft.instructions}
              onChange={(e) => setD({ instructions: e.target.value })}
              placeholder="Jak na to…"
              maxLength={5000}
            />
          </label>

          <button
            type="button"
            className="btn only-mobile"
            style={{ fontSize: 16 }}
            onClick={save}
            disabled={saving || photoBusy}
          >
            {saving ? <Spinner small /> : 'Uložit recept'}
          </button>

          {!isNew && (
            <button
              type="button"
              className="btn btn--danger btn--sm edit__delete"
              onClick={del}
              disabled={saving}
            >
              <Icon name="delete" size={20} />
              Smazat recept
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
