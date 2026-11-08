import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner, Toast, Toggle } from '../components/ui';
import { dayInfo, relativeTime } from '../lib/dates';
import { enablePush, pushSupported } from '../services/push';
import { removeMember, rotateJoinCode } from '../services/household';
import RohlikAccount from '../components/RohlikAccount';
import { capitalizeFirst, householdDisplayName, initial } from '../lib/text';
import './notifications.css';

const SETTINGS = [
  ['remind3d', '3 dny předem', 'Když na den za 3 dny není objednáno'],
  ['remindDaily', 'Každý další den', 'Připomínat denně, dokud neobjednáte'],
  ['remindBoth', 'Oběma v domácnosti', 'Upozornění dostanete vy i partner(ka)'],
];

const ACTIVITY_META = {
  plan: { icon: 'edit_calendar', title: 'Změna plánu', to: '/plan' },
  recipe: { icon: 'menu_book', title: 'Recepty', to: '/recipes' },
  order: { icon: 'local_shipping', title: 'Objednávka', to: '/' },
};

const PUSH_RESULT = {
  granted: 'Upozornění jsou zapnutá.',
  denied: 'Upozornění jsou v prohlížeči zakázaná. Povolte je v nastavení telefonu.',
  unsupported: 'Tento prohlížeč upozornění nepodporuje.',
  error: 'Upozornění se nepodařilo zapnout. Zkuste to znovu.',
};

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');
const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  window.navigator.standalone === true;

