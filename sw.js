/* ═══════════════════════════════════════════════════════════
   NovaGYM — Service Worker
   Stratégie : cache-first pour les assets locaux,
               network-first pour Supabase/APIs externes.
   ═══════════════════════════════════════════════════════════ */

const CACHE = 'novagym-v1';

/* App shell : tous les fichiers locaux nécessaires au lancement */
const SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/icon.png',
  '/manifest.json',
  /* JS */
  '/js/config.js',
  '/js/i18n.js',
  '/js/icons.js',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/sync.js',
  '/js/exercises-db.js',
  '/js/exercise-visuals.js',
  '/js/badges.js',
  '/js/timer.js',
  '/js/programs.js',
  '/js/history.js',
  '/js/stats.js',
  '/js/today.js',
  '/js/nutrition.js',
  '/js/social.js',
  '/js/groups.js',
  '/js/dm.js',
  '/js/onboarding.js',
  '/js/profile-editor.js',
  '/js/settings.js',
  '/js/tutorial.js',
  '/js/app.js',
  '/js/dev.js',
];

/* ─── Install : pré-cache du shell ───────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate : supprime les anciens caches ─────────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch ──────────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  /* Ignore les requêtes non-GET (POST Supabase, etc.) */
  if (request.method !== 'GET') return;

  /* Ignore Vercel analytics, CDN externes, Supabase API */
  const isExternal = url.hostname !== self.location.hostname;
  const isAnalytics = url.pathname.startsWith('/_vercel');
  if (isExternal || isAnalytics) {
    e.respondWith(fetch(request).catch(() => new Response('', { status: 204 })));
    return;
  }

  /* Cache-first pour les assets locaux */
  e.respondWith(
    caches.match(request).then(cached => {
      /* Retourner depuis le cache si disponible */
      if (cached) {
        /* Revalidation en arrière-plan pour les fichiers JS/CSS */
        if (/\.(js|css)$/.test(url.pathname)) {
          fetch(request).then(fresh => {
            if (fresh.ok) caches.open(CACHE).then(c => c.put(request, fresh));
          }).catch(() => {});
        }
        return cached;
      }

      /* Sinon : réseau, puis mise en cache */
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return response;
      }).catch(() => {
        /* Fallback : index.html pour toute navigation */
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 204 });
      });
    })
  );
});
