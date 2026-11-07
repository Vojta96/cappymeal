// Smoke tests: every screen renders with a fake household (no real Firebase).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HouseholdContext } from '../context/HouseholdContext';
import { BannerProvider } from '../components/PushBanner';
import { addDays, dateKey, horizonKeys } from '../lib/dates';
import { buildAlert, dayStatus } from '../lib/meals';
import Home from './Home';
import Plan from './Plan';
import Recipes from './Recipes';
import RecipeDetail from './RecipeDetail';
import RecipeEdit from './RecipeEdit';
import Cart from './Cart';
import CartDone from './CartDone';
import Notifications from './Notifications';
import Login from './Login';

jest.mock('../firebase', () => ({ app: {}, db: {}, auth: {} }));
jest.mock('firebase/database', () => ({}));
jest.mock('firebase/auth', () => ({}));
jest.mock('../services/rohlik', () => ({
  getRohlikStatus: () => Promise.resolve({ configured: true, tools: [] }),
  matchProducts: () => Promise.resolve({ results: [] }),
  fillCart: () => Promise.resolve({ ok: true, added: 0, failed: [] }),
}));
// Plain functions (not jest.fn) – CRA's resetMocks would wipe jest.fn implementations.
jest.mock('../services/push', () => ({
  pushSupported: () => Promise.resolve(false),
  enablePush: () => Promise.resolve('unsupported'),
  onForegroundMessage: () => () => {},
}));
jest.mock('../services/household', () => ({ DEFAULT_SETTINGS: {} }));

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
  orders,
  pantry: {},
  members: { u1: { nickname: 'vojta', joinedAt: 1 } },
  settings: { remind3d: true, remindDaily: true, remindBoth: true, remindHour: 9 },
  joinCode: 'ABCD2345',
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
};
const auth = { user: { uid: 'u1' }, nickname: 'vojta', login: noop, register: noop, logout: noop };

function renderAt(path, element, routePath = path) {
  return render(
    <AuthContext.Provider value={auth}>
      <HouseholdContext.Provider value={household}>
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
});

test('Hotovo', () => {
  renderAt('/cart/done', <CartDone />);
  expect(screen.getByText('Hotovo')).toBeInTheDocument();
});

test('Upozornění', async () => {
  renderAt('/notifications', <Notifications />);
  expect(await screen.findByText('Tento prohlížeč upozornění nepodporuje.', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('ABCD2345')).toBeInTheDocument();
  expect(screen.getByText('Jana přidal(a) oběd')).toBeInTheDocument();
});

test('Přihlášení / registrace', () => {
  renderAt('/login', <Login />);
  fireEvent.click(screen.getByText('Registrovat se'));
  expect(screen.getByText('Heslo znovu')).toBeInTheDocument();
});
