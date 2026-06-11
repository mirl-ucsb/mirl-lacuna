/* sw.js: offline support. After the first visit the whole tool, fonts and
   sample included, lives in the browser's cache, so the register opens and
   works with no connection at all: fieldwork insurance. Code and styles are
   fetched network-first (updates arrive when there is a connection); fonts,
   vendored libraries, and the sample images cache-first (they do not
   change). Bump CACHE with each release so old copies are cleared. */

const CACHE = 'mirl-lacuna-v1.4.0';

const CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/model.js',
  'js/citation.js',
  'js/register.js',
  'js/record.js',
  'js/timeline.js',
  'js/stats.js',
  'js/atlas.js',
  'js/indexes.js',
  'js/importers.js',
  'js/exporters.js',
  'js/app.js',
  'vendor/openseadragon.min.js',
  'vendor/land.js',
  'samples/sample-data.js',
  'samples/img/copy-portrait-daughters.png',
  'samples/img/inventory-page.png',
  'samples/img/copy-self-portrait.png',
  'samples/img/harbour-dusk.png',
  'samples/img/contact-sheet-fragment.png',
  'fonts/spectral-latin-400-normal.woff2',
  'fonts/spectral-latin-400-italic.woff2',
  'fonts/spectral-latin-500-normal.woff2',
  'fonts/spectral-latin-600-normal.woff2',
  'fonts/ibm-plex-mono-latin-400-normal.woff2',
  'fonts/ibm-plex-mono-latin-500-normal.woff2',
  'fonts/noto-naskh-arabic-arabic-400-normal.woff2',
  'fonts/noto-naskh-arabic-arabic-600-normal.woff2',
];

/* these never change between releases: serve from cache without asking */
const CACHE_FIRST = /\/(fonts|vendor|samples\/img)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (CACHE_FIRST.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit ||
        fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })));
    return;
  }

  /* everything else: the network when there is one, the cache when not */
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() =>
      caches.match(e.request).then(hit => hit ||
        (e.request.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
