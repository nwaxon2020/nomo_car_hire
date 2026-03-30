"use client";

import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, app } from "@/lib/firebaseConfig";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

export default function FcmTokenHandler() {
    useEffect(() => {
        // Listen for when the user logs in
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await setupNotifications(user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const setupNotifications = async (userId: string) => {
        try {
            const messaging = getMessaging(app);

            // 1. Request Permission from the browser
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                console.log("Notification permission denied.");
                return;
            }

            // 2. Get the Token using your VAPID KEY
            const currentToken = await getToken(messaging, {
                vapidKey: "PASTE_YOUR_VAPID_KEY_HERE", // <--- PASTE IT HERE
            });

            if (currentToken) {
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);

                // 3. Only update Firestore if the token has changed or is empty
                if (userSnap.exists() && userSnap.data().fcmToken !== currentToken) {
                    await updateDoc(userRef, {
                        fcmToken: currentToken,
                        notificationEnabled: true,
                    });
                    console.log("🚀 FCM Token saved to Firestore!");
                }
            }

            // 4. Listen for messages while the app is open (Foreground)
            onMessage(messaging, (payload) => {
                console.log("Message received: ", payload);
                // You could trigger a toast/alert here
                alert(`${payload.notification?.title}: ${payload.notification?.body}`);
            });

        } catch (error) {
            console.error("Error setting up FCM:", error);
        }
    };

    return null; // This component doesn't need to show anything on screen
}