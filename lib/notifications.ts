import { db } from "./firebaseConfig";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

/** Notification structure */
export interface NotificationData {
    id: string;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "money" | "safety";
    read: boolean;
    timestamp: string;
    actionUrl: string;
}

/** Money opportunity structure */
export interface MoneyOpportunity {
    details: string;
    amount: string | number;
}

/** Send notification to a user */
export const sendNotification = async (
    userId: string,
    title: string,
    message: string,
    type: NotificationData["type"] = "info"
    ): Promise<void> => {
    try {
        const userRef = doc(db, "users", userId);

        const notification: NotificationData = {
        id: Date.now().toString(),
        title,
        message,
        type,
        read: false,
        timestamp: new Date().toISOString(),
        actionUrl:
            type === "money"
            ? "/user/driver-dashboard"
            : "/user/notifications"
        };

        await updateDoc(userRef, {
        notifications: arrayUnion(notification),
        hasUnreadNotifications: true,
        lastNotification: new Date().toISOString()
        });

        console.log(`Notification sent to ${userId}: ${title}`);

        // Future push notification logic here
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

/** Send money opportunity alert to driver */
export const sendMoneyOpportunityAlert = async (
    driverId: string,
    opportunity: MoneyOpportunity
    ): Promise<void> => {
    const title = "💰 Money Opportunity!";
    const message = `New booking request: ${opportunity.details}. Potential earnings: ${opportunity.amount}`;

    await sendNotification(driverId, title, message, "money");
};

/** Send safety reminder */
export const sendSafetyReminder = async (
    userId: string,
    context: string
    ): Promise<void> => {
    const reminders: string[] = [
        "🔒 Always meet in public places like petrol stations",
        "📝 Check car papers and insurance before payment",
        "💰 Agree on price before starting the trip",
        "📱 Save chat history for reference",
        "👥 Tell someone about your trip details",
        "🚗 Inspect the car for any damages before accepting"
    ];

    const randomReminder =
        reminders[Math.floor(Math.random() * reminders.length)];

    await sendNotification(
        userId,
        "Safety Reminder",
        `${randomReminder} (${context})`,
        "safety"
    );
};
