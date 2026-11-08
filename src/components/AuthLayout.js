import React from 'react';
import logo from '../Images/Cappy.png';

/**
 * Login / registration / household onboarding frame.
 * Phone: single centered column. Desktop (>= 1024px, CSS only): split layout with a wheat brand panel.
 */
export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="auth">
      <aside className="auth__panel only-desktop">
        <div className="row" style={{ gap: 12 }}>
          <img src={logo} alt="" width="40" height="40" />
          <span className="serif" style={{ fontSize: 28 }}>
            CappyMeal
          </span>
        </div>
        <div className="auth__panel-mid">
          <img src={logo} alt="CappyMeal" width="120" height="120" />
          <div className="auth__headline">Plánujte spolu, nakupte jedním klikem</div>
          <div className="auth__panel-sub">Společný jídelníček a nákup přes Rohlík pro vaši domácnost.</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>© CappyMeal</div>
      </aside>
      <div className="auth__main">
        <div className={`auth__inner${wide ? ' auth__inner--wide' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
