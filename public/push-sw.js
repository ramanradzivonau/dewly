// Push handling, imported into the Workbox service worker (vite.config.ts → workbox.importScripts).

self.addEventListener('push', (event) => {
  let data = { title: 'Dewly', body: '', url: '/today' }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    // A push without a JSON payload still shows the default title.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data.url },
      tag: 'dewly-reminder',
    }),
  )
})

// A tap opens Today, reusing an open window when there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/today', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) return open.navigate(url).then((w) => (w ?? open).focus())
      return self.clients.openWindow(url)
    }),
  )
})
