import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { Icon, Spinner, Toast, Toggle } from '../components/ui';
import { enablePush, pushSupported } from '../services/push';
import { removeMember, rotateJoinCode, SEED_RECIPE_COUNT } from '../services/household';
import RohlikAccount from '../components/RohlikAccount';
import DeliverySettings from '../components/DeliverySettings';
import { capitalizeFirst, householdDisplayName, initial } from '../lib/text';
import { shopPrefs } from '../lib/shop';
import './notifications.css';
import './settings.css';

const REMINDERS = [
  ['remind3d', '3 dny předem', 'Když na den za 3 dny není objednáno'],
  ['remindDaily', 'Každý další den', 'Připomínat denně, dokud neobjednáte'],
  ['remindBoth', 'Oběma v domácnosti', 'Upozornění dostanete vy i partner(ka)'],
];

const SHOP_TOGGLES = [
  ['preferLight', 'Upřednostnit light / 0 % tuku', 'Nízkotučné varianty, skyr, odtučněné mléko…'],
  ['preferBio', 'Upřednostnit BIO', 'Produkty s označením BIO'],
];
const SHOP_SORT = [
  ['best', 'Nejlepší shoda'],
  ['unitPrice', 'Nejlevnější za kg'],
];

const PUSH_RESULT = {
  granted: 'Upozornění jsou zapnutá.',
  denied: 'Upozornění jsou v prohlížeči zakázaná. Povolte je v nastavení telefonu.',
  unsupported: 'Tento prohlížeč upozornění nepodporuje.',
  error: 'Upozornění se nepodařilo zapnout. Zkuste to znovu.',
};

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');
const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  window.navigator.standalone === true;

