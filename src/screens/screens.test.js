// Smoke tests: every screen renders with a fake household (no real Firebase).
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HouseholdContext } from '../context/HouseholdContext';
import { BannerProvider } from '../components/PushBanner';
import { addDays, dateKey, horizonKeys } from '../lib/dates';
import { buildAlert, dayStatus } from '../lib/meals';
import { slotEntries } from '../lib/planModel';
import Home from './Home';
import Plan from './Plan';
import Recipes from './Recipes';
import RecipeDetail from './RecipeDetail';
import RecipeEdit from './RecipeEdit';
import Cart from './Cart';
import CartCheckout from './CartCheckout';
import Notifications from './Notifications';
import Settings from './Settings';
import Login from './Login';
import AppLayout from '../components/AppLayout';

jest.mock('../firebase', () => ({ app: {}, db: {}, auth: {} }));
jest.mock('firebase/database', () => ({}));
jest.mock('firebase/auth', () => ({}));
jest.mock('firebase/functions', () => ({}));
const mockUnits = ['500 g', '100 g', '1 kg'];
const mockCandidates = [1, 2, 3].map((n) => ({
  productId: String(n),
  name: `Špagety varianta ${n}`,
  price: 30 + n,
  priceText: `${30 + n} Kč`,
  unit: mockUnits[n - 1],
  imageUrl: null,
}));
const mockCalls = [];
jest.mock('../services/rohlik', () => ({
  getRohlikStatus: () => Promise.resolve({ connected: true, toolCount: 0 }),
  startRohlikOAuth: () =>
    Promise.resolve({
      authUrl: 'https://identity.rohlik.cz/oauth2/authorize?x=1',
      redirectUri: 'http://127.0.0.1:8976/rohlik-callback',
    }),
  finishRohlikOAuth: () => Promise.resolve({ connected: true, emailMasked: 'v***@gmail.com' }),
  disconnectRohlik: () => Promise.resolve({ connected: false }),
  needsReconnect: () => false,
  matchProducts: (items, prefs) => {
    mockCalls.push({ items, prefs });
    return Promise.resolve({
      results: items.map((it) => ({
        key: it.key,
        query: it.query || it.name,
        candidates: mockCandidates,
        preferred: it.preferredProductId
          ? mockCandidates.some((c) => c.productId === it.preferredProductId)
            ? 'found'
            : 'missing'
          : null,
      })),
    });
  },
  fillCart: () => Promise.resolve({ ok: true, added: 0, failed: [] }),
  getRohlikCart: () => Promise.resolve({ cart: mockCart }),
  getRohlikCheckout: (opts) => {
    mockCheckoutCalls.push(['load', opts]);
    return Promise.resolve({ checkout: mockCheckout, applied: [] });
  },
  getRohlikTimeslots: (day) => {
    mockCheckoutCalls.push(['slots', day]);
    return Promise.resolve({ day, slots: mockSlots });
  },
  updateRohlikCheckout: (action, payload) => {
    mockCheckoutCalls.push([action, payload]);
    return Promise.resolve({ checkout: mockCheckout });
  },
  getRohlikCheckoutLink: () => Promise.resolve({ url: 'https://www.rohlik.cz/pokladna' }),
  getRohlikDeliveryOptions: () =>
    Promise.resolve({
      addresses: [{ id: 55, label: 'Hlavní 1, Brno', deliveredTo: true }, { id: 56, label: 'Dlouhá 5, Praha 1', deliveredTo: true }],
      payments: [{ id: 'CARD', label: 'Kartou online', settable: false }, { id: 'CARD_ON_PLACE', label: 'Kartou při převzetí', settable: true }],
      packaging: [],
    }),
  syncRohlikOrders: () => Promise.resolve(mockSync.next),
}));
const mockCheckoutCalls = [];
const mockSync = { next: { result: 'none', days: [] } };
const mockCart = {
  items: [
    { productId: '709025', name: 'Mléko polotučné 1 l', quantity: 2, unit: '1 l', price: 49.8, priceText: '49,80 Kč', unitPriceText: '24,90 Kč', maxQuantity: 30, imageUrl: null },
    { productId: '1', name: 'Špagety varianta 1', quantity: 1, unit: '500 g', price: 31, priceText: '31 Kč', maxQuantity: 50, imageUrl: null },
  ],
  count: 2,
  total: 80.8,
  totalText: '80,80 Kč',
  minOrder: 749,
  minOrderText: '749 Kč',
  minOrderOk: false,
};
const mockCheckout = {
  addresses: [
    { id: 55, label: 'Hlavní 1, Brno', deliveredTo: true, selected: true },
    { id: 56, label: 'Dlouhá 5, Praha 1', deliveredTo: true, selected: false },
  ],
  address: { id: 55, label: 'Hlavní 1, Brno', valid: true },
  deliveryType: { selected: 'HOME', options: [] },
  slot: { id: null, text: '', type: '', valid: false },
  payment: {
    selected: 'CARD',
    methods: [
      { id: 'CARD', label: 'Kartou online', settable: false, selected: true },
      { id: 'CARD_ON_PLACE', label: 'Kartou při převzetí', settable: true, selected: false },
      { id: 'CASH', label: 'Hotově při převzetí', settable: true, selected: false },
    ],
    valid: true,
  },
  receipt: { doNotPrint: false },
  packaging: {
    selected: 'PAPER_BAGS',
    options: [
      { id: 'PAPER_BAGS', label: 'Papírové tašky', selected: true },
      { id: 'REUSABLE_BAGS', label: 'Vratné tašky (se zálohou)', selected: false },
    ],
  },
  courier: { note: '', callOnArrival: true },
  totals: { estimated: '129,80 Kč', cardHold: '135 Kč', lines: [{ label: 'Zboží', value: '80,80 Kč' }, { label: 'Doprava', value: '49 Kč' }], note: '' },
  warnings: ['Vyberte čas doručení'],
  ready: false,
  suborderAvailable: false,
};
const mockSlots = [
  { id: '101', label: '08:00–09:00', startMin: 480, priceText: '49 Kč', available: true, reservable: false, type: 'ON_TIME' },
  { id: null, label: '17:00–18:00', startMin: 1020, priceText: '', available: false, reservable: false, type: 'ON_TIME' },
  { id: '103', label: '18:00–19:00', startMin: 1080, priceText: 'Zdarma', available: true, reservable: true, type: 'ON_TIME' },
];
// Plain functions (not jest.fn) – CRA's resetMocks would wipe jest.fn implementations.
jest.mock('../services/push', () => ({
  pushSupported: () => Promise.resolve(false),
  enablePush: () => Promise.resolve('unsupported'),
  onForegroundMessage: () => () => {},
}));
jest.mock('../services/household', () => ({
  DEFAULT_SETTINGS: {},
  SEED_RECIPE_COUNT: 165,
  ensureHouseholdMeta: () => Promise.resolve({}),
  rotateJoinCode: () => Promise.resolve({ code: 'ZZZZ2345' }),
  removeMember: () => Promise.resolve({ ok: true }),
}));

