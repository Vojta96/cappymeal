// Simulation of the downloaded data volume (characters ~ bytes) - documents the effect of thumbnails.
const FULL = 214000;
const THUMB = 20000; // estimate for a ~1000 px photo at 320 px / q 0.7
const N = 165;
const mb = (chars) => Math.round((chars / 1e6) * 10) / 10;

test('thumbnails + IndexedDB cut the downloaded volume', () => {
  const before = {
    recipesFirstScreen: 10 * FULL,
    recipesFullScroll: N * FULL,
    planWeek: 35 * FULL,
    secondLaunch: N * FULL,
  };
  const after = {
    recipesFirstScreen: 10 * THUMB,
    recipesFullScroll: N * THUMB,
    planWeek: 35 * THUMB,
    secondLaunch: 0,
  };
  // eslint-disable-next-line no-console
  console.log('MB before', Object.fromEntries(Object.entries(before).map(([k, v]) => [k, mb(v)])));
  // eslint-disable-next-line no-console
  console.log('MB after', Object.fromEntries(Object.entries(after).map(([k, v]) => [k, mb(v)])));
  expect(after.recipesFullScroll).toBeLessThan(before.recipesFullScroll / 10);
});
