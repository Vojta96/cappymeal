import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useBanner } from '../components/PushBanner';
import Thumb from '../components/Thumb';
import { Icon } from '../components/ui';
import logo from '../Images/Cappy.png';
import { cap, dayInfo } from '../lib/dates';
import { STATUS, mealCount, mealCountLabel, plannedSlots } from '../lib/meals';
import { readStorage, writeStorage } from '../lib/storage';
import './home.css';

export default function Home() {
  const { todayKey, horizon, plan, recipes, alert, statusOf } = useHousehold();
  const { showBanner } = useBanner();
  const navigate = useNavigate();
  const today = dayInfo(todayKey, todayKey);
  const todaySlots = plannedSlots(plan[todayKey], recipes);
  const next = horizon.slice(1, 4).map((k) => dayInfo(k, todayKey));
  const alertTitle = alert ? alert.title : '';
  const alertTo = alert && alert.allInCart ? '/cart/done' : '/cart';

  // In-app banner once per day when there is an alert.
  useEffect(() => {
    if (!alertTitle) return;
    const key = 'cappymeal-banner-day';
    if (readStorage('localStorage', key, '') === todayKey) return;
    const id = setTimeout(() => {
      writeStorage('localStorage', key, todayKey);
      showBanner({ title: alertTitle, text: 'Klepněte a zkontrolujte košík na Rohlíku.', to: alertTo });
    }, 600);
    return () => clearTimeout(id);
  }, [alertTitle, alertTo, todayKey, showBanner]);

  return (
    <div className="screen">
      <div className="row--between">
        <div className="row" style={{ gap: 10 }}>
          <img src={logo} alt="" width="34" height="34" />
          <span className="serif" style={{ fontSize: 26 }}>
            CappyMeal
          </span>
        </div>
        <button
          type="button"
          className="icon-btn"
          style={{ boxShadow: '0 1px 0 #EDE3D3' }}
          onClick={() => navigate('/notifications')}
          aria-label="Upozornění a nastavení"
        >
          <Icon name="notifications" size={23} />
          {alert && <span className="home__bell-dot" />}
        </button>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <div className="home__date">{today.long}</div>
        <h1 className="h-title">Co dnes vaříme</h1>
      </div>

      {alert && (
        <div className="alert-card">
          <div className="alert-card__head">
            <div className="alert-card__icon">
              <Icon name="schedule" size={21} />
            </div>
            <div className="stack" style={{ gap: 3 }}>
              <div className="alert-card__title">{alert.title}</div>
              <div className="alert-card__text">{alert.text}</div>
            </div>
          </div>
          <button type="button" className="btn btn--sm" onClick={() => navigate(alertTo)}>
            <Icon name="shopping_basket" size={20} />
            {alert.allInCart ? 'Dokončit objednávku' : 'Zkontrolovat košík'}
          </button>
        </div>
      )}

      {todaySlots.length > 0 ? (
        <div className="list-card" style={{ padding: '6px 16px' }}>
          {todaySlots.map((s) => {
            const rid = plan[todayKey][s.key];
            return (
              <Link key={s.key} to={`/recipes/${rid}`} className="list-row home__meal">
                <Thumb rid={rid} size={48} emojiSize={24} />
                <div className="list-row__body">
                  <div className="eyebrow">{s.label}</div>
                  <div className="list-row__title ellipsis">{recipes[rid].name}</div>
                </div>
                <Icon name="chevron_right" className="chevron" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-card" style={{ padding: '28px 24px' }}>
          <span style={{ fontSize: 40 }}>🍽️</span>
          <div className="empty-card__title">Na dnešek nic naplánováno</div>
          <div className="empty-card__text">Vyberte si z receptů a naplánujte dnešní jídla.</div>
          <button
            type="button"
            className="btn btn--soft btn--sm btn--auto"
            onClick={() => navigate('/plan', { state: { day: todayKey } })}
          >
            Naplánovat dnešek
          </button>
        </div>
      )}

      <div className="stack" style={{ gap: 12 }}>
        <div className="row--between" style={{ alignItems: 'baseline' }}>
          <h2 className="h-section">Další dny</h2>
          <Link to="/plan" className="link-btn" style={{ textDecoration: 'none' }}>
            Celý plán
          </Link>
        </div>
        <div className="home__days">
          {next.map((d) => {
            const st = STATUS[statusOf(d.key)];
            return (
              <button
                type="button"
                key={d.key}
                className="home__day"
                onClick={() => navigate('/plan', { state: { day: d.key } })}
              >
                <div className="stack" style={{ gap: 1 }}>
                  <div className="home__day-name">{cap(d.dl)}</div>
                  <div className="serif home__day-num">{d.num}.</div>
                </div>
                <div className="home__day-count">{mealCountLabel(mealCount(plan[d.key], recipes))}</div>
                <div className="home__day-status" style={{ color: st.fg }}>
                  <span className="dot" style={{ background: st.dot }} />
                  {st.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
