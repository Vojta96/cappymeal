import React, { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet';
import { Icon, Spinner } from './ui';
import { plural } from '../lib/dates';
import { formatKc } from '../lib/meals';
import { clearRohlikCart, getRohlikCart } from '../services/rohlik';
import './clearCartSheet.css';

const items = (n) => `${n} ${plural(n, 'položka', 'položky', 'položek')}`;
const itemsAcc = (n) => `${n} ${plural(n, 'položku', 'položky', 'položek')}`;
const sumOf = (list) => list.reduce((a, x) => a + (Number(x.price) || 0), 0);

/**
 * "Vysypat košík": confirmation listing what will be removed from the Rohlík cart.
 * cart: the loaded cart (checkout screen) or null (loaded here); addedIds: products CappyMeal put there in this
 * shopping; when the cart also holds other things the user picks "only ours" or "everything".
 * onCleared(result, mode) after the server emptied it.
 */
export default function ClearCartSheet({ open, onClose, cart: given, addedIds, days, onCleared }) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    setBusy('');
    if (given) return undefined;
    let alive = true;
    setLoaded(null);
    getRohlikCart()
      .then((r) => alive && setLoaded(r.cart))
      .catch((e) => alive && setError(e.message || 'Košík se nepodařilo načíst.'));
    return () => {
      alive = false;
    };
  }, [open, given]);

  const cart = given || loaded;
  const list = (cart && cart.items) || [];
  const added = new Set((addedIds || []).map(String));
  const ours = list.filter((x) => added.has(String(x.productId)));
  const foreign = list.length - ours.length;
  const split = ours.length > 0 && foreign > 0;

  const run = async (mode) => {
    setBusy(mode);
    setError('');
    try {
      const res = await clearRohlikCart({
        mode,
        productIds: mode === 'added' ? ours.map((x) => x.productId) : undefined,
        days,
      });
      onCleared(res || {}, mode);
    } catch (e) {
      setError(e.message || 'Košík se nepodařilo vysypat.');
      setBusy('');
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Vysypat košík na Rohlíku?"
      sub={cart ? `${items(list.length)} · ${cart.totalText || formatKc(sumOf(list))}` : 'Načítám košík…'}
    >
      <div className="stack clear-cart">
        {!cart && !error && (
          <div className="row" style={{ gap: 10 }}>
            <Spinner small />
            <span className="muted">Načítám košík…</span>
          </div>
        )}
        {cart && list.length === 0 && (
          <div className="clear-cart__text">
            Košík na Rohlíku už je prázdný. Dny tohoto nákupu můžete vrátit mezi neobjednané.
          </div>
        )}
        {list.length > 0 && (
          <>
            <div className="clear-cart__text">
              {split
                ? `V košíku je i ${itemsAcc(foreign)}, které tam byly už předtím. Můžete odebrat jen nákup z CappyMeal, nebo vysypat celý košík.`
                : 'Z košíku na Rohlíku se odebere všechno:'}
            </div>
            <ul className="clear-cart__list">
              {list.slice(0, 12).map((x) => (
                <li key={x.productId}>
                  <span className="ellipsis">
                    {x.quantity > 1 ? `${x.quantity}× ` : ''}
                    {x.name}
                  </span>
                  {split && !added.has(String(x.productId)) && <span className="clear-cart__tag">už v košíku</span>}
                  <span className="clear-cart__price">{x.priceText}</span>
                </li>
              ))}
              {list.length > 12 && <li className="muted">… a další {list.length - 12}</li>}
            </ul>
          </>
        )}
        {error && (
          <div className="clear-cart__error" role="alert">
            <Icon name="error" size={18} />
            {error}
          </div>
        )}
        {cart && (
          <div className="clear-cart__actions">
            {split && (
              <button type="button" className="btn btn--danger" onClick={() => run('added')} disabled={!!busy}>
                {busy === 'added' ? <Spinner small /> : <Icon name="remove_shopping_cart" />}
                Odebrat jen položky z CappyMeal ({ours.length})
              </button>
            )}
            <button
              type="button"
              className={split ? 'btn btn--ghost' : 'btn btn--danger'}
              onClick={() => run('all')}
              disabled={!!busy}
            >
              {busy === 'all' ? <Spinner small /> : <Icon name="delete_sweep" />}
              {split
                ? `Vysypat celý košík (${list.length})`
                : list.length
                  ? `Vysypat košík (${items(list.length)})`
                  : 'Vrátit dny mezi neobjednané'}
            </button>
            <button type="button" className="link-btn" onClick={onClose} disabled={!!busy}>
              Nechat košík, jak je
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
