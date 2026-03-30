import { db } from "./firebaseConfig";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

/** * This function handles BOTH:
 * 1. Saving to the user's notification list in Firestore (History)
 * 2. Sending a Push Notification (The "Ping")
 */
export const triggerNotification = async (
    userId: string,
    title: string,
    body: string,
    type: string = "info",
    link: string = "/",
    imageUrl: string | null = null,
    actionLabel: string = "View Details"
) => {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.warn(`User document for ${userId} does not exist.`);
            return;
        }

        const userData = userSnap.data();
        const fcmToken = userData.fcmToken;

        // --- STEP 1: Save to Firestore for the user's "History" ---
        const notificationObject = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            message: body,
            timestamp: new Date().toISOString(),
            read: false,
            favorite: false,
            type: type,
            actionUrl: link,
            actionLabel: actionLabel,
            image: imageUrl
        };

        await updateDoc(userRef, {
            notifications: arrayUnion(notificationObject),
            hasUnreadNotifications: true
        });

        // --- STEP 2: Send the Push Notification ---
        if (fcmToken) {
            console.log("Push Notification payload ready for token:", fcmToken);
            // This is where you'll eventually call your '/api/send-push' route
        }

    } catch (error) {
        console.error("Notification Error:", error);
    }
};