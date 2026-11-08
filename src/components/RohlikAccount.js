import React, { useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { connectRohlik, disconnectRohlik } from '../services/rohlik';
import { Icon, Spinner } from './ui';

/** Settings section "Účet Rohlík" – per-household Rohlík credentials (owner manages them). */
export default function RohlikAccount({ onToast }) {
  const { rohlik, isOwner } = useHousehold();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const connected = !!(rohlik && rohlik.connected);

  const connect = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Vyplňte e-mail i heslo k účtu Rohlík.');
      return;
    }
    setBusy(true);
    try {
      await connectRohlik(email.trim(), password);
      setEmail('');
      setPassword('');
      if (onToast) onToast('Účet Rohlík je připojený');
    } catch (err) {
      setError(err.message || 'Účet se nepodařilo připojit.');
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  const disconnect = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Odpojit účet Rohlík? Uložené přihlášení se ze serveru smaže.')) return;
    setBusy(true);
    setError('');
    try {
      await disconnectRohlik();
      if (onToast) onToast('Účet Rohlík byl odpojen');
    } catch (err) {
      setError(err.message || 'Účet se nepodařilo odpojit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <h2 className="h-section">Účet Rohlík</h2>
      <div className="list-card">
        {connected ? (
          <div className="list-row">
            <div className="notif__avatar rohlik-acc__icon">
              <Icon name="link" size={20} />
            </div>
            <div className="list-row__body">
              <div className="list-row__title">Připojeno</div>
              <div className="list-row__sub">{rohlik.emailMasked || 'Účet Rohlík'}</div>
            </div>
            {isOwner && (
              <button type="button" className="btn btn--ghost btn--sm btn--auto" onClick={disconnect} disabled={busy}>
                {busy ? <Spinner small /> : 'Odpojit'}
              </button>
            )}
          </div>
        ) : isOwner ? (
          <form className="rohlik-acc__form" onSubmit={connect} noValidate>
            <label className="field">
              E-mail k účtu Rohlík
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
              />
            </label>
            <label className="field">
              Heslo
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                maxLength={200}
              />
            </label>
            <button type="submit" className="btn btn--sm" disabled={busy}>
              {busy ? <Spinner small /> : 'Připojit'}
            </button>
          </form>
        ) : (
          <div className="list-row">
            <div className="list-row__body">
              <div className="list-row__title">Nepřipojeno</div>
              <div className="list-row__sub">Účet Rohlík může připojit zakladatel(ka) domácnosti.</div>
            </div>
          </div>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="push-box__hint" style={{ padding: '0 4px' }}>
        Heslo se ukládá šifrovaně na serveru a používá se jen k vložení nákupu této domácnosti do košíku
        na Rohlíku. Nikomu se nezobrazuje.
      </div>
    </div>
  );
}
