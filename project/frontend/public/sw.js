// Service Worker for PWA - Push Notifications & Offline Support
const CACHE_NAME = 'task-management-v12';
const STATIC_CACHE = 'static-v12';
const DYNAMIC_CACHE = 'dynamic-v12';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/tasks',
  '/api/dashboard',
  '/api/notifications',
  '/api/users/basic'
];

// Routes to NEVER cache or intercept (auth, sanctum, etc.)
const EXCLUDED_PATHS = [
  '/sanctum/',
  '/api/login',
  '/api/logout',
  '/api/register',
  '/api/user',
  '/api/forgot-password',
  '/api/reset-password'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installed - v5 with offline support');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Clear old caches
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clear old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated - v5 with offline support');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Cleaning up old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Check if path should be excluded from service worker handling
function isExcludedPath(pathname) {
  return EXCLUDED_PATHS.some(path => pathname.startsWith(path));
}

// Fetch event - Network First with Cache Fallback for API, Cache First for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: Skip sanctum and auth routes entirely - let browser handle them
  if (isExcludedPath(url.pathname)) {
    return;
  }

  // API requests - Network First with Cache Fallback (except excluded paths)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Offline - cached data unavailable' }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - Cache First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received', event);
  
  let data = {
    title: 'Task Management',
    body: 'You have a new notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'task-notification',
    data: {}
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'task-notification',
    data: data.data,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate to specific task if task_id exists
          if (notificationData.task_id) {
            client.navigate(`/tasks/${notificationData.task_id}`);
          } else if (notificationData.url) {
            client.navigate(notificationData.url);
          }
          return client.focus();
        }
      }
      // If app is not open, open it
      if (clients.openWindow) {
        const url = notificationData.task_id 
          ? `/tasks/${notificationData.task_id}`
          : notificationData.url || '/notifications';
        return clients.openWindow(url);
      }
    })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
