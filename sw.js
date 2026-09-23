// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — PixVid AI
// Cache l'application pour un usage hors-ligne et une ouverture
// instantanée même sans connexion internet.
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'pixvid-ai-v1';
const CACHE_VERSION = 1;

// Ressources à mettre en cache au premier démarrage
const PRECACHE_URLS = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
];

// Ressources CDN à mettre en cache à la demande
const CDN_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
];

// ── Installation ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // On essaie de précacher les ressources locales
            // On ignore les erreurs (ex: fichiers absents)
            return Promise.allSettled(
                PRECACHE_URLS.map(url =>
                    cache.add(url).catch(() => {
                        console.warn('[SW] Impossible de précacher :', url);
                    })
                )
            );
        }).then(() => {
            // Prendre le contrôle immédiatement sans attendre
            return self.skipWaiting();
        })
    );
});

// ── Activation & nettoyage des anciens caches ───────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// ── Stratégie de récupération ───────────────────────────────────
// • Ressources locales (HTML, icônes, manifest) → Cache-first
// • CDN (fontes, JSZip) → Stale-while-revalidate
// • API externe (génération vidéo) → Network-only (jamais mis en cache)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Exclure les requêtes API et les requêtes non-GET
    if (event.request.method !== 'GET') return;
    if (url.hostname.includes('agnes-ai') || url.pathname.includes('/api/')) return;
    if (url.protocol === 'chrome-extension:') return;

    // CDN → stale-while-revalidate
    if (CDN_HOSTS.some(h => url.hostname.includes(h))) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    // Fichiers locaux → cache-first avec fallback réseau
    if (url.origin === self.location.origin || event.request.url.startsWith('file://')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }
});

// ── Stratégies de cache ─────────────────────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        // Hors-ligne et pas dans le cache : renvoyer une page de secours minimale
        return new Response(
            '<html><body style="background:#0b0c11;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">' +
            '<div><h2>⚡ PixVid AI</h2><p>Vous êtes hors-ligne.<br>Veuillez ouvrir index.html directement.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
        );
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const networkFetch = fetch(request).then(async (response) => {
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    return cached || await networkFetch;
}