const today = dateKey();
const horizon = horizonKeys(today);
const recipes = {
  r1: {
    name: 'Těstoviny Bolognese',
    emoji: '🍝',
    type: 'lunch',
    preparation: 'Vaření',
    instructions: 'Uvařit.',
    ingredients: [
      { name: 'Špagety', amount: '100 g' },
      { name: 'Sůl', amount: 'dle chuti' },
    ],
  },
  r2: { name: 'Ovesná kaše', emoji: '🥣', type: 'breakfast', preparation: 'Vaření', ingredients: [{ name: 'Mléko', amount: '200 ml' }] },
};
const plan = { [today]: { lunch: 'r1' }, [addDays(today, 1)]: { breakfast: 'r2', lunch: 'r1' } };
const orders = {};
const statusOf = (k) => dayStatus(plan[k], orders[k], recipes);
const noop = () => Promise.resolve();

const household = {
  hid: 'h1',
  uid: 'u1',
  nickname: 'vojta',
  ready: true,
  todayKey: today,
  horizon,
  recipes,
  plan,
  // Jana eats something else for lunch tomorrow and skips breakfast.
  memberPlan: { [addDays(today, 1)]: { lunch: { u2: 'r2' }, breakfast: { u2: '-' } } },
  fromTemplate: { [today]: { lunch: true } },
  weekTemplate: { from: today, days: {} },
  memberIds: ['u1', 'u2'],
  memberName: (u) => ({ u1: 'Vojta', u2: 'Jana' }[u] || 'Člen'),
  slotMeals: (day, slot) =>
    slotEntries(
      plan[day] && plan[day][slot],
      { [addDays(today, 1)]: { lunch: { u2: 'r2' }, breakfast: { u2: '-' } } }[day]?.[slot],
      ['u1', 'u2'],
      recipes
    ),
  startRepeat: noop,
  stopRepeat: noop,
  addMissingSeedRecipes: noop,
  orders,
  pantry: {},
  members: { u1: { nickname: 'vojta', joinedAt: 1 }, u2: { nickname: 'jana', joinedAt: 2 } },
  owner: 'u1',
  isOwner: true,
  rohlik: { connected: true, emailMasked: 'v***@gmail.com', connectedAt: 1, by: 'u1' },
  regulars: {
    k1: { name: 'Káva', amount: '1 balení', auto: true },
    k2: { name: 'Toaletní papír', auto: false },
  },
  settings: { remind3d: true, remindDaily: true, remindBoth: true, remindHour: 9 },
  joinCode: 'ABCD2345',
  name: 'procházkovi',
  activity: [{ id: 'a1', type: 'plan', text: 'Jana přidal(a) oběd', by: 'u2', at: Date.now() }],
  alert: buildAlert(today, horizon, statusOf),
  pendingDays: horizon.filter((k) => statusOf(k) === 'pending'),
  statusOf,
  requestPhoto: () => {},
  photoFor: () => undefined,
  setMeal: noop,
  removeMeal: noop,
  saveRecipe: noop,
  deleteRecipe: noop,
  togglePantry: noop,
  setOrderStatus: noop,
  clearOrder: noop,
  updateSettings: noop,
  logActivity: noop,
  addRegular: noop,
  updateRegular: noop,
  deleteRegular: noop,
  productPrefs: {},
  saveProductPrefs: noop,
};
const auth = { user: { uid: 'u1' }, nickname: 'Vojta', login: noop, register: noop, logout: noop };

