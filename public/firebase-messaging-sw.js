importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// ⚠️ REPLACED: Service workers need hardcoded strings or a build-step
const firebaseConfig = {
    apiKey: "AIzaSyDRJ94g6qDBsRxt-22KOttwrACk4rW3WkY",
    authDomain: "carhire-75566.firebaseapp.com",
    projectId: "carhire-75566",
    storageBucket: "carhire-75566.firebasestorage.app",
    messagingSenderId: "103953800507",
    appId: "1:602060093536:web:af497b75905276f0452b05"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // Ensure this exists in your public folder
        data: { url: payload.data?.link || '/' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});