import {
  getCachedThumb,
  putCachedThumb,
  pruneThumbs,
  thumbCacheKey,
  resetPhotoCacheForTests,
} from './photoCache';

test('thumbCacheKey', () => {
  expect(thumbCacheKey('h', 'r', 5)).toBe('h:r:5');
  expect(thumbCacheKey('h', 'r')).toBe('h:r:0');
});

describe('without IndexedDB (private mode, old browser)', () => {
  beforeEach(() => resetPhotoCacheForTests());

  test('jsdom has no indexedDB: everything falls back silently', async () => {
    expect(typeof indexedDB).toBe('undefined');
    expect(await getCachedThumb('h:r:1')).toBeNull();
    expect(await putCachedThumb('h:r:1', 'data:image/jpeg;base64,AA')).toBe(false);
    expect(await pruneThumbs('h', new Set())).toBe(false);
  });

  test('a throwing indexedDB.open is swallowed', async () => {
    global.indexedDB = {
      open: () => {
        throw new Error('SecurityError');
      },
    };
    try {
      expect(await getCachedThumb('h:r:1')).toBeNull();
      expect(await putCachedThumb('h:r:1', 'x')).toBe(false);
    } finally {
      delete global.indexedDB;
    }
  });
});
