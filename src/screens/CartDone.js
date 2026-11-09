import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { Icon, Spinner } from '../components/ui';
import { dayInfo, plural } from '../lib/dates';
import './cart.css';

export const ROHLIK_URL = 'https://www.rohlik.cz/';

export default function CartDone() {
  const { horizon, statusOf, setOrderStatus, clearOrder } = useHousehold();
  const location = useLocation();
  const navigate = useNavigate();
  const st = location.state || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // After a refresh the navigation state is gone – fall back to days waiting in the cart.
  const days = useMemo(
    () => (st.days && st.days.length ? st.days : horizon.filter((k) => statusOf(k) === 'in_cart')),
    [st.days, horizon, statusOf]
  );
  const label = days.map((k) => dayInfo(k).shortLabel).join(', ');

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await setOrderStatus(days, 'ordered');
      navigate('/', { replace: true });
    } catch (e) {
      setBusy(false);
      setError('Nepodařilo se uložit. Zkontrolujte připojení.');
    }
  };

  /** The cart was emptied on Rohlík: put the days back to "Neobjednáno" (reminders stay on). */
  const cancel = async () => {
    if (!window.confirm('Vrátit tyto dny mezi neobjednané? Košík na Rohlíku tím neměníme.')) return;
    setBusy(true);
    setError('');
    try {
      await Promise.all(days.map((d) => clearOrder(d)));
      navigate('/cart', { replace: true });
    } catch (e) {
      setBusy(false);
      setError('Nepodařilo se uložit. Zkontrolujte připojení.');
    }
  };

  if (!days.length) {
    return (
      <div className="screen screen--fill done">
        <div className="done__icon">
          <Icon name="check" size={50} />
        </div>
        <h1 className="done__title">Hotovo</h1>
        <div className="done__text">Žádný košík nečeká na dokončení.</div>
        <div className="done__actions">
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--fill done">
      <div className="done__icon">
        <Icon name="shopping_cart_checkout" size={46} />
      </div>
      <h1 className="done__title">Košík je připravený</h1>
      <div className="done__text">
        {typeof st.added === 'number'
          ? `Do košíku na Rohlíku jsme vložili ${st.added} ${plural(st.added, 'položku', 'položky', 'položek')}`
          : 'Suroviny čekají v košíku na Rohlíku'}{' '}
        na {label}
        {st.cartTotalText ? ` (${st.cartTotalText})` : ''}.
        {st.failed > 0 && ` ${st.failed} ${plural(st.failed, 'položku', 'položky', 'položek')} se nepodařilo přidat.`}
      </div>
      <div className="done__note">
        Objednávku dokončete v aplikaci Rohlík – tam si vyberete i čas doručení. Pak ji tu označte jako
        dokončenou a připomínky pro tyto dny se vypnou.
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="done__actions">
        <a className="btn" href={ROHLIK_URL} target="_blank" rel="noopener noreferrer">
          <Icon name="open_in_new" size={20} />
          Otevřít Rohlík
        </a>
        <button type="button" className="btn btn--soft" onClick={finish} disabled={busy}>
          {busy ? <Spinner /> : (
            <>
              <Icon name="task_alt" size={20} />
              Objednávka je dokončená
            </>
          )}
        </button>
      </div>
      <button type="button" className="link-btn done__cancel" onClick={cancel} disabled={busy}>
        Košík jsem na Rohlíku zrušil – vrátit dny mezi neobjednané
      </button>
    </div>
  );
}