export default function Notifications() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    hid,
    uid,
    alert,
    orders,
    activity,
    members,
    joinCode,
    name,
    settings,
    owner,
    isOwner,
    updateSettings,
    updateHouseholdName,
  } = useHousehold();
  const [ownerBusy, setOwnerBusy] = useState(null); // 'code' | member uid
  const [nameDraft, setNameDraft] = useState(capitalizeFirst(name));
  useEffect(() => setNameDraft(capitalizeFirst(name)), [name]);
  const [supported, setSupported] = useState(null);
  const [pushState, setPushState] = useState(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'granted' : null,
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);

  useEffect(() => {
    let alive = true;
    pushSupported().then((ok) => alive && setSupported(ok));
    return () => {
      alive = false;
    };
  }, []);

  const notifs = useMemo(() => {
    const list = [];
    if (alert) {
      list.push({
        id: 'alert',
        icon: 'schedule',
        bg: 'var(--alert-bg)',
        fg: '#9A5B12',
        title: alert.title,
        text: 'Upozornění 3 dny předem · opakuje se denně',
        time: `Dnes ${settings.remindHour}:00`,
        to: alert.allInCart ? '/cart/done' : '/cart',
      });
    }
    // Last order (days sharing the newest timestamp).
    const entries = Object.entries(orders || {}).filter(([, o]) => o && o.at);
    if (entries.length) {
      const lastAt = Math.max(...entries.map(([, o]) => o.at));
      const last = entries.filter(([, o]) => o.at === lastAt);
      const status = last[0][1].status;
      const days = last.map(([k]) => k).sort();
      const label = days.map((k) => dayInfo(k).shortLabel.toLowerCase()).join(', ');
      list.push({
        id: 'order',
        icon: status === 'ordered' ? 'check_circle' : 'shopping_cart',
        bg: status === 'ordered' ? 'var(--success-bg)' : '#F3E7C9',
        fg: status === 'ordered' ? 'var(--success)' : '#7A5A12',
        title: status === 'ordered' ? 'Objednávka dokončena' : 'Košík na Rohlíku čeká na potvrzení',
        text: `Suroviny na ${label}`,
        time: relativeTime(lastAt),
        to: status === 'ordered' ? null : '/cart/done',
        state: status === 'ordered' ? null : { days },
      });
    }
    activity
      .filter((a) => a.by && a.by !== uid)
      .slice(0, 10)
      .forEach((a) => {
        const m = ACTIVITY_META[a.type] || ACTIVITY_META.plan;
        list.push({
          id: a.id,
          icon: m.icon,
          bg: 'var(--chip)',
          fg: 'var(--primary)',
          title: m.title,
          text: a.text,
          time: relativeTime(a.at),
          to: m.to,
        });
      });
    return list;
  }, [alert, orders, activity, uid, settings.remindHour]);

  const turnOnPush = async () => {
    setPushBusy(true);
    const res = await enablePush(hid, uid);
    setPushBusy(false);
    setPushState(res);
    setToast(PUSH_RESULT[res] || PUSH_RESULT.error);
  };

  const shareCode = async () => {
    const text = `Připoj se k naší domácnosti v CappyMeal kódem ${joinCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CappyMeal', text });
        return;
      }
      await navigator.clipboard.writeText(joinCode);
      setToast('Kód zkopírován');
    } catch (e) {
      // share dismissed
    }
  };

  const iosNeedsInstall = isIOS() && !isStandalone();

  const newCode = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Vygenerovat nový kód? Starý kód přestane platit.')) return;
    setOwnerBusy('code');
    try {
      await rotateJoinCode();
      setToast('Nový kód je připravený');
    } catch (e) {
      setToast(e.message || 'Kód se nepodařilo změnit');
    } finally {
      setOwnerBusy(null);
    }
  };

  const kick = async (mid, nick) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Odebrat ${capitalizeFirst(nick)} z domácnosti? Kód pro připojení se zároveň změní.`)) return;
    setOwnerBusy(mid);
    try {
      await removeMember(mid);
      setToast('Člen byl odebrán');
    } catch (e) {
      setToast(e.message || 'Člena se nepodařilo odebrat');
    } finally {
      setOwnerBusy(null);
    }
  };

  const saveName = async () => {
    const next = capitalizeFirst(nameDraft);
    if (!next) {
      setNameDraft(capitalizeFirst(name));
      setToast('Název domácnosti nemůže být prázdný');
      return;
    }
    if (next === name) {
      setNameDraft(next);
      return;
    }
    try {
      await updateHouseholdName(next);
      setToast('Název domácnosti uložen');
    } catch (e) {
      setToast('Název se nepodařilo uložit');
    }
  };

  return (
    <div className="screen" style={{ gap: 20 }}>
      <div className="row" style={{ gap: 12 }}>
        <button
          type="button"
          className="icon-btn only-mobile"
          onClick={() => navigate('/')}
          aria-label="Zpět"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="h-title notif__h1">Upozornění</h1>
      </div>

      <div className="notif-grid">
        <div className="stack" style={{ gap: 10 }}>
          {notifs.map((n) => (
            <button
              type="button"
              key={n.id}
              className="notif"
              onClick={() => n.to && navigate(n.to, n.state ? { state: n.state } : undefined)}
            >
              <div className="notif__icon" style={{ background: n.bg, color: n.fg }}>
                <Icon name={n.icon} size={21} />
              </div>
              <div className="list-row__body" style={{ gap: 3 }}>
                <div className="row--between" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <div className="notif__title">{n.title}</div>
                  <div className="notif__time">{n.time}</div>
                </div>
                <div className="notif__text">{n.text}</div>
              </div>
            </button>
          ))}
          {notifs.length === 0 && (
            <div className="empty-card" style={{ padding: '26px 20px' }}>
              <Icon name="notifications_off" size={34} style={{ color: 'var(--muted-3)' }} />
              <div className="empty-card__text">Zatím žádná upozornění.</div>
            </div>
          )}
        </div>

        <div className="notif-side">
          <div className="stack">
            <h2 className="h-section">
              <span className="only-mobile">Nastavení</span>
              <span className="only-desktop">Nastavení připomínek</span>
            </h2>
            <div className="list-card">
              {SETTINGS.map(([k, label, sub]) => (
                <button
                  type="button"
                  key={k}
                  className="list-row"
                  role="switch"
                  aria-checked={!!settings[k]}
                  onClick={() => updateSettings({ [k]: !settings[k] })}
                >
                  <div className="list-row__body">
                    <div className="list-row__title">{label}</div>
                    <div className="list-row__sub">{sub}</div>
                  </div>
                  <Toggle on={!!settings[k]} />
                </button>
              ))}
              <div className="list-row" style={{ justifyContent: 'space-between' }}>
                <div className="list-row__title">Čas připomínky</div>
                <select
                  className="notif__select"
                  value={settings.remindHour}
                  onChange={(e) => updateSettings({ remindHour: Number(e.target.value) })}
                  aria-label="Čas připomínky"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="push-box">
              <button
                type="button"
                className={`btn btn--sm${pushState === 'granted' ? ' btn--soft' : ''}`}
                onClick={turnOnPush}
                disabled={pushBusy || supported === false}
              >
                {pushBusy ? (
                  <Spinner small />
                ) : (
                  <>
                    <Icon
                      name={pushState === 'granted' ? 'notifications_active' : 'phone_iphone'}
                      size={20}
                    />
                    {pushState === 'granted'
                      ? 'Upozornění na telefonu jsou zapnutá'
                      : 'Zapnout upozornění na telefonu'}
                  </>
                )}
              </button>
              <div className="push-box__hint">
                {supported === false && !iosNeedsInstall ? 'Tento prohlížeč upozornění nepodporuje. ' : ''}
                Na iPhonu nejdřív přidejte CappyMeal na plochu (Sdílet → Přidat na plochu), otevřete ji z
                plochy a teprve pak upozornění zapněte. Zapněte je na obou telefonech.
              </div>
            </div>
          </div>

          <div className="stack">
            <h2 className="h-section">{householdDisplayName(name)}</h2>
            <div className="list-card">
              {isOwner ? (
                <label className="list-row notif__name-row">
                  <div className="list-row__body">
                    <div className="list-row__sub">Název domácnosti</div>
                    <input
                      className="notif__name-input"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      placeholder="např. Procházkovi"
                      maxLength={40}
                    />
                  </div>
                  <Icon name="edit" size={19} className="notif__name-icon" />
                </label>
              ) : (
                <div className="list-row">
                  <div className="list-row__body">
                    <div className="list-row__sub">Název domácnosti</div>
                    <div className="list-row__title">{householdDisplayName(name)}</div>
                  </div>
                </div>
              )}
              <div className="list-row">
                <div className="list-row__body">
                  <div className="list-row__sub">Kód pro připojení</div>
                  <div className="notif__code">{joinCode || '—'}</div>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    onClick={newCode}
                    disabled={!!ownerBusy}
                    aria-label="Vygenerovat nový kód"
                    title="Vygenerovat nový kód"
                  >
                    {ownerBusy === 'code' ? <Spinner small /> : <Icon name="autorenew" size={20} />}
                  </button>
                )}
                {joinCode && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    onClick={shareCode}
                    aria-label="Sdílet kód"
                  >
                    <Icon name="ios_share" size={20} />
                  </button>
                )}
              </div>
              {Object.entries(members).map(([mid, m]) => (
                <div key={mid} className="list-row">
                  <div className="notif__avatar">{initial(m.nickname)}</div>
                  <div className="list-row__body">
                    <div className="list-row__title">
                      {capitalizeFirst(m.nickname)}
                      {mid === uid ? ' (vy)' : ''}
                    </div>
                    {(m.joinedAt || mid === owner) && (
                      <div className="list-row__sub">
                        {mid === owner ? 'Zakladatel(ka)' : ''}
                        {mid === owner && m.joinedAt ? ' · ' : ''}
                        {m.joinedAt ? `Členem od ${new Date(m.joinedAt).toLocaleDateString('cs-CZ')}` : ''}
                      </div>
                    )}
                  </div>
                  {isOwner && mid !== uid && mid !== owner && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      onClick={() => kick(mid, m.nickname)}
                      disabled={!!ownerBusy}
                      aria-label={`Odebrat ${capitalizeFirst(m.nickname)}`}
                      title="Odebrat z domácnosti"
                    >
                      {ownerBusy === mid ? <Spinner small /> : <Icon name="person_remove" size={20} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {Object.keys(members).length < 2 && (
              <div className="push-box__hint" style={{ padding: '0 4px' }}>
                Partner(ka) se připojí tak, že se zaregistruje a na úvodní obrazovce zadá tento kód.
              </div>
            )}
          </div>

          <RohlikAccount onToast={setToast} />

          <button type="button" className="btn btn--ghost btn--sm only-mobile" onClick={logout}>
            <Icon name="logout" size={20} />
            Odhlásit se
          </button>
        </div>
      </div>
      <Toast text={toast} onDone={clearToast} />
    </div>
  );
}
