import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useBanner } from '../components/PushBanner';
import Thumb from '../components/Thumb';
import { Icon } from '../components/ui';
import logo from '../Images/Cappy.png';
import { DAY_SHORT, cap, dayInfo, parseKey } from '../lib/dates';
import { SLOTS, STATUS, mealCount, mealCountLabel } from '../lib/meals';
import { readStorage, writeStorage } from '../lib/storage';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { syncRohlikOrders } from '../services/rohlik';
import { deliveryWhen, hasPendingDelivery, upcomingDeliveries } from '../lib/deliveries';
import './home.css';

export default function Home() {
  const {
    todayKey,
    horizon,
    plan,
    memberPlan,
    memberIds,
    memberName,
    slotMeals,
    recipes,
    alert,
    statusOf,
    rohlik,
    deliveries,
  } = useHousehold();
  const { showBanner } = useBanner();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const today = dayInfo(todayKey, todayKey);
  // One entry per recipe eaten today (shared meal + members' own meals).
  const multi = memberIds.length > 1;
  const todaySlots = SLOTS.flatMap((s) =>
    slotMeals(todayKey, s.key).map((e) => ({
      ...s,
      rid: e.rid,
      id: `${s.key}:${e.rid}`,
      who: !multi ? '' : e.shared ? (e.uids.length < memberIds.length ? 'ostatní' : '') : e.uids.map(memberName).join(', '),
    }))
  );
  const countOf = (k) => mealCount(plan[k], recipes, memberPlan[k], memberIds);
  const next = horizon.slice(1, 4).map((k) => dayInfo(k, todayKey));
  const alertTitle = alert ? alert.title : '';
  const alertTo = alert && alert.allInCart ? '/cart/checkout' : '/cart';

  // Days waiting in the Rohlík cart: detect a placed order / emptied cart; a delivery that is not over yet:
  // refresh its window / state (throttled, best effort).
  const hasInCart = horizon.some((k) => statusOf(k) === 'in_cart');
  const pendingDelivery = hasPendingDelivery(deliveries);
  const connected = !!(rohlik && rohlik.connected);
  useEffect(() => {
    if (!connected || (!hasInCart && !pendingDelivery)) return;
    syncRohlikOrders().catch(() => {});
  }, [connected, hasInCart, pendingDelivery]);
  // Re-evaluated on every render (todayKey changes at midnight / on focus), so "dnes" / "zítra" stay right.
  const delivery = upcomingDeliveries(deliveries)[0] || null;

  // In-app banner once per day when there is an alert.
  useEffect(() => {
    if (!alertTitle) return;
    const key = 'cappymeal-banner-day';
    if (readStorage('localStorage', key, '') === todayKey) return;
    const id = setTimeout(() => {
      writeStorage('localStorage', key, todayKey);
      showBanner({
        title: alertTitle,
        text: `${isDesktop ? 'Klikněte' : 'Klepněte'} a zkontrolujte košík na Rohlíku.`,
        to: alertTo,
      });
    }, 600);
    return () => clearTimeout(id);
  }, [alertTitle, alertTo, todayKey, showBanner, isDesktop]);

  const alertCard = alert && (
    <div className="alert-card">
      <div className="alert-card__head">
        <div className="alert-card__icon">
          <Icon name="schedule" size={isDesktop ? 24 : 21} />
        </div>
        <div className="stack" style={{ gap: 3, minWidth: 0 }}>
          <div className="alert-card__title">{alert.title}</div>
          <div className="alert-card__text">{alert.text}</div>
        </div>
      </div>
      <button type="button" className="btn btn--sm" onClick={() => navigate(alertTo)}>
        <Icon name="shopping_basket" size={20} />
        {alert.allInCart ? 'Dokončit objednávku' : 'Zkontrolovat košík'}
      </button>
    </div>
  );

  const deliveryDays = delivery ? [...new Set(delivery.days || [])].sort().map((k) => DAY_SHORT[parseKey(k).getDay()]) : [];
  const deliveryFor =
    deliveryDays.length > 1
      ? `${deliveryDays.slice(0, -1).join(', ')} a ${deliveryDays[deliveryDays.length - 1]}`
      : deliveryDays[0] || '';
  const deliveryCard = delivery && (
    <div className="alert-card alert-card--delivery" data-testid="delivery-card">
      <div className="alert-card__head">
        <div className="alert-card__icon">
          <Icon name="local_shipping" size={isDesktop ? 24 : 21} />
        </div>
        <div className="stack" style={{ gap: 3, minWidth: 0 }}>
          <div className="alert-card__title">Doručení {deliveryWhen(delivery)}</div>
          <div className="alert-card__text">
            {deliveryFor ? `Rohlík přiveze nákup na ${deliveryFor}.` : 'Rohlík přiveze objednaný nákup.'}
          </div>
        </div>
      </div>
    </div>
  );

  const emptyToday = (
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
  );

  if (isDesktop) {
    return (
      <div className="screen">
        <div className="row--between" style={{ alignItems: 'flex-end', gap: 24 }}>
          <div className="stack" style={{ gap: 6 }}>
            <div className="home__date" style={{ fontSize: 15 }}>
              {today.long}
            </div>
            <h1 className="h-title">Co dnes vaříme</h1>
          </div>
          <button type="button" className="btn btn--outline-d" onClick={() => navigate('/plan')}>
            <Icon name="calendar_month" size={20} />
            Otevřít plán
          </button>
        </div>

        {alertCard}
        {deliveryCard}

        <div className="home__cols">
          <div className="stack" style={{ gap: 12 }}>
            <h2 className="h-section">Dnes</h2>
            {todaySlots.length > 0 ? (
              <div className="home__today-grid">
                {todaySlots.map((s) => {
                  const { rid } = s;
                  return (
                    <Link key={s.id} to={`/recipes/${rid}`} className="home__meal-card">
                      <Thumb rid={rid} radius={0} emojiSize={58} className="home__meal-img" />
                      <div className="stack" style={{ gap: 3, padding: '14px 16px 16px' }}>
                        <div className="eyebrow">{s.who ? `${s.label} · ${s.who}` : s.label}</div>
                        <div className="home__meal-name">{recipes[rid].name}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              emptyToday
            )}
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <h2 className="h-section">Další dny</h2>
            {next.map((d) => {
              const st = STATUS[statusOf(d.key)];
              return (
                <button
                  type="button"
                  key={d.key}
                  className="home__day-row"
                  onClick={() => navigate('/plan', { state: { day: d.key } })}
                >
                  <div className="home__day-row-date">
                    <div className="home__day-name" style={{ fontSize: 12, fontWeight: 700 }}>
                      {cap(d.dl)}
                    </div>
                    <div className="serif" style={{ fontSize: 34, lineHeight: 1 }}>
                      {d.num}.
                    </div>
                  </div>
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--muted)' }}>
                    {mealCountLabel(countOf(d.key))}
                  </div>
                  <div className="home__day-status" style={{ color: st.fg, fontSize: 12.5 }}>
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

  return (
    <div className="screen">
      <div className="row--between">
        <div className="row" style={{ gap: 10 }}>
          <img src={logo} alt="" width="34" height="34" />
          <span className="serif" style={{ fontSize: 26 }}>
            CappyMeal
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="icon-btn"
            style={{ boxShadow: '0 1px 0 #EDE3D3' }}
            onClick={() => navigate('/settings')}
            aria-label="Nastavení domácnosti"
          >
            <Icon name="settings" size={23} />
          </button>
          <button
            type="button"
            className="icon-btn"
            style={{ boxShadow: '0 1px 0 #EDE3D3' }}
            onClick={() => navigate('/notifications')}
            aria-label="Upozornění"
          >
            <Icon name="notifications" size={23} />
            {alert && <span className="home__bell-dot" />}
          </button>
        </div>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <div className="home__date">{today.long}</div>
        <h1 className="h-title">Co dnes vaříme</h1>
      </div>

      {alertCard}
      {deliveryCard}

      {todaySlots.length > 0 ? (
        <div className="list-card" style={{ padding: '6px 16px' }}>
          {todaySlots.map((s) => {
            const { rid } = s;
            return (
              <Link key={s.id} to={`/recipes/${rid}`} className="list-row home__meal">
                <Thumb rid={rid} size={48} emojiSize={24} />
                <div className="list-row__body">
                  <div className="eyebrow">{s.who ? `${s.label} · ${s.who}` : s.label}</div>
                  <div className="list-row__title ellipsis">{recipes[rid].name}</div>
                </div>
                <Icon name="chevron_right" className="chevron" />
              </Link>
            );
          })}
        </div>
      ) : (
        emptyToday
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
                <div className="home__day-count">{mealCountLabel(countOf(d.key))}</div>
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
