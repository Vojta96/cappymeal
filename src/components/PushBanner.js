import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../Images/Cappy.png';
import { Icon } from './ui';

const BannerContext = createContext({ showBanner: () => {}, hideBanner: () => {} });

export function BannerProvider({ children }) {
  const [banner, setBanner] = useState(null); // { title, text, to }
  const showBanner = useCallback((b) => setBanner({ ...b, id: Date.now() }), []);
  const hideBanner = useCallback(() => setBanner(null), []);
  const value = useMemo(() => ({ banner, showBanner, hideBanner }), [banner, showBanner, hideBanner]);
  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
}

export const useBanner = () => useContext(BannerContext);

/** iOS-like in-app notification banner (design "showPush"). */
export default function PushBanner() {
  const { banner, hideBanner } = useBanner();
  const navigate = useNavigate();

  useEffect(() => {
    if (!banner) return undefined;
    const id = setTimeout(hideBanner, 9000);
    return () => clearTimeout(id);
  }, [banner, hideBanner]);

  if (!banner) return null;
  const open = () => {
    hideBanner();
    if (banner.to) navigate(banner.to);
  };
  return (
    <div className="banner" key={banner.id}>
      <div
        className="banner__inner"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter') open();
        }}
      >
        <div className="banner__logo">
          <img src={logo} alt="" />
        </div>
        <div className="banner__body">
          <div className="banner__meta">
            <span>CAPPYMEAL</span>
            <span>nyní</span>
          </div>
          <div className="banner__title">{banner.title}</div>
          {banner.text && <div className="banner__text">{banner.text}</div>}
        </div>
        <button
          type="button"
          className="banner__close"
          aria-label="Zavřít"
          onClick={(e) => {
            e.stopPropagation();
            hideBanner();
          }}
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
