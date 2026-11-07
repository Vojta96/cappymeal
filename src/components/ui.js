import React, { useEffect } from 'react';
import logo from '../Images/Cappy.png';

export function Icon({ name, size, fill, className = '', style }) {
  return (
    <span
      className={`ms${fill ? ' fill' : ''}${className ? ` ${className}` : ''}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export function Toggle({ on }) {
  return (
    <div className={`toggle${on ? ' toggle--on' : ''}`} aria-hidden="true">
      <span />
    </div>
  );
}

export function Spinner({ small }) {
  return <div className={`spinner${small ? ' spinner--sm' : ''}`} role="status" aria-label="Načítání" />;
}

export function Splash() {
  return (
    <div className="splash">
      <img src={logo} alt="CappyMeal" />
      <Spinner />
    </div>
  );
}

export function Toast({ text, onDone, ms = 2400 }) {
  useEffect(() => {
    if (!text) return undefined;
    const id = setTimeout(onDone, ms);
    return () => clearTimeout(id);
  }, [text, onDone, ms]);
  if (!text) return null;
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}
