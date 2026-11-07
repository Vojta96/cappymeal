import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import PushBanner, { useBanner } from './PushBanner';
import { Icon, Splash } from './ui';
import { onForegroundMessage } from '../services/push';

const TABS = [
  { to: '/', label: 'Přehled', icon: 'home', match: (p) => p === '/' || p.startsWith('/notifications') },
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

export default function AppLayout() {
  const { ready, pendingDays } = useHousehold();
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
      <Outlet />
      {showTabs && <TabBar badge={pendingDays.length} />}
      <PushBanner />
    </div>
  );
}
