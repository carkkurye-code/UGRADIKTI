// UĞRA Web Push Notification Service Worker Script
// Handles background push events and notification clicks

self.addEventListener('push', (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Fallback for plain text data
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'UĞRA';
  const options = {
    body: data.body || 'Zamanın sana kalsın!',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/favicon.svg',
    image: data.image || undefined,
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    tag: data.tag || 'ugra-notification',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there is already a window tab open with the same URL and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window client is open, open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
