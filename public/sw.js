const CACHE_NAME = 'zentask-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-512.png'
];

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

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response
                const responseClone = response.clone();

                // Cache successful responses
                if (response.status === 200) {
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }

                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
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
    const action = event.action;

    // Handle different actions
    if (action === 'complete') {
        // Mark task as complete
        event.waitUntil(
            handleCompleteTask(notificationData.taskId)
        );
    } else if (action === 'snooze') {
        // Snooze notification
        event.waitUntil(
            handleSnoozeTask(notificationData.taskId)
        );
    } else {
        // Default action - open the app
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
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
    
    // Track dismissals for analytics
    const notificationData = event.notification.data || {};
    event.waitUntil(
        trackNotificationDismissal(notificationData)
    );
});

// Helper function to mark task as complete
async function handleCompleteTask(taskId) {
    if (!taskId) return;
    
    try {
        // This would call your API to mark the task complete
        // For now, just log it
        console.log('Marking task complete:', taskId);
        
        // You could use fetch to call your API here
        // await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
    } catch (error) {
        console.error('Error completing task:', error);
    }
}

// Helper function to snooze task
async function handleSnoozeTask(taskId) {
    if (!taskId) return;
    
    try {
        console.log('Snoozing task:', taskId);
        // Implementation would reschedule the notification
    } catch (error) {
        console.error('Error snoozing task:', error);
    }
}

// Helper function to track notification dismissal
async function trackNotificationDismissal(data) {
    try {
        console.log('Notification dismissed:', data);
        // Could send analytics here
    } catch (error) {
        console.error('Error tracking dismissal:', error);
    }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Push subscription changed:', event);
    
    event.waitUntil(
        // Resubscribe with new subscription
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(self.VAPID_PUBLIC_KEY)
        })
        .then((subscription) => {
            // Send new subscription to server
            return fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
        })
        .catch((error) => {
            console.error('Error resubscribing:', error);
        })
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
