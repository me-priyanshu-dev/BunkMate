
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Push events (Foundation for Web Push)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'BunkMate Update';
  const options = {
    body: data.body || 'New activity in your squad.',
    icon: 'https://cdn-icons-png.flaticon.com/512/2983/2983911.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/2983/2983911.png',
    vibrate: [100, 50, 100],
    data: {
      url: self.registration.scope
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Clicks (Open/Focus App)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
