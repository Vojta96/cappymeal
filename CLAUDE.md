# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Dev server on port 3000
npm run build    # Production build (output: build/)
npm test         # Run tests in watch mode
```

Deploy to Firebase after building: `firebase deploy`

## Stack

- **React 18** (JavaScript, not TypeScript) via Create React App
- **React Router DOM v6** — `BrowserRouter` in `src/index.js`, routes defined in `src/App.js`
- **Material-UI (MUI) v5** + **@mui/icons-material v5** — primary component library
- **Firebase Hosting** — project ID `cappymeal-go`, configured in `firebase.json`

## Architecture

Czech-language meal planner. Pages live in `src/Pages/`, each with a `.js` component and a `.css` file.

**Routing** (`src/App.js`):
- `/` → Home — hero landing with links to the three sections
- `/recipes` → Meals — recipe browser with category filter tabs
- `/week` → Week — 7-day meal planner
- `/shoplist` → ShopList — shopping list generated from the week plan
- `/login` → Login/Register form (UI only, no backend)

**Global state** lives in `src/context/WeekContext.js` — a `WeekProvider` wraps the whole app in `App.js`. It uses `useReducer` and persists to `localStorage` under the key `cappymeal-weekplan`. Consume with the `useWeek()` hook (`{ weekPlan, setMeal, removeMeal }`).

**Week plan shape:**
```js
weekPlan = {
  monday: { breakfast, snack, lunch, afternoon_snack, dinner },
  tuesday: { ... },
  // wednesday … sunday
}
```
Each slot is `null` (empty) or a meal object from `MealsList`.

**Data** is static in `src/Pages/Meals/MealsList.js` — an array of 23 meal objects. Each meal has: `id`, `name`, `image` (imported PNG or `null`), `emoji`, `ingredients` (array of `{ name, amount }`), `instructions`, `type`, `preparation`. The `type` field matches the week plan slot keys: `breakfast | snack | lunch | afternoon_snack | dinner`.

**Week page** (`src/Pages/Week/`): `Week.js` renders a scrollable tab bar and `SwipeableViews`. Each tab renders a single `Day` component from `src/Pages/Week/Days/Day.js` — the same component is reused for all 7 days, distinguished only by the `dayKey` prop. The old `Monday.js` is an unused leftover.

**Shopping list** (`src/Pages/ShopList/ShopList.js`) reads `weekPlan` from context, aggregates all ingredients across the week (keyed by lowercased ingredient name), sorts alphabetically, and shows origin chips per item. Items can be checked off locally (no persistence for the checked state).

**Images** are in `src/Images/` (app-level) and `src/Pages/Meals/Images/` (recipe photos — currently only `pancakes.png` and `soup.png`). Meals without a real image use `null` and display an emoji placeholder instead.