function renderAt(path, element, routePath = path, hh = household) {
  return render(
    <AuthContext.Provider value={auth}>
      <HouseholdContext.Provider value={hh}>
        <BannerProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={routePath} element={element} />
            </Routes>
          </MemoryRouter>
        </BannerProvider>
      </HouseholdContext.Provider>
    </AuthContext.Provider>
  );
}

test('Přehled', () => {
  renderAt('/', <Home />);
  expect(screen.getByText('Co dnes vaříme')).toBeInTheDocument();
  expect(screen.getByText('Těstoviny Bolognese')).toBeInTheDocument();
  expect(screen.getByText('Zkontrolovat košík')).toBeInTheDocument();
});

test('Plán', () => {
  renderAt('/plan', <Plan />);
  expect(screen.getByText('Přidat snídani')).toBeInTheDocument();
  fireEvent.click(screen.getByText('3 dny'));
  fireEvent.click(screen.getByText('Přidat snídani'));
  expect(screen.getByText('Vybrat snídani')).toBeInTheDocument();
  expect(screen.getByText('Ovesná kaše')).toBeInTheDocument();
});

test('Plán: jídla pro členy, opakování, šipky po dni, výběr v mřížce', () => {
  renderAt('/plan', <Plan />);
  expect(screen.getByText(/Týden se opakuje/)).toBeInTheDocument();
  const period = () => screen.getByText(/–/, { selector: 'div' }).textContent;
  const before = period();
  fireEvent.click(screen.getByLabelText('O den dál'));
  expect(period()).not.toBe(before);
  // Tomorrow: Jana has her own lunch and skips breakfast.
  fireEvent.click(screen.getAllByText(String(new Date(Date.now() + 86400000).getDate()))[0]);
  expect(screen.getByText('Nejí: Jana')).toBeInTheDocument();
  expect(screen.getAllByText('Jana').length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByText('Jiné jídlo pro člena')[0]);
  expect(screen.getByText('Pro koho')).toBeInTheDocument();
  expect(screen.getByText('Jen tento den')).toBeInTheDocument();
  expect(screen.getByText('Nejí')).toBeInTheDocument();
});

