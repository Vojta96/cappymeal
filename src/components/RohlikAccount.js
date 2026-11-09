import React, { useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { disconnectRohlik, finishRohlikOAuth, startRohlikOAuth } from '../services/rohlik';
import { Icon, Spinner } from './ui';

/**
 * Settings card "Účet Rohlík". Rohlík only allows a loopback redirect for our OAuth client,
 * so the owner logs in at Rohlík, lands on a page that does not load and pastes its address
 * back here (step 2). Only the owner connects / disconnects; members see the status.
 */
export default function RohlikAccount({ onToast }) {
  const { rohlik, isOwner } = useHousehold();
  const [auth, setAuth] = useState(null); // { authUrl, redirectUri } after step 1
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(null); // 'start' | 'finish' | 'disconnect'
  const [error, setError] = useState('');
  const connected = !!(rohlik && rohlik.connected);
  const expired = !connected && !!(rohlik && rohlik.needsReconnect);

  const start = async () => {
    setError('');
    // Open the window synchronously (inside the click) so popup blockers allow it,
    // then point it at Rohlík once the server has prepared the login.
    let win = null;
    try {
      win = window.open('', '_blank');
    } catch (e) {
      win = null;
    }
    setBusy('start');
    try {
      const res = await startRohlikOAuth();
      setAuth(res);
      setPasted('');
      if (win && !win.closed) {
        try {
          win.opener = null;
        } catch (e) {
          // ignore
        }
        win.location.href = res.authUrl;
      }
    } catch (err) {
      if (win && !win.closed) win.close();
      setError(err.message || 'Přihlášení se nepodařilo spustit.');
    } finally {
      setBusy(null);
    }
  };

  const finish = async (e) => {
    e.preventDefault();
    setError('');
    if (!pasted.trim()) {
      setError('Vložte adresu, na kterou vás Rohlík přesměroval.');
      return;
    }
    setBusy('finish');
    try {
      await finishRohlikOAuth(pasted.trim());
      setAuth(null);
      setPasted('');
      if (onToast) onToast('Účet Rohlík je připojený');
    } catch (err) {
      setError(err.message || 'Účet se nepodařilo připojit.');
      if (err && ['OAUTH_EXPIRED', 'OAUTH_CODE_INVALID'].includes(err.reason)) setAuth(null);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Odpojit účet Rohlík? Přístup CappyMealu k vašemu košíku se ze serveru smaže.')) return;
    setBusy('disconnect');
    setError('');
    try {
      await disconnectRohlik();
      if (onToast) onToast('Účet Rohlík byl odpojen');
    } catch (err) {
      setError(err.message || 'Účet se nepodařilo odpojit.');
    } finally {
      setBusy(null);
    }
  };

  const ownerFlow = !auth ? (
    <div className="rohlik-acc__step">
      <div className="list-row__sub">
        Přihlásíte se přímo na stránkách Rohlíku – CappyMeal vaše heslo neuvidí.
      </div>
      <button type="button" className="btn btn--sm rohlik-acc__btn" onClick={start} disabled={!!busy}>
        {busy === 'start' ? (
          <Spinner small />
        ) : (
          <>
            <Icon name="login" size={20} />
            {expired ? 'Znovu se přihlásit přes Rohlík' : 'Přihlásit se přes Rohlík'}
          </>
        )}
      </button>
    </div>
  ) : (
    <form className="rohlik-acc__step" onSubmit={finish} noValidate>
      <ol className="rohlik-acc__steps">
        <li>
          Přihlaste se na Rohlíku v nově otevřeném okně.{' '}
          <a href={auth.authUrl} target="_blank" rel="noopener noreferrer">
            Okno se neotevřelo? Otevřít přihlášení
          </a>
        </li>
        <li>
          Po přihlášení vás Rohlík přesměruje na stránku, která se nenačte (to je v pořádku). Zkopírujte celou
          adresu z adresního řádku a vložte ji sem.
        </li>
      </ol>
      <div className="rohlik-acc__hint" aria-hidden="true">
        <Icon name="language" size={18} />
        <span className="ellipsis">{auth.redirectUri}?code=…&amp;state=…</span>
      </div>
      <label className="field">
        Adresa z adresního řádku
        <input
          className="input"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={`${auth.redirectUri}?code=…`}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
          maxLength={4000}
        />
      </label>
      <div className="rohlik-acc__actions">
        <button type="submit" className="btn btn--sm" disabled={!!busy}>
          {busy === 'finish' ? <Spinner small /> : 'Dokončit připojení'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setAuth(null);
            setError('');
          }}
          disabled={!!busy}
        >
          Zrušit
        </button>
      </div>
    </form>
  );

  return (
    <div className="list-card rohlik-acc">
      {connected ? (
        <div className="list-row">
          <div className="notif__avatar rohlik-acc__icon">
            <Icon name="link" size={20} />
          </div>
          <div className="list-row__body">
            <div className="list-row__title">Připojeno</div>
            <div className="list-row__sub">
              {rohlik.emailMasked ? `jako ${rohlik.emailMasked}` : 'Účet Rohlík je připojený'}
            </div>
          </div>
          {isOwner && (
            <button type="button" className="btn btn--ghost btn--sm btn--auto" onClick={disconnect} disabled={!!busy}>
              {busy === 'disconnect' ? <Spinner small /> : 'Odpojit'}
            </button>
          )}
        </div>
      ) : (
        <>
          {expired && (
            <div className="rohlik-acc__warn">
              <Icon name="error" size={20} />
              Přihlášení k Rohlíku vypršelo{rohlik.emailMasked ? ` (${rohlik.emailMasked})` : ''}. Připojte účet
              znovu.
            </div>
          )}
          {isOwner ? (
            ownerFlow
          ) : (
            <div className="list-row">
              <div className="list-row__body">
                <div className="list-row__title">Nepřipojeno</div>
                <div className="list-row__sub">Účet Rohlík může připojit zakladatel(ka) domácnosti.</div>
              </div>
            </div>
          )}
        </>
      )}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div className="rohlik-acc__note">
        CappyMeal dostane jen přístup k nákupu této domácnosti a používá ho k vložení položek do košíku. Přístup
        můžete kdykoli zrušit tlačítkem Odpojit nebo v nastavení svého účtu Rohlík.
      </div>
    </div>
  );
}
