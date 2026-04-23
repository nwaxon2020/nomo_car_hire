import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";

const functions = getFunctions(app);

export const logFeatureUsage = async (featureName: "car-hire" | "transport-hub" | "load-booking" | "bookings" | "bookings-dashboard") => {
    try {
        const logEvent = httpsCallable(functions, 'logFeatureUsage');
        await logEvent({ featureName });
        console.log(`[Analytics] Logged usage for: ${featureName}`);
    } catch (error) {
        console.error("[Analytics] Error logging usage:", error);
    }
};
