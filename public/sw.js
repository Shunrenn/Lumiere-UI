const CACHE_NAME = 'lumiere-shell-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/placeholder-logo.svg',
]

// Install event — cache app shell core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event — clean up old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Fetch event — intelligent shell caching + offline fallback
self.addEventListener('fetch', (event) => {
  const request = event.request

  // Only handle GET requests
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // Strictly bypass API and realtime SignalR WebSocket endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/hubs/') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/hubs/')
  ) {
    return
  }

  // 1. SPA Navigation requests (e.g. /ground-crew, /warehouse)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return networkResponse
        })
        .catch(async () => {
          // Fall back to cached SPA shell
          const cachedNavigate = await caches.match(request)
          if (cachedNavigate) return cachedNavigate
          const cachedIndex = await caches.match('/index.html')
          if (cachedIndex) return cachedIndex
          const cachedRoot = await caches.match('/')
          if (cachedRoot) return cachedRoot
          return new Response('Offline - Application Shell Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          })
        })
    )
    return
  }

  // 2. Static assets & generated Vite JS/CSS chunks (e.g. /assets/*)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Asynchronously update asset in background if online
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(request, networkResponse))
              }
            })
            .catch(() => {})
          return cachedResponse
        }

        // Cache miss: fetch from network and store dynamically
        return fetch(request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseClone = networkResponse.clone()
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
          }
          return networkResponse
        })
      })
    )
  }
})
