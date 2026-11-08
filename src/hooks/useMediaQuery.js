import { useEffect, useState } from 'react';

export const DESKTOP_QUERY = '(min-width: 1024px)';

function matches(query) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

export function useMediaQuery(query) {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setValue(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, [query]);
  return value;
}

/** true at >= 1024px – desktop layout (sidebar, modals, multi-column screens). */
export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
