import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'Tato přezdívka je již zabraná.',
  'auth/invalid-credential': 'Přezdívka nebo heslo není správné.',
  'auth/user-not-found': 'Přezdívka nebo heslo není správné.',
  'auth/wrong-password': 'Přezdívka nebo heslo není správné.',
  'auth/weak-password': 'Heslo musí mít alespoň 6 znaků.',
  'auth/invalid-email': 'Přezdívka obsahuje nepovolené znaky.',
  'auth/too-many-requests': 'Příliš mnoho pokusů. Zkus to za chvíli.',
};

const Login = () => {
  const [tab, setTab] = useState('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(nickname, password);
      navigate('/');
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] ?? 'Něco se pokazilo. Zkus to znovu.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('Hesla se neshodují.');
      return;
    }
    setLoading(true);
    try {
      await register(nickname, password);
      navigate('/');
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] ?? 'Něco se pokazilo. Zkus to znovu.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setPassword('');
    setPassword2('');
  };

  return (
    <div className='form--container'>
      <div>
        <div className='login--switch'>
          <p
            onClick={() => switchTab('login')}
            className={tab === 'login' ? 'login--switch__active' : ''}
          >
            Login
          </p>
          <p>  /  </p>
          <p
            onClick={() => switchTab('register')}
            className={tab === 'register' ? 'login--switch__active' : ''}
          >
            Register
          </p>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className='loginForm'>
            <label htmlFor='nickname'>Přezdívka:</label>
            <input
              id='nickname'
              type='text'
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              autoComplete='username'
            />
            <label htmlFor='password'>Heslo:</label>
            <input
              id='password'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete='current-password'
            />
            {error && <p className='loginForm__error'>{error}</p>}
            <input
              type='submit'
              className='loginForm__submit-btn'
              value={loading ? 'Přihlašuji…' : 'Přihlásit se'}
              disabled={loading}
            />
          </form>
        ) : (
          <form onSubmit={handleRegister} className='loginForm'>
            <label htmlFor='nickname2'>Přezdívka:</label>
            <input
              id='nickname2'
              type='text'
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              autoComplete='username'
            />
            <label htmlFor='password1'>Heslo:</label>
            <input
              id='password1'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete='new-password'
            />
            <label htmlFor='password2'>Heslo pro kontrolu:</label>
            <input
              id='password2'
              type='password'
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              required
              autoComplete='new-password'
            />
            {error && <p className='loginForm__error'>{error}</p>}
            <input
              type='submit'
              className='loginForm__submit-btn'
              value={loading ? 'Registruji…' : 'Registrovat se'}
              disabled={loading}
            />
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