test('Recepty + filtr', () => {
  renderAt('/recipes', <Recipes />);
  fireEvent.change(screen.getByPlaceholderText('Hledat recept nebo surovinu'), { target: { value: 'mléko' } });
  expect(screen.getByText('Ovesná kaše')).toBeInTheDocument();
  expect(screen.queryByText('Těstoviny Bolognese')).toBeNull();
});

test('Detail + úprava', () => {
  renderAt('/recipes/r1', <RecipeDetail />, '/recipes/:id');
  expect(screen.getByText('Přidat do plánu')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Přidat do plánu'));
  expect(screen.getByText('Na který den?')).toBeInTheDocument();
});

test('Editace receptu', () => {
  renderAt('/recipes/r1/edit', <RecipeEdit />, '/recipes/:id/edit');
  expect(screen.getByDisplayValue('Těstoviny Bolognese')).toBeInTheDocument();
  expect(screen.getByText('Smazat recept')).toBeInTheDocument();
});

test('Nákup', () => {
  renderAt('/cart', <Cart />);
  expect(screen.getByText('Najít na Rohlíku')).toBeInTheDocument();
  expect(screen.getByText('Špagety')).toBeInTheDocument();
  expect(screen.getByText('Máme doma · 1')).toBeInTheDocument();
  // regulars: "auto" one is preselected and joins the list, the other is only a chip
  expect(screen.getByText('Pravidelné položky')).toBeInTheDocument();
  expect(screen.getAllByText('Káva')).toHaveLength(2);
  expect(screen.getAllByText('Toaletní papír')).toHaveLength(1);
  fireEvent.click(screen.getByText('Toaletní papír'));
  expect(screen.getAllByText('Toaletní papír')).toHaveLength(2);
});

test('Nákup – karusel variant, zapamatovaná volba, množství, hledat jinak', async () => {
  mockCalls.length = 0;
  renderAt('/cart', <Cart />, '/cart', {
    ...household,
    settings: { ...household.settings, shop: { preferBio: true } },
    productPrefs: {
      mléko: { productId: '2', name: 'Špagety varianta 2', count: 2, lastAt: 1, by: 'u1' },
      špagety: { productId: '9', name: 'Staré špagety', packText: '500 g', priceText: '25 Kč', count: 1, lastAt: 1, by: 'u1' },
    },
  });
  fireEvent.click(screen.getByText('Najít na Rohlíku'));
  expect(await screen.findByText('Vyberte produkty')).toBeInTheDocument();

  // the request carries the summed need, the remembered product and the household prefs
  const req = mockCalls[0];
  expect(req.prefs).toEqual({ preferLight: false, preferBio: true, sort: 'best' });
  const spReq = req.items.find((i) => i.key === 'špagety');
  expect(spReq.need).toEqual({ qty: 200, unit: 'g' });
  expect(spReq.preferredProductId).toBe('9');
  expect(screen.getByText('Potřeba: 200 g · pro: Těstoviny Bolognese')).toBeInTheDocument();

  const lists = screen.getAllByRole('listbox');
  expect(lists).toHaveLength(3); // Káva + Mléko + Špagety
  // remembered product found → first, preselected, "Vaše volba"
  const milk = within(lists[1]).getAllByRole('option');
  expect(milk[0]).toHaveTextContent('Špagety varianta 2');
  expect(milk[0]).toHaveTextContent('Vaše volba');
  expect(milk[0]).toHaveAttribute('aria-selected', 'true');
  // remembered product not found → stored snapshot first
  const spItem = lists[2].closest('.shop-item');
  let sp = within(lists[2]).getAllByRole('option');
  expect(sp).toHaveLength(4);
  expect(sp[0]).toHaveTextContent('z minulého nákupu');
  expect(sp[0]).toHaveAttribute('aria-selected', 'true');
  // a 100 g pack for 200 g → 2 packs preselected
  fireEvent.click(sp[2]);
  expect(sp[2]).toHaveAttribute('aria-selected', 'true');
  expect(sp[0]).toHaveAttribute('aria-selected', 'false');
  expect(spItem.querySelector('.shop-item__total strong')).toHaveTextContent('64 Kč');
  // 500 g pack → "zbude 300 g" hint on its card
  expect(sp[1]).toHaveTextContent('zbude 300 g');
  // keyboard: arrow right selects the next card (1 kg → 1 pack)
  fireEvent.keyDown(sp[2], { key: 'ArrowRight' });
  expect(sp[3]).toHaveAttribute('aria-selected', 'true');
  expect(spItem.querySelector('.shop-item__total strong')).toHaveTextContent('33 Kč');
  // skip toggle
  const skip = within(spItem).getByText('Přeskočit').closest('button');
  fireEvent.click(skip);
  expect(skip).toHaveAttribute('aria-pressed', 'true');
  expect(within(lists[2]).queryAllByRole('option', { selected: true })).toHaveLength(0);
  fireEvent.click(sp[1]);
  expect(skip).toHaveAttribute('aria-pressed', 'false');

  // "Hledat jinak" → one call for this single item with the custom query
  fireEvent.click(within(spItem).getByText('Hledat jinak'));
  const input = within(spItem).getByLabelText('Hledat jinak – Špagety');
  fireEvent.change(input, { target: { value: 'spaghetti integrale' } });
  fireEvent.click(within(spItem).getByText('Hledat'));
  expect(await within(spItem).findAllByRole('option')).toHaveLength(3);
  expect(mockCalls).toHaveLength(2);
  expect(mockCalls[1].items).toHaveLength(1);
  expect(mockCalls[1].items[0]).toMatchObject({ key: 'špagety', query: 'spaghetti integrale' });
  expect(mockCalls[1].items[0].preferredProductId).toBeUndefined();
  sp = within(spItem).getAllByRole('option');
  expect(sp).toHaveLength(3); // fresh results only, no snapshot of the remembered product
  expect(sp[0]).toHaveAttribute('aria-selected', 'true');
  expect(sp[0]).not.toHaveTextContent('z minulého nákupu');
});

test('Nákup – Rohlík nepřipojený', () => {
  renderAt('/cart', <Cart />, '/cart', { ...household, rohlik: null });
  expect(screen.getByText('Připojte účet Rohlík')).toBeInTheDocument();
  expect(screen.getByText('Otevřít nastavení')).toBeInTheDocument();
  expect(screen.queryByText('Najít na Rohlíku')).toBeNull();
});

test('Hotovo – nic nečeká v košíku', () => {
  renderAt('/cart/done', <CartCheckout />);
  expect(screen.getByText('Hotovo')).toBeInTheDocument();
});

const inCartHousehold = (extra = {}) => {
  const ord = { [today]: { status: 'in_cart', at: 1, by: 'u1' } };
  const st = (k) => dayStatus(plan[k], ord[k], recipes);
  return { ...household, orders: ord, statusOf: st, ...extra };
};

test('Objednávka – košík, doručení, platba, souhrn', async () => {
  mockCheckoutCalls.length = 0;
  mockSync.next = { result: 'none', days: [] };
  renderAt('/cart/checkout', <CartCheckout />, '/cart/checkout', inCartHousehold({
    settings: { ...household.settings, delivery: { window: 'evening', lead: 'sameDay' } },
  }));
  expect(await screen.findByText('Mléko polotučné 1 l')).toBeInTheDocument();
  expect(screen.getByText('Košík na Rohlíku')).toBeInTheDocument();
  expect(await screen.findByText('18:00–19:00')).toBeInTheDocument();
  // preferred window = evening → the first available evening slot is recommended, nothing selected yet
  expect(screen.getByText('Doporučeno').closest('button')).toHaveTextContent('18:00–19:00');
  expect(screen.getByText('17:00–18:00').closest('button')).toBeDisabled();
  expect(mockCheckoutCalls).toContainEqual(['load', { applyDefaults: true, skip: [] }]);
  expect(mockCheckoutCalls).toContainEqual(['slots', 0]);
  // online card is shown but chosen only in Rohlík
  expect(screen.getByText('Kartou online').closest('button')).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByText('Minimální objednávka je 749 Kč', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('129,80 Kč')).toBeInTheDocument();
  expect(screen.getByText('Vyberte čas doručení')).toBeInTheDocument();
  expect(screen.getByText('Potvrdit a zaplatit na Rohlíku')).toBeInTheDocument();
  expect(screen.getByText('Objednávku jsem dokončil(a)')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Hotově při převzetí'));
  await waitFor(() => expect(mockCheckoutCalls.map((c) => c[0])).toContain('setPayment'));
  expect(mockCheckoutCalls).toContainEqual(['setPayment', { method: 'CASH' }]);
});

test('Objednávka – zjištěná objednávka na Rohlíku', async () => {
  mockSync.next = { result: 'ordered', days: [today], order: { id: 5, slotText: '17:00-18:00', totalText: '812 Kč' } };
  renderAt('/cart/checkout', <CartCheckout />, '/cart/checkout', inCartHousehold());
  expect(await screen.findByText('Objednávka přijata ✓')).toBeInTheDocument();
  expect(screen.getByText('doručení 17:00-18:00', { exact: false })).toBeInTheDocument();
  mockSync.next = { result: 'none', days: [] };
});

test('Objednávka – Rohlík nepřipojený', () => {
  renderAt('/cart/checkout', <CartCheckout />, '/cart/checkout', inCartHousehold({ rohlik: null }));
  expect(screen.getByText('Účet Rohlík není připojený')).toBeInTheDocument();
  expect(screen.getByText('Objednávku jsem dokončil(a)')).toBeInTheDocument();
});

test('Upozornění – jen seznam', () => {
  renderAt('/notifications', <Notifications />);
  expect(screen.getByText('Jana přidal(a) oběd')).toBeInTheDocument();
  expect(screen.getByText('Otevřít nastavení')).toBeInTheDocument();
  expect(screen.getByLabelText('Nastavení')).toBeInTheDocument();
  expect(screen.queryByText('ABCD2345')).toBeNull();
  expect(screen.queryByText('Čas připomínky')).toBeNull();
});

test('Nastavení – zakladatel', async () => {
  renderAt('/settings', <Settings />);
  expect(await screen.findByText('Tento prohlížeč upozornění nepodporuje.', { exact: false })).toBeInTheDocument();
  ['Domácnost', 'Účet Rohlík', 'Připomínky', 'Účet', 'Čas připomínky', 'Odhlásit se'].forEach((t) =>
    expect(screen.getByText(t)).toBeInTheDocument(),
  );
  expect(screen.getByText('ABCD2345')).toBeInTheDocument();
  expect(screen.getByText('jako v***@gmail.com')).toBeInTheDocument();
  expect(screen.getByText('Odpojit')).toBeInTheDocument();
  expect(screen.getByLabelText('Odebrat Jana')).toBeInTheDocument();
  expect(screen.getByLabelText('Vygenerovat nový kód')).toBeInTheDocument();
});

test('Nastavení – nákup na Rohlíku', async () => {
  const calls = [];
  renderAt('/settings', <Settings />, '/settings', {
    ...household,
    settings: { ...household.settings, shop: { preferLight: true } },
    updateSettings: (patch) => {
      calls.push(patch);
      return Promise.resolve();
    },
  });
  expect(screen.getByText('Nákup na Rohlíku')).toBeInTheDocument();
  const light = screen.getByText('Upřednostnit light / 0 % tuku').closest('button');
  expect(light).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(light);
  fireEvent.click(screen.getByText('Upřednostnit BIO'));
  expect(screen.getByText('Nejlepší shoda')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByText('Nejlevnější za kg'));
  expect(calls).toEqual([{ 'shop/preferLight': false }, { 'shop/preferBio': true }, { 'shop/sort': 'unitPrice' }]);
  expect(await screen.findByText('Tento prohlížeč upozornění nepodporuje.', { exact: false })).toBeInTheDocument();
});

test('Nastavení – doručení z Rohlíku', async () => {
  const calls = [];
  renderAt('/settings', <Settings />, '/settings', {
    ...household,
    updateSettings: (patch) => {
      calls.push(patch);
      return Promise.resolve();
    },
  });
  expect(screen.getByText('Doručení z Rohlíku')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Večer'));
  fireEvent.click(screen.getByText('Den před vařením'));
  fireEvent.click(screen.getByText('Kartou při převzetí'));
  fireEvent.click(screen.getByText('Vratné tašky (se zálohou)'));
  fireEvent.click(screen.getByText('Načíst adresy'));
  fireEvent.click(await screen.findByText('Dlouhá 5, Praha 1'));
  expect(calls).toEqual([
    { 'delivery/window': 'evening' },
    { 'delivery/lead': 'dayBefore' },
    { 'delivery/paymentId': 'CARD_ON_PLACE', 'delivery/paymentLabel': 'Kartou při převzetí' },
    { 'delivery/packaging': 'REUSABLE_BAGS' },
    { 'delivery/addressId': 56, 'delivery/addressLabel': 'Dlouhá 5, Praha 1' },
  ]);
  expect(await screen.findByText('Tento prohlížeč upozornění nepodporuje.', { exact: false })).toBeInTheDocument();
});

test('Nastavení – připojení Rohlíku přes OAuth', async () => {
  const original = window.open;
  window.open = () => null; // popup blocked -> the link fallback is shown
  try {
    renderAt('/settings', <Settings />, '/settings', { ...household, rohlik: { connected: false, needsReconnect: true } });
    expect(screen.getByText('Přihlášení k Rohlíku vypršelo', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Znovu se přihlásit přes Rohlík'));
    expect(await screen.findByText('Dokončit připojení')).toBeInTheDocument();
    expect(screen.getByText('Okno se neotevřelo? Otevřít přihlášení')).toHaveAttribute(
      'href',
      'https://identity.rohlik.cz/oauth2/authorize?x=1',
    );
    fireEvent.click(screen.getByText('Dokončit připojení'));
    expect(screen.getByText('Vložte adresu, na kterou vás Rohlík přesměroval.')).toBeInTheDocument();
  } finally {
    window.open = original;
  }
});

test('Nastavení – člen bez vlastnictví', () => {
  renderAt('/settings', <Settings />, '/settings', {
    ...household,
    isOwner: false,
    owner: 'u2',
    rohlik: null,
  });
  expect(screen.getByText('Nepřipojeno')).toBeInTheDocument();
  expect(screen.queryByText('Přihlásit se přes Rohlík')).toBeNull();
  expect(screen.queryByLabelText('Odebrat Jana')).toBeNull();
  expect(screen.queryByLabelText('Vygenerovat nový kód')).toBeNull();
});

test('Přihlášení / registrace', () => {
  renderAt('/login', <Login />);
  fireEvent.click(screen.getByText('Registrovat se'));
  expect(screen.getByText('Heslo znovu')).toBeInTheDocument();
});

describe('desktop layout (>= 1024px)', () => {
  const original = window.matchMedia;
  window.scrollTo = () => {}; // not implemented in jsdom
  beforeEach(() => {
    window.matchMedia = (query) => ({
      matches: query.includes('min-width: 1024px'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    });
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  test('app shell renders the sidebar instead of the tab bar', () => {
    const { container } = render(
      <AuthContext.Provider value={auth}>
        <HouseholdContext.Provider value={household}>
          <BannerProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<div>Obsah</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </BannerProvider>
        </HouseholdContext.Provider>
      </AuthContext.Provider>
    );
    expect(container.querySelector('.sidebar')).not.toBeNull();
    expect(container.querySelector('.tabbar')).toBeNull();
    expect(screen.getByText('Procházkovi')).toBeInTheDocument();
    expect(screen.getByText('2 členové')).toBeInTheDocument();
    expect(screen.getByText('Upozornění')).toBeInTheDocument();
    expect(screen.getByLabelText('Nastavení domácnosti')).toHaveAttribute('href', '/settings');
    expect(screen.queryByText('Odhlásit se')).toBeNull();
    expect(screen.getByText('Obsah')).toBeInTheDocument();
  });

  test('plan shows the week grid', () => {
    renderAt('/plan', <Plan />);
    expect(document.querySelector('.plan-grid')).not.toBeNull();
    expect(screen.getAllByText(/Těstoviny Bolognese/).length).toBeGreaterThan(0);
    // Tomorrow's lunch: everyone else has the shared meal, Jana her own one.
    expect(screen.getAllByText('Ostatní:').length).toBeGreaterThan(0);
    expect(screen.getByText('Jana: Ovesná kaše')).toBeInTheDocument();
  });

  test('mobile shell keeps the tab bar', () => {
    window.matchMedia = undefined;
    const { container } = render(
      <AuthContext.Provider value={auth}>
        <HouseholdContext.Provider value={household}>
          <BannerProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<div>Obsah</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </BannerProvider>
        </HouseholdContext.Provider>
      </AuthContext.Provider>
    );
    expect(container.querySelector('.sidebar')).toBeNull();
    expect(container.querySelector('.tabbar')).not.toBeNull();
  });
});
