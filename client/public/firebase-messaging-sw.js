
/* global importScripts, firebase */

importScripts(
  'https://www.gstatic.com/firebasejs/13.3.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/13.3.0/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: "AIzaSyAF-LNNE1lK7XuLojby6hlrjkRtLa6kotE",
  authDomain: "dine-cloud-e8e73.firebaseapp.com",
  projectId: "dine-cloud-e8e73",
  storageBucket: "dine-cloud-e8e73.firebasestorage.app",
  messagingSenderId: "684625683838",
  appId: "1:684625683838:web:07257e12570d66c9a2bf2f"
});

const messaging = firebase.messaging();

console.info('[FCM CLIENT] Messaging service worker initialized.');

messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    'DineCloud Order Update';

  const options = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      'Your order status has changed.',
    icon: '/favicon.svg',
    data: payload.data || {},
    tag:
      payload.data?.eventId ||
      `${payload.data?.orderId || 'order'}:${payload.data?.status || 'update'}`,
  };

  console.info('[FCM CLIENT] Background message received.', {
    orderId: payload.data?.orderId,
    status: payload.data?.status,
    data: {
      title: payload.data?.title,
      body: payload.data?.body,
      url: payload.data?.url,
      eventId: payload.data?.eventId,
    },
  });
  console.info('[FCM CLIENT] Background showNotification() attempted.', {
    orderId: payload.data?.orderId,
    status: payload.data?.status,
  });

  return self.registration.showNotification(title, options)
    .then(() => {
      console.info('[FCM CLIENT] Background notification displayed.', {
        orderId: payload.data?.orderId,
        status: payload.data?.status,
      });
    })
    .catch((error) => {
      console.error('[FCM CLIENT] Background notification display failed.', {
        name: error.name,
        code: error.code,
        message: error.message,
      });
      throw error;
    });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const requestedUrl = event.notification.data?.url || '/track-order';
  let targetUrl = new URL(requestedUrl, self.location.origin);
  if (
    targetUrl.origin !== self.location.origin ||
    targetUrl.pathname !== '/track-order'
  ) {
    targetUrl = new URL('/track-order', self.location.origin);
  }

  console.info('[FCM CLIENT] Notification clicked.', {
    orderId: event.notification.data?.orderId,
    status: event.notification.data?.status,
    targetPath: targetUrl.pathname,
  });

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    const existingWindow = windows.find((client) => (
      new URL(client.url).origin === self.location.origin
    ));

    if (existingWindow) {
      await existingWindow.navigate(targetUrl.href);
      await existingWindow.focus();
      return;
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});
