const CACHE_NAME = 'zentask-v1';
const VAPID_CACHE_KEY = '/vapid-public-key';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-512.png'
];

// The page sends the VAPID public key here (the service worker cannot read
// build-time env vars). We keep it in memory AND in the cache so it survives
// service worker restarts and is available for pushsubscriptionchange.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_VAPID_KEY' && event.data.key) {
        self.vapidPublicKey = event.data.key;
        caches.open(CACHE_NAME).then((cache) => {
            cache.put(VAPID_CACHE_KEY, new Response(event.data.key));
        });
    }
});

async function getVapidPublicKey() {
    if (self.vapidPublicKey) return self.vapidPublicKey;
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(VAPID_CACHE_KEY);
        if (response) {
            const key = await response.text();
            if (key) self.vapidPublicKey = key;
        }
    } catch (error) {
        console.error('Error reading cached VAPID key:', error);
    }
    return self.vapidPublicKey || null;
}

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event for network requests
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const requestUrl = new URL(request.url);

    // Only handle GET, same-origin requests. The Cache API rejects 'put'
    // for POST/other methods and for non-http(s) schemes (e.g. chrome-extension).
    const isCacheableRequest =
        request.method === 'GET' &&
        requestUrl.protocol === 'https:' &&
        requestUrl.origin === self.location.origin;

    if (!isCacheableRequest) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone the response so we can cache it while returning the original
                const responseClone = response.clone();

                // Cache successful GET responses (best-effort)
                if (response.status === 200) {
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseClone))
                        .catch(() => {/* best-effort caching, ignore failures */});
                }

                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(request);
            })
    );
});

// =====================================================
// Push Notification Handlers
// =====================================================

// Listen for push events
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    let notificationData = {
        title: 'ZenTask Notification',
        body: 'You have a new notification',
        icon: '/icon-512.png',
        badge: '/icon-512.png',
        data: {}
    };

    // Parse push data if available
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = {
                title: payload.title || notificationData.title,
                body: payload.body || notificationData.body,
                icon: payload.icon || notificationData.icon,
                badge: payload.badge || notificationData.badge,
                tag: payload.tag,
                data: payload.data || {},
                actions: payload.actions || [],
                requireInteraction: payload.requireInteraction || false,
                silent: payload.silent || false
            };
        } catch (error) {
            console.error('Error parsing push data:', error);
            // Use text content as body if JSON parsing fails
            notificationData.body = event.data.text();
        }
    }

    // Show the notification
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data,
            actions: notificationData.actions,
            requireInteraction: notificationData.requireInteraction,
            silent: notificationData.silent,
            vibrate: [200, 100, 200],
            timestamp: Date.now()
        })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();

    const notificationData = event.notification.data || {};

    // Default action - open the app (optionally deep-linked to a task)
    const urlToOpen = notificationData.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus().then(() => {
                            // Navigate to the specific URL
                            if ('navigate' in client) {
                                return client.navigate(urlToOpen);
                            }
                        });
                    }
                }
                // If not open, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    // Track dismissals for analytics
    const notificationData = event.notification.data || {};
    console.log('Notification dismissed:', notificationData);
});

// Handle push subscription changes (browser rotated the subscription keys)
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Push subscription changed:', event);

    const oldSubscription = event.oldSubscription || null;

    event.waitUntil(
        (async () => {
            const applicationServerKey = await getVapidPublicKey();
            if (!applicationServerKey) {
                console.error('pushsubscriptionchange: no VAPID key available, cannot resubscribe');
                return;
            }

            try {
                // Resubscribe with the same application server key
                const subscription = await self.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
                });

                // Persist the new subscription server-side, keyed by the old endpoint
                const oldEndpoint = oldSubscription ? oldSubscription.endpoint : subscription.endpoint;
                await fetch('/api/push/resubscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        oldEndpoint,
                        subscription: subscription.toJSON()
                    })
                });
            } catch (error) {
                console.error('Error resubscribing:', error);
            }
        })()
    );
});

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
