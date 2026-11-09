import React, { useEffect } from 'react';
import { Icon } from './ui';

export default function BottomSheet({ open, onClose, title, sub, head, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className={`sheet${wide ? ' sheet--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__grip">
          <span />
        </div>
        <div className="sheet__head">
          <div className="row--between">
            <div className="stack" style={{ gap: 2, minWidth: 0 }}>
              <div className="sheet__title">{title}</div>
              {sub && <div className="sheet__sub">{sub}</div>}
            </div>
            <button type="button" className="sheet__close" onClick={onClose} aria-label="Zavřít">
              <Icon name="close" />
            </button>
          </div>
          {head}
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