export default function Settings() {
  const navigate = useNavigate();
  const { logout, nickname } = useAuth();
  const { hid, uid, members, joinCode, name, settings, owner, isOwner, updateSettings, updateHouseholdName, replaceRecipesWithSeed, addMissingSeedRecipes, rohlik } =
    useHousehold();
  const [ownerBusy, setOwnerBusy] = useState(null); // 'code' | member uid
  const [nameDraft, setNameDraft] = useState(capitalizeFirst(name));
  useEffect(() => setNameDraft(capitalizeFirst(name)), [name]);
  const [supported, setSupported] = useState(null);
  const [pushState, setPushState] = useState(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'granted' : null,
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);

  useEffect(() => {
    let alive = true;
    pushSupported().then((ok) => alive && setSupported(ok));
    return () => {
      alive = false;
    };
  }, []);

  const turnOnPush = async () => {
    setPushBusy(true);
    const res = await enablePush(hid, uid);
    setPushBusy(false);
    setPushState(res);
    setToast(PUSH_RESULT[res] || PUSH_RESULT.error);
  };

  const shareCode = async () => {
    const text = `Připoj se k naší domácnosti v CappyMeal kódem ${joinCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CappyMeal', text });
        return;
      }
      await navigator.clipboard.writeText(joinCode);
      setToast('Kód zkopírován');
    } catch (e) {
      // share dismissed
    }
  };

  const iosNeedsInstall = isIOS() && !isStandalone();

  const newCode = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Vygenerovat nový kód? Starý kód přestane platit.')) return;
    setOwnerBusy('code');
    try {
      await rotateJoinCode();
      setToast('Nový kód je připravený');
    } catch (e) {
      setToast(e.message || 'Kód se nepodařilo změnit');
    } finally {
      setOwnerBusy(null);
    }
  };

  const kick = async (mid, nick) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Odebrat ${capitalizeFirst(nick)} z domácnosti? Kód pro připojení se zároveň změní.`)) return;
    setOwnerBusy(mid);
    try {
      await removeMember(mid);
      setToast('Člen byl odebrán');
    } catch (e) {
      setToast(e.message || 'Člena se nepodařilo odebrat');
    } finally {
      setOwnerBusy(null);
    }
  };

  const [seedBusy, setSeedBusy] = useState(false);
  const addMissingRecipes = async () => {
    setSeedBusy(true);
    try {
      const n = await addMissingSeedRecipes();
      setToast(n ? `Doplněno receptů: ${n}` : 'Všechny výchozí recepty už máte');
    } catch (e) {
      setToast('Recepty se nepodařilo doplnit');
    } finally {
      setSeedBusy(false);
    }
  };

  const replaceRecipes = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Nahradit všechny recepty novou výchozí sadou? Stávající recepty včetně fotek se smažou a z plánu zmizí odstraněná jídla.')) return;
    setOwnerBusy('recipes');
    try {
      await replaceRecipesWithSeed();
      setToast('Recepty byly nahrazeny novou sadou');
    } catch (e) {
      setToast('Recepty se nepodařilo nahradit');
    } finally {
      setOwnerBusy(null);
    }
  };

  const saveName = async () => {
    const next = capitalizeFirst(nameDraft);
    if (!next) {
      setNameDraft(capitalizeFirst(name));
      setToast('Název domácnosti nemůže být prázdný');
      return;
    }
    if (next === name) {
      setNameDraft(next);
      return;
    }
    try {
      await updateHouseholdName(next);
      setToast('Název domácnosti uložen');
    } catch (e) {
      setToast('Název se nepodařilo uložit');
    }
  };

  const shop = shopPrefs(settings);
  const saveShop = (patch) => {
    const updates = {};
    Object.entries(patch).forEach(([k, val]) => {
      updates[`shop/${k}`] = val;
    });
    Promise.resolve(updateSettings(updates)).catch(() => setToast('Nastavení se nepodařilo uložit'));
  };

  const memberList = Object.entries(members || {}).sort(
    ([, a], [, b]) => ((a && a.joinedAt) || 0) - ((b && b.joinedAt) || 0),
  );

  return (
    <div className="screen settings" style={{ gap: 20 }}>
      <div className="row" style={{ gap: 12 }}>
        <button type="button" className="icon-btn only-mobile" onClick={() => navigate(-1)} aria-label="Zpět">
          <Icon name="arrow_back" />
        </button>
        <h1 className="h-title notif__h1">Nastavení</h1>
      </div>

      <div className="settings-grid">
        <section className="settings-col">
          <div className="stack">
            <h2 className="h-section">Domácnost</h2>
            <div className="list-card">
              {isOwner ? (
                <label className="list-row notif__name-row">
                  <div className="list-row__body">
                    <div className="list-row__sub">Název domácnosti</div>
                    <input
                      className="notif__name-input"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={saveName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      placeholder="např. Procházkovi"
                      maxLength={40}
                    />
                  </div>
                  <Icon name="edit" size={19} className="notif__name-icon" />
                </label>
              ) : (
                <div className="list-row">
                  <div className="list-row__body">
                    <div className="list-row__sub">Název domácnosti</div>
                    <div className="list-row__title">{householdDisplayName(name)}</div>
                  </div>
                </div>
              )}
              <div className="list-row">
                <div className="list-row__body">
                  <div className="list-row__sub">Kód pro připojení</div>
                  <div className="notif__code">{joinCode || '—'}</div>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    onClick={newCode}
                    disabled={!!ownerBusy}
                    aria-label="Vygenerovat nový kód"
                    title="Vygenerovat nový kód"
                  >
                    {ownerBusy === 'code' ? <Spinner small /> : <Icon name="autorenew" size={20} />}
                  </button>
                )}
                {joinCode && (
                  <button type="button" className="icon-btn icon-btn--sm" onClick={shareCode} aria-label="Sdílet kód">
                    <Icon name="ios_share" size={20} />
                  </button>
                )}
              </div>
              {memberList.map(([mid, m]) => (
                <div key={mid} className="list-row">
                  <div className="notif__avatar">{initial(m.nickname)}</div>
                  <div className="list-row__body">
                    <div className="list-row__title">
                      {capitalizeFirst(m.nickname)}
                      {mid === uid ? ' (vy)' : ''}
                    </div>
                    {(m.joinedAt || mid === owner) && (
                      <div className="list-row__sub">
                        {mid === owner ? 'Zakladatel(ka)' : ''}
                        {mid === owner && m.joinedAt ? ' · ' : ''}
                        {m.joinedAt ? `Členem od ${new Date(m.joinedAt).toLocaleDateString('cs-CZ')}` : ''}
                      </div>
                    )}
                  </div>
                  {isOwner && mid !== uid && mid !== owner && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      onClick={() => kick(mid, m.nickname)}
                      disabled={!!ownerBusy}
                      aria-label={`Odebrat ${capitalizeFirst(m.nickname)}`}
                      title="Odebrat z domácnosti"
                    >
                      {ownerBusy === mid ? <Spinner small /> : <Icon name="person_remove" size={20} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {memberList.length < 2 && (
              <div className="push-box__hint" style={{ padding: '0 4px' }}>
                Partner(ka) se připojí tak, že se zaregistruje a na úvodní obrazovce zadá tento kód.
              </div>
            )}
          </div>

          <div className="stack">
            <h2 className="h-section">Recepty</h2>
            <div className="list-card">
              <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                <div className="list-row__sub">
                  Přidat výchozí recepty, které v domácnosti ještě chybí (podle názvu). Stávající recepty zůstanou beze změny.
                </div>
                <button type="button" className="btn btn--soft btn--sm" onClick={addMissingRecipes} disabled={seedBusy || !!ownerBusy}>
                  {seedBusy ? <Spinner small /> : 'Doplnit chybějící výchozí recepty'}
                </button>
              </div>
              {isOwner && (
                <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                  <div className="list-row__sub">
                    Nahradit všechny recepty v domácnosti novou výchozí sadou ({SEED_RECIPE_COUNT} receptů). Smažou se i
                    jejich fotky a z plánu zmizí odstraněná jídla.
                  </div>
                  <button type="button" className="btn btn--soft btn--sm" onClick={replaceRecipes} disabled={!!ownerBusy || seedBusy}>
                    {ownerBusy === 'recipes' ? <Spinner small /> : 'Nahradit recepty novou sadou'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="stack">
            <h2 className="h-section">Účet Rohlík</h2>
            <RohlikAccount onToast={setToast} />
          </div>

          <div className="stack">
            <h2 className="h-section">Nákup na Rohlíku</h2>
            <div className="list-card">
              {SHOP_TOGGLES.map(([k, label, sub]) => (
                <button
                  type="button"
                  key={k}
                  className="list-row"
                  role="switch"
                  aria-checked={shop[k]}
                  onClick={() => saveShop({ [k]: !shop[k] })}
                >
                  <div className="list-row__body">
                    <div className="list-row__title">{label}</div>
                    <div className="list-row__sub">{sub}</div>
                  </div>
                  <Toggle on={shop[k]} />
                </button>
              ))}
              <div className="list-row shop-sort">
                <div className="list-row__title" id="shop-sort-label">
                  Řadit podle
                </div>
                <div className="segment" role="radiogroup" aria-labelledby="shop-sort-label">
                  {SHOP_SORT.map(([v, label]) => (
                    <button
                      type="button"
                      key={v}
                      role="radio"
                      aria-checked={shop.sort === v}
                      className={shop.sort === v ? 'on' : ''}
                      onClick={() => shop.sort !== v && saveShop({ sort: v })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="push-box__hint" style={{ padding: '0 4px' }}>
              Platí pro celou domácnost. Produkty, které jste už jednou vybrali, nabídneme příště jako první.
            </div>
          </div>

          {rohlik && rohlik.connected && (
            <div className="stack">
              <h2 className="h-section">Doručení z Rohlíku</h2>
              <DeliverySettings onToast={setToast} />
              <div className="push-box__hint" style={{ padding: '0 4px' }}>
                Při objednávce předvyplníme adresu, platbu, balení a poznámku a doporučíme termín v preferovaném čase.
              </div>
            </div>
          )}
        </section>

        <section className="settings-col">
          <div className="stack">
            <h2 className="h-section">Připomínky</h2>
            <div className="list-card">
              {REMINDERS.map(([k, label, sub]) => (
                <button
                  type="button"
                  key={k}
                  className="list-row"
                  role="switch"
                  aria-checked={!!settings[k]}
                  onClick={() => updateSettings({ [k]: !settings[k] })}
                >
                  <div className="list-row__body">
                    <div className="list-row__title">{label}</div>
                    <div className="list-row__sub">{sub}</div>
                  </div>
                  <Toggle on={!!settings[k]} />
                </button>
              ))}
              <div className="list-row" style={{ justifyContent: 'space-between' }}>
                <div className="list-row__title">Čas připomínky</div>
                <select
                  className="notif__select"
                  value={settings.remindHour}
                  onChange={(e) => updateSettings({ remindHour: Number(e.target.value) })}
                  aria-label="Čas připomínky"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="push-box">
              <button
                type="button"
                className={`btn btn--sm${pushState === 'granted' ? ' btn--soft' : ''}`}
                onClick={turnOnPush}
                disabled={pushBusy || supported === false}
              >
                {pushBusy ? (
                  <Spinner small />
                ) : (
                  <>
                    <Icon name={pushState === 'granted' ? 'notifications_active' : 'phone_iphone'} size={20} />
                    {pushState === 'granted' ? 'Upozornění na telefonu jsou zapnutá' : 'Zapnout upozornění na telefonu'}
                  </>
                )}
              </button>
              <div className="push-box__hint">
                {supported === false && !iosNeedsInstall ? 'Tento prohlížeč upozornění nepodporuje. ' : ''}
                Na iPhonu nejdřív přidejte CappyMeal na plochu (Sdílet → Přidat na plochu), otevřete ji z plochy a
                teprve pak upozornění zapněte. Zapněte je na obou telefonech.
              </div>
            </div>
          </div>

          <div className="stack">
            <h2 className="h-section">Účet</h2>
            <div className="list-card">
              <div className="list-row">
                <div className="notif__avatar">{initial(nickname)}</div>
                <div className="list-row__body">
                  <div className="list-row__sub">Přihlášen(a) jako</div>
                  <div className="list-row__title">{nickname}</div>
                </div>
                <button type="button" className="btn btn--ghost btn--sm btn--auto" onClick={logout}>
                  <Icon name="logout" size={20} />
                  Odhlásit se
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Toast text={toast} onDone={clearToast} />
    </div>
  );
}
