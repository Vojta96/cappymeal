import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { Icon } from '../components/ui';
import { dayInfo, relativeTime } from '../lib/dates';
import { leadShift } from '../lib/checkout';
import './notifications.css';

const ACTIVITY_META = {
  plan: { icon: 'edit_calendar', title: 'Změna plánu', to: '/plan' },
  recipe: { icon: 'menu_book', title: 'Recepty', to: '/recipes' },
  order: { icon: 'local_shipping', title: 'Objednávka', to: '/' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { uid, alert, orders, activity, settings } = useHousehold();

  const notifs = useMemo(() => {
    const list = [];
    if (alert) {
      list.push({
        id: 'alert',
        icon: 'schedule',
        bg: 'var(--alert-bg)',
        fg: '#9A5B12',
        title: alert.title,
        text: `Upozornění ${leadShift(settings) ? 4 : 3} dny předem · opakuje se denně`,
        time: `Dnes ${settings.remindHour}:00`,
        to: alert.allInCart ? '/cart/checkout' : '/cart',
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
        to: status === 'ordered' ? null : '/cart/checkout',
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
  }, [alert, orders, activity, uid, settings]);

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
        <button
          type="button"
          className="icon-btn only-mobile"
          style={{ marginLeft: 'auto' }}
          onClick={() => navigate('/settings')}
          aria-label="Nastavení"
        >
          <Icon name="settings" />
        </button>
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
          <div className="list-card notif__settings-card">
            <div className="list-row">
              <div className="notif__avatar">
                <Icon name="settings" size={20} />
              </div>
              <div className="list-row__body">
                <div className="list-row__title">Připomínky a domácnost</div>
                <div className="list-row__sub">
                  Čas připomínek, upozornění na telefonu, členové domácnosti a účet Rohlík najdete v Nastavení.
                </div>
              </div>
            </div>
            <button type="button" className="btn btn--soft btn--sm" onClick={() => navigate('/settings')}>
              Otevřít nastavení
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
