import React, { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet';
import { Icon, Spinner, Toggle } from './ui';
import { useHousehold } from '../context/HouseholdContext';

const EMPTY = { name: '', amount: '', auto: true };

/**
 * Add / edit / delete regular shopping items ("pravidelné položky").
 * mode: 'add' (form only) | 'manage' (form + list).
 */
export default function RegularsSheet({ open, mode, onClose }) {
  const { regulars, addRegular, updateRegular, deleteRegular } = useHousehold();
  const [editing, setEditing] = useState(null); // id | null
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setEditing(null);
      setForm(EMPTY);
      setError('');
    }
  }, [open, mode]);

  const list = Object.entries(regulars || {})
    .filter(([, r]) => r && r.name)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'cs'));

  const startEdit = (id, r) => {
    setEditing(id);
    setForm({ name: r.name || '', amount: r.amount || '', auto: !!r.auto });
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Doplňte název položky.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) await updateRegular(editing, form);
      else await addRegular(form);
      setEditing(null);
      setForm(EMPTY);
      if (mode === 'add') onClose();
    } catch (err) {
      setError('Položku se nepodařilo uložit.');
    } finally {
      setBusy(false);
    }
  };

  const del = async (id, r) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Smazat pravidelnou položku „${r.name}“?`)) return;
    try {
      await deleteRegular(id);
      if (editing === id) {
        setEditing(null);
        setForm(EMPTY);
      }
    } catch (err) {
      setError('Položku se nepodařilo smazat.');
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={mode === 'manage' ? 'Pravidelné položky' : 'Nová pravidelná položka'}
      sub={mode === 'manage' ? 'Věci, které kupujete pořád – káva, mléko…' : 'Např. káva, toaletní papír'}
    >
      <form className="regs-form" onSubmit={submit} noValidate>
        <div className="regs-form__row">
          <label className="field" style={{ flex: 2 }}>
            Název
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Káva zrnková"
              maxLength={80}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Množství
            <input
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="1 balení"
              maxLength={40}
            />
          </label>
        </div>
        <button
          type="button"
          className="list-row regs-form__auto"
          role="switch"
          aria-checked={form.auto}
          onClick={() => setForm((f) => ({ ...f, auto: !f.auto }))}
        >
          <div className="list-row__body">
            <div className="list-row__title">Přidávat vždy</div>
            <div className="list-row__sub">Při každém nákupu bude předvybraná</div>
          </div>
          <Toggle on={form.auto} />
        </button>
        {error && <div className="form-error">{error}</div>}
        <div className="regs-form__actions">
          {editing && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY);
              }}
            >
              Zrušit úpravu
            </button>
          )}
          <button type="submit" className="btn btn--sm" disabled={busy}>
            {busy ? <Spinner small /> : editing ? 'Uložit změny' : 'Přidat položku'}
          </button>
        </div>
      </form>

      {mode === 'manage' && (
        <div className="regs-list">
          {list.length === 0 && <div className="muted regs-list__empty">Zatím žádné pravidelné položky.</div>}
          {list.map(([id, r]) => (
            <div key={id} className={`list-row regs-list__row${editing === id ? ' regs-list__row--on' : ''}`}>
              <button type="button" className="regs-list__main" onClick={() => startEdit(id, r)}>
                <div className="list-row__body">
                  <div className="list-row__title">{r.name}</div>
                  <div className="list-row__sub">
                    {[r.amount, r.auto ? 'Přidává se vždy' : 'Jen když ji vyberete'].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="regs-list__auto"
                role="switch"
                aria-checked={!!r.auto}
                aria-label={`Přidávat vždy – ${r.name}`}
                onClick={() => updateRegular(id, { auto: !r.auto }).catch(() => setError('Změnu se nepodařilo uložit.'))}
              >
                <Toggle on={!!r.auto} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--sm icon-btn--plain"
                onClick={() => del(id, r)}
                aria-label={`Smazat ${r.name}`}
              >
                <Icon name="delete" size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
