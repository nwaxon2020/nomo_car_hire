import { db } from "./firebaseConfig";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

/** * Handles saving to the user's notification list in Firestore 
 * and supports dual-action messages (like the Welcome Note).
 */
export const triggerNotification = async (
    userId: string,
    title: string,
    body: string,
    type: string = "info",
    link: string = "/",
    imageUrl: string | null = null, // Ensure null is accepted
    actionLabel: string = "View Details",
    message2: string | null = null,
    link2: string | null = null,
    actionLabel2: string | null = null
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
            message2: message2, // Added
            timestamp: new Date().toISOString(),
            read: false,
            favorite: false,
            type: type,
            actionUrl: link,
            actionLabel: actionLabel,
            actionUrl2: link2, // Added
            actionLabel2: actionLabel2, // Added
            image: imageUrl
        };

        await updateDoc(userRef, {
            notifications: arrayUnion(notificationObject),
            hasUnreadNotifications: true
        });

        // --- STEP 2: Send the Push Notification ---
        if (fcmToken) {
            console.log("Push Notification payload ready for token:", fcmToken);
        }

    } catch (error) {
        console.error("Notification Error:", error);
    }
};