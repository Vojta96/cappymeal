# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                                   # Dev server on port 3000
npm run build                               # Production build (output: build/)
npm test                                    # Jest in watch mode
npm test -- --watchAll=false src/App.test.js  # Run a single test file once
npm test -- --watchAll=false -t "name"      # Run tests matching a name
```

There is no separate lint script; ESLint (`react-app` config) runs inside `npm start` / `npm run build`.

The only test, `src/App.test.js`, is the untouched CRA boilerplate ("learn react") and does not match the app — it fails, and it would also try to initialize real Firebase.

Deploy (only on the owner's explicit request): `npm run build`, then `firebase deploy` (hosting + database rules), or `firebase deploy --only database` for rules alone.

## Stack

- **React 18** (JavaScript, not TypeScript) via Create React App
- **React Router DOM v6** — `BrowserRouter` is created in `src/App.js` (not `index.js`)
- **Material-UI (MUI) v5** + **@mui/icons-material v5**; swipeable day tabs via `react-swipeable-views-react-18-fix`
- **Firebase** (project `cappymeal-go`): Auth, Realtime Database (europe-west1), Hosting. Client config is in `src/firebase.js`, which exports `db` and `auth`.

UI text, labels and recipe data are in Czech.

## Architecture

Pages live in `src/Pages/`, each with a `.js` component and a `.css` file. Shared components go in `src/components/`, global state in `src/context/`.

### Provider order and auth gating (`src/App.js`)

`AuthProvider > BrowserRouter > WeekProvider > PreferencesProvider > AppContent`. Order matters: the week and preferences providers call `useAuth()` and reload when the user changes.

`AppContent` renders entirely different route sets based on auth:
- logged out → only `/login`; every other path redirects to `/login`
- logged in → `/` Home, `/week`, `/recipes` (Meals), `/shoplist`, `*` NoPage; `/login` redirects to `/`

### Auth (`src/context/AuthContext.js`)

Users sign up with a **nickname + password**. The nickname is turned into a fake email `${nickname.trim().toLowerCase()}@cappymeal.app` and passed to Firebase email/password auth. `useAuth()` → `{ user, loading, login, register, logout }`.

### Week plan (`src/context/WeekContext.js`)

- Stored in Realtime Database at `users/{uid}/weekPlan` (not localStorage). `database.rules.json` allows each user to read/write only `users/$uid`.
- Two-way sync: `onValue` dispatches `LOAD`; a second effect writes the whole plan back with `set()` on every change. `skipNextWrite` stops a remote load from being echoed back, and `initialLoad` stops an empty plan from overwriting the DB before the first snapshot arrives. Keep both guards intact when changing this.
- **Keys are ISO dates (`YYYY-MM-DD`), not weekdays.** Each day is `{ breakfast, snack, lunch, afternoon_snack, dinner }`, each slot `null` or a full meal object copied from `MealsList`.
- `useWeek()` → `{ weekPlan, getDay(dateKey), setMeal(day, slot, meal), removeMeal(day, slot), pruneOldDays() }`. `getDay` returns an empty day for missing keys.
- `Week.js` generates the next 14 days as tabs and calls `pruneOldDays()` on mount, which removes past dates from the plan.
- Date keys come from `toISOString().slice(0, 10)` on a local-midnight `Date`, which is UTC — in Czech time zones this yields the *previous* day's date. It is consistent across `Week.js` and `pruneOldDays`, so change both together if you fix it.

### Preferences (`src/context/PreferencesContext.js`, `src/components/PreferencesModal.js`)

A diet questionnaire (keys `maso`, `ryby`, `mlecne`, `lustěniny`) shown as a modal whenever a logged-in user has no saved preferences. Saved **per user in localStorage** under `cappymeal-preferences-{uid}` (not in Firebase). The answers are not yet used to filter meals anywhere.

### Meals and shopping list

- `src/Pages/Meals/MealsList.js` is the static recipe data: an array of meal objects `{ id, name, image, emoji, ingredients: [{ name, amount }], instructions, type, preparation }`. `type` matches the week slot keys. `image` is an imported image or `null` (then the emoji is shown).
- `Meals.js` (recipe browser) filters by `type`; `Day.js` opens a picker that lists the meals whose `type` matches the clicked slot.
- `ShopList.js` combines ingredients across all planned days (keyed by lowercased name), sorts them alphabetically and shows which days/meals each comes from. Checked-off state is local only.

### Leftovers

`src/Pages/Week/Days/Monday.js` and `src/Pages/Meals/MealsReducer.js` are unused stubs. `notes/` and the PDF in the root are source material (recipe data), not code.
