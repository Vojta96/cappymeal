import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../Images/Cappy.png';
import { Spinner } from '../components/ui';
import './auth.css';

const ERRORS = {
  'auth/email-already-in-use': 'Tato přezdívka už je obsazená.',
  'auth/invalid-credential': 'Přezdívka nebo heslo nejsou správné.',
  'auth/invalid-login-credentials': 'Přezdívka nebo heslo nejsou správné.',
  'auth/user-not-found': 'Přezdívka nebo heslo nejsou správné.',
  'auth/wrong-password': 'Přezdívka nebo heslo nejsou správné.',
  'auth/weak-password': 'Heslo musí mít alespoň 6 znaků.',
  'auth/invalid-email': 'Přezdívka obsahuje nepovolené znaky.',
  'auth/too-many-requests': 'Příliš mnoho pokusů. Zkuste to za chvíli.',
  'auth/network-request-failed': 'Nejste připojeni k internetu.',
};

const NICK_RE = /^[a-zA-Z0-9._-]{3,30}$/;

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isReg = mode === 'register';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const nick = nickname.trim();
    if (!nick || !password) {
      setError('Vyplňte přezdívku i heslo.');
      return;
    }
    if (isReg) {
      if (!NICK_RE.test(nick)) {
        setError('Přezdívka musí mít 3–30 znaků: písmena bez diakritiky, číslice, tečka, pomlčka.');
        return;
      }
      if (password.length < 6) {
        setError('Heslo musí mít alespoň 6 znaků.');
        return;
      }
      if (password !== password2) {
        setError('Hesla se neshodují.');
        return;
      }
    }
    setBusy(true);
    try {
      if (isReg) await register(nick, password);
      else await login(nick, password);
    } catch (err) {
      setError(ERRORS[err.code] || 'Něco se pokazilo. Zkuste to znovu.');
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isReg ? 'login' : 'register');
    setError('');
    setPassword('');
    setPassword2('');
  };

  return (
    <div className="auth">
      <div className="auth__brand">
        <div className="auth__logo">
          <img src={logo} alt="CappyMeal" />
        </div>
        <div className="auth__name">CappyMeal</div>
        <div className="auth__tagline">Společný jídelníček a nákup pro vaši domácnost</div>
      </div>
      <form className="auth__form" onSubmit={submit} noValidate>
        <label className="field">
          Přezdívka
          <input
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          Heslo
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isReg ? 'new-password' : 'current-password'}
          />
        </label>
        {isReg && (
          <label className="field">
            Heslo znovu
            <input
              className="input"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn" style={{ marginTop: 10, fontSize: 16 }} disabled={busy}>
          {busy ? <Spinner small /> : isReg ? 'Vytvořit účet' : 'Přihlásit se'}
        </button>
        <div className="auth__switch">
          {isReg ? 'Už máte účet?' : 'Nemáte účet?'}{' '}
          <button type="button" onClick={switchMode}>
            {isReg ? 'Přihlásit se' : 'Registrovat se'}
          </button>
        </div>
      </form>
    </div>
  );
}
