// Settings card "Doručení z Rohlíku": household defaults used by the checkout (settings/delivery).
import React, { useEffect, useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { Icon, Spinner } from './ui';
import {
  COURIER_NOTE_MAX,
  DELIVERY_LEADS,
  DELIVERY_WINDOWS,
  PACKAGING_OPTIONS,
  deliveryPrefs,
} from '../lib/checkout';
import { getRohlikDeliveryOptions, needsReconnect } from '../services/rohlik';
import '../screens/checkout.css';

const ROHLIK_URL = 'https://www.rohlik.cz/';
const PAYMENTS = [
  ['CARD_ON_PLACE', 'Kartou při převzetí'],
  ['CASH', 'Hotově při převzetí'],
];

let cachedOptions = null; // per app session – addresses rarely change

export default function DeliverySettings({ onToast }) {
  const { settings, updateSettings } = useHousehold();
  const d = deliveryPrefs(settings);
  const [options, setOptions] = useState(cachedOptions);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(d.courierNote);
  useEffect(() => setNote(d.courierNote), [d.courierNote]);

  const save = (patch, ok) =>
    updateSettings(
      Object.fromEntries(Object.entries(patch).map(([k, v]) => [`delivery/${k}`, v === '' || v == null ? null : v]))
    )
      .then(() => ok && onToast && onToast(ok))
      .catch(() => onToast && onToast('Nepodařilo se uložit. Zkontrolujte připojení.'));

  const loadOptions = async () => {
    setLoading(true);
    try {
      const r = await getRohlikDeliveryOptions();
      cachedOptions = r;
      setOptions(r);
    } catch (e) {
      if (onToast) {
        onToast(needsReconnect(e) ? 'Účet Rohlík je potřeba připojit znovu.' : e.message || 'Rohlík teď neodpovídá.');
      }
    } finally {
      setLoading(false);
    }
  };

  const addresses = (options && options.addresses) || [];
  const offered = options && options.payments ? options.payments.map((p) => p.id) : null;
  const payments = PAYMENTS.filter(([id]) => !offered || offered.includes(id) || d.paymentId === id);

  return (
    <div className="list-card delivery-card">
      <div className="delivery-card__block">
        <div className="delivery-card__label">Výchozí adresa</div>
        {addresses.length > 0 ? (
          <div className="co-options" role="radiogroup" aria-label="Výchozí adresa">
            {addresses.map((a) => {
              const on = d.addressId === a.id;
              return (
                <button
                  type="button"
                  key={a.id}
                  role="radio"
                  aria-checked={on}
                  className={`co-option${on ? ' co-option--on' : ''}`}
                  onClick={() => save(on ? { addressId: null, addressLabel: null } : { addressId: a.id, addressLabel: a.label })}
                >
                  <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                  <span>{a.label}</span>
                  {!a.deliveredTo && <span className="co-option__hint">mimo oblast</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="delivery-card__row">
            <span className="delivery-card__value">{d.addressLabel || 'Podle účtu Rohlík'}</span>
            <button type="button" className="btn btn--sm btn--auto btn--soft" onClick={loadOptions} disabled={loading}>
              {loading ? <Spinner small /> : <Icon name="sync" size={18} />}
              Načíst adresy
            </button>
          </div>
        )}
        <a className="link-btn delivery-card__link" href={ROHLIK_URL} target="_blank" rel="noopener noreferrer">
          Upravit adresy na Rohlíku
        </a>
      </div>

      <div className="delivery-card__block">
        <div className="delivery-card__label" id="dlv-window">
          Preferovaný čas doručení
        </div>
        <div className="chips" role="radiogroup" aria-labelledby="dlv-window">
          {DELIVERY_WINDOWS.map(([v, label, sub]) => (
            <button
              type="button"
              key={v}
              role="radio"
              aria-checked={d.window === v}
              className={`chip${d.window === v ? ' chip--on' : ''}`}
              onClick={() => d.window !== v && save({ window: v })}
            >
              {label}
              {sub && <span className="cart__incart">{sub}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="delivery-card__block">
        <div className="delivery-card__label" id="dlv-lead">
          Kdy doručit
        </div>
        <div className="segment" role="radiogroup" aria-labelledby="dlv-lead">
          {DELIVERY_LEADS.map(([v, label]) => (
            <button
              type="button"
              key={v}
              role="radio"
              aria-checked={d.lead === v}
              className={d.lead === v ? 'on' : ''}
              onClick={() => d.lead !== v && save({ lead: v })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="push-box__hint">
          {d.lead === 'dayBefore'
            ? 'Připomínky přijdou o den dřív (4 dny předem a pak denně).'
            : 'Nákup dorazí v den vaření – připomínky 3 dny předem a pak denně.'}
        </div>
      </div>

      <div className="delivery-card__block">
        <div className="delivery-card__label">Výchozí platba</div>
        <div className="co-options" role="radiogroup" aria-label="Výchozí platba">
          {[...payments, ['', 'Vyberu až na Rohlíku (i online kartou)']].map(([id, label]) => {
            const on = d.paymentId === id;
            return (
              <button
                type="button"
                key={id || 'none'}
                role="radio"
                aria-checked={on}
                className={`co-option${on ? ' co-option--on' : ''}`}
                onClick={() => !on && save({ paymentId: id, paymentLabel: id ? label : null })}
              >
                <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="delivery-card__block">
        <div className="delivery-card__label" id="dlv-pack">
          Balení
        </div>
        <div className="segment delivery-card__seg" role="radiogroup" aria-labelledby="dlv-pack">
          {[...PACKAGING_OPTIONS, ['', 'Neměnit']].map(([v, label]) => (
            <button
              type="button"
              key={v || 'none'}
              role="radio"
              aria-checked={d.packaging === v}
              className={d.packaging === v ? 'on' : ''}
              onClick={() => d.packaging !== v && save({ packaging: v })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="delivery-card__block">
        <label className="delivery-card__label" htmlFor="dlv-note">
          Výchozí poznámka pro kurýra
        </label>
        <textarea
          id="dlv-note"
          className="input co-textarea"
          value={note}
          maxLength={COURIER_NOTE_MAX}
          rows={2}
          placeholder="Např. kód od vchodu, patro (nepovinné)"
          onChange={(e) => setNote(e.target.value)}
        />
        {note.trim() !== d.courierNote && (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn--sm btn--auto"
              onClick={() => save({ courierNote: note.trim().slice(0, COURIER_NOTE_MAX) }, 'Poznámka je uložená')}
            >
              Uložit poznámku
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
