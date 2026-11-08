import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createHousehold, joinHousehold } from '../services/household';
import { normalizeJoinCode } from '../lib/joinCode';
import logo from '../Images/Cappy.png';
import { Icon, Spinner } from '../components/ui';
import AuthLayout from '../components/AuthLayout';
import './auth.css';

export default function Household() {
  const { user, nickname, logout } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null); // 'create' | 'join'
  const [error, setError] = useState('');

  const run = async (kind, fn) => {
    setError('');
    setBusy(kind);
    try {
      await fn();
      // AuthContext profile listener switches the app to the household automatically.
    } catch (e) {
      const msg = e && e.code === 'PERMISSION_DENIED' ? 'Nemáte oprávnění. Zkontrolujte kód.' : e && e.message;
      setError(msg || 'Něco se pokazilo. Zkuste to znovu.');
      setBusy(null);
    }
  };

  return (
    <AuthLayout wide>
      <div className="auth__brand">
        <div className="auth__logo only-mobile" style={{ width: 88, height: 88, borderRadius: 28 }}>
          <img src={logo} alt="" style={{ width: 60, height: 60 }} />
        </div>
        <div className="auth__name" style={{ fontSize: 38 }}>
          Vítejte, {nickname}
        </div>
        <div className="auth__tagline" style={{ maxWidth: 300 }}>
          Jídelníček sdílíte s partnerem v jedné domácnosti. Založte ji, nebo se připojte kódem.
        </div>
      </div>

      <form
        className="hh-option"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('Doplňte název domácnosti.');
            return;
          }
          run('create', () => createHousehold(user.uid, nickname, name));
        }}
      >
        <div className="hh-option__head">
          <div className="hh-option__icon">
            <Icon name="home" />
          </div>
          <div>
            <div className="hh-option__title">Založit domácnost</div>
            <div className="hh-option__text">
              Připravíme vám sbírku receptů a kód, kterým se k vám připojí partner(ka).
            </div>
          </div>
        </div>
        <label className="field">
          Název domácnosti
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="např. Procházkovi"
            required
            maxLength={40}
          />
        </label>
        <button type="submit" className="btn" disabled={!!busy || !name.trim()}>
          {busy === 'create' ? <Spinner small /> : 'Založit domácnost'}
        </button>
      </form>

      <form
        className="hh-option"
        onSubmit={(e) => {
          e.preventDefault();
          run('join', () => joinHousehold(user.uid, nickname, code));
        }}
      >
        <div className="hh-option__head">
          <div className="hh-option__icon">
            <Icon name="group_add" />
          </div>
          <div>
            <div className="hh-option__title">Připojit se kódem</div>
            <div className="hh-option__text">Kód najde partner(ka) v aplikaci v Upozorněních.</div>
          </div>
        </div>
        <input
          className="input code-input"
          value={code}
          onChange={(e) => setCode(normalizeJoinCode(e.target.value))}
          placeholder="ABCD2345"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Kód domácnosti"
        />
        <button type="submit" className="btn btn--soft" disabled={!!busy || code.length !== 8}>
          {busy === 'join' ? <Spinner /> : 'Připojit se'}
        </button>
      </form>

      {error && <div className="form-error">{error}</div>}

      <div className="auth__switch">
        <button type="button" onClick={logout}>
          Odhlásit se
        </button>
      </div>
    </AuthLayout>
  );
}
