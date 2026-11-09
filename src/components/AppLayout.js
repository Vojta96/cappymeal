import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import PushBanner, { useBanner } from './PushBanner';
import { Icon, Splash } from './ui';
import { onForegroundMessage } from '../services/push';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { householdDisplayName, initial } from '../lib/text';
import { plural } from '../lib/dates';
import logo from '../Images/Cappy.png';

const TABS = [
  { to: '/', label: 'Přehled', icon: 'home', match: (p) => p === '/' || p.startsWith('/notifications') || p.startsWith('/settings') },
  { to: '/plan', label: 'Plán', icon: 'calendar_month', match: (p) => p.startsWith('/plan') },
  { to: '/recipes', label: 'Recepty', icon: 'menu_book', match: (p) => p.startsWith('/recipes') },
  { to: '/cart', label: 'Nákup', icon: 'shopping_basket', match: (p) => p.startsWith('/cart') },
];

// Screens without the tab bar (design: login, recipe detail, edit).
const NO_TABS = [/^\/recipes\/[^/]+/];

function TabBar({ badge }) {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Hlavní navigace">
      {TABS.map((t) => {
        const on = t.match(pathname);
        return (
          <NavLink key={t.to} to={t.to} className={`tab${on ? ' tab--on' : ''}`} end={t.to === '/'}>
            <Icon name={t.icon} fill={on} />
            <span className="tab__label">{t.label}</span>
            {t.to === '/cart' && badge > 0 && <span className="tab__badge">{badge}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

// Desktop sidebar (design2): same targets as the tab bar plus Upozornění.
const NAV = [
  { to: '/', label: 'Přehled', icon: 'home', match: (p) => p === '/' || p.startsWith('/cart/done') },
  { to: '/plan', label: 'Plán', icon: 'calendar_month', match: (p) => p.startsWith('/plan') },
  { to: '/recipes', label: 'Recepty', icon: 'menu_book', match: (p) => p.startsWith('/recipes') },
  { to: '/cart', label: 'Nákup', icon: 'shopping_basket', match: (p) => p === '/cart' },
  { to: '/notifications', label: 'Upozornění', icon: 'notifications', match: (p) => p.startsWith('/notifications') },
];
const AVATAR_COLORS = ['#C49A6C', '#8FA87A'];

export function Sidebar() {
  const { pathname } = useLocation();
  const { pendingDays, alert, members, name } = useHousehold();
  const list = Object.values(members || {}).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const badges = { '/cart': pendingDays.length || 0, '/notifications': alert ? 1 : 0 };
  return (
    <aside className="sidebar" aria-label="Hlavní navigace">
      <NavLink to="/" className="sidebar__brand">
        <img src={logo} alt="" width="36" height="36" />
        <span className="serif" style={{ fontSize: 27 }}>
          CappyMeal
        </span>
      </NavLink>
      <nav className="sidebar__nav">
        {NAV.map((n) => {
          const on = n.match(pathname);
          return (
            <NavLink key={n.to} to={n.to} end className={`sidebar__item${on ? ' sidebar__item--on' : ''}`}>
              <Icon name={n.icon} fill={on} />
              <span className="sidebar__label">{n.label}</span>
              {badges[n.to] > 0 && <span className="sidebar__badge">{badges[n.to]}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar__foot">
        <NavLink
          to="/settings"
          className={`sidebar__household${pathname.startsWith('/settings') ? ' sidebar__household--on' : ''}`}
          aria-label="Nastavení domácnosti"
          title="Nastavení"
        >
          <div className="sidebar__avatars">
            {list.map((m, i) => (
              <span
                key={`${m.nickname}-${m.joinedAt}`}
                className="sidebar__avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                title={m.nickname}
              >
                {initial(m.nickname)}
              </span>
            ))}
          </div>
          <div className="stack" style={{ gap: 0, minWidth: 0 }}>
            <span className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>
              {householdDisplayName(name)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>
              {list.length} {plural(list.length, 'člen', 'členové', 'členů')}
            </span>
          </div>
          <Icon name="settings" className="sidebar__household-icon" />
        </NavLink>
      </div>
    </aside>
  );
}

export default function AppLayout() {
  const { ready, pendingDays } = useHousehold();
  const isDesktop = useIsDesktop();
  const { pathname } = useLocation();
  const { showBanner } = useBanner();
  const showTabs = !NO_TABS.some((re) => re.test(pathname));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Foreground FCM messages -> in-app banner.
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub =
        onForegroundMessage((payload) => {
          const n = (payload && payload.notification) || {};
          const d = (payload && payload.data) || {};
          showBanner({
            title: n.title || d.title || 'CappyMeal',
            text: n.body || d.body || '',
            to: d.url || d.link || '/cart',
          });
        }) || (() => {});
    } catch (e) {
      // push not available
    }
    return () => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    };
  }, [showBanner]);

  if (!ready) return <Splash />;

  return (
    <div className={`app${showTabs ? ' app--tabs' : ''}`}>
      {isDesktop && <Sidebar />}
      <div className="app__main">
        <Outlet />
      </div>
      {showTabs && !isDesktop && <TabBar badge={pendingDays.length} />}
      <PushBanner />
    </div>
  );
}
