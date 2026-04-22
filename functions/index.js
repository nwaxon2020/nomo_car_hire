const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * ── MONTHLY TRUST RESET ──
 * Resets all user trust scores to 100% on the 1st of every month.
 */
exports.resetMonthlyTrust = onSchedule("0 0 1 * *", async (event) => {
    logger.log("=== STARTING MONTHLY TRUST RESET ===");
    const db = admin.firestore();
    const usersRef = db.collection("users");
    
    try {
        const snapshot = await usersRef.where("isDriver", "==", true).get();
        if (snapshot.empty) {
            logger.log("No drivers found to reset.");
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                trustScore: 100,
                trustCancels: 0,
                trustLastReset: admin.firestore.FieldValue.serverTimestamp(),
                trustExhaustedAt: null,
                loadOnceAllowed: false,
                loadOnceUsedDate: null,
                loadBlockedUntil: null,
            });
        });

        await batch.commit();
        logger.log(`✅ Successfully reset trust for ${snapshot.size} drivers.`);
    } catch (error) {
        logger.error("❌ Monthly trust reset failed:", error);
    }
});

/**
 * ── MAINTENANCE MODE START (Sunday 12:00 AM) ──
 */
exports.startMaintenanceMode = onSchedule("0 0 * * 0", async (event) => {
    logger.log("=== ENABLING MAINTENANCE MODE ===");
    const db = admin.firestore();
    try {
        await db.collection("config").doc("mobility").set({
            isMaintenance: true,
            maintenanceMessage: "Weekly server optimization in progress.",
            reopensAt: "6:00 PM Today",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        logger.log("✅ Maintenance mode enabled.");
    } catch (error) {
        logger.error("❌ Failed to enable maintenance mode:", error);
    }
});

/**
 * ── MAINTENANCE MODE END (Sunday 6:00 PM) ──
 */
exports.endMaintenanceMode = onSchedule("0 18 * * 0", async (event) => {
    logger.log("=== DISABLING MAINTENANCE MODE ===");
    const db = admin.firestore();
    try {
        await db.collection("config").doc("mobility").set({
            isMaintenance: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        logger.log("✅ Maintenance mode disabled.");
    } catch (error) {
        logger.error("❌ Failed to disable maintenance mode:", error);
    }
});

/**
 * ── FEATURE USAGE ANALYTICS ──
 * Logs whenever a user accesses a major feature.
 */
exports.logFeatureUsage = onCall(async (request) => {
    if (!request.auth) throw new Error("Unauthenticated");
    
    const { featureName } = request.data;
    if (!featureName) throw new Error("Missing featureName");

    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    try {
        const analyticsRef = db.collection("analytics").doc("features").collection(today).doc(featureName);
        await analyticsRef.set({
            count: admin.firestore.FieldValue.increment(1),
            lastAccessed: admin.firestore.FieldValue.serverTimestamp(),
            feature: featureName
        }, { merge: true });
        
        return { success: true };
    } catch (error) {
        logger.error("❌ Analytics logging failed:", error);
        return { success: false };
    }
});

exports.deleteUserAndData = onCall(
    {
        region: "us-central1",
        timeoutSeconds: 120,
        memory: "512MB",
    },
    async (request) => {
        logger.log("=== DELETE FUNCTION CALLED ===");

        // Authentication check
        if (!request.auth) {
        logger.error("❌ NO AUTH - returning 401");
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Authentication required"
        );
        }

        const userId = request.auth.uid;
        const userEmail = request.auth.token.email || "unknown";
        logger.log(`✅ User authenticated: ${userId} (${userEmail})`);

        try {
        const db = admin.firestore();
        const auth = admin.auth();

        // 1. DELETE USER FROM FIREBASE AUTHENTICATION (CRITICAL)
        logger.log(`🗑️ Deleting user from Firebase Auth: ${userId}`);
        await auth.deleteUser(userId);
        logger.log("✅ User deleted from Firebase Auth");

        // 2. Delete user document from Firestore
        const userRef = db.collection("users").doc(userId);
        await userRef.delete();
        logger.log("✅ User document deleted from Firestore");

        // 3. Delete from other collections
        const collections = [
            { name: "bookingRequests", field: "userId" },
            { name: "generalSiteReviews", field: "userId" },
            { name: "preChats", field: "userId" },
            { name: "vehicleLog", field: "driverId" },
        ];

        let totalDeleted = 1; // Start with user document

        for (const collection of collections) {
            const querySnapshot = await db
            .collection(collection.name)
            .where(collection.field, "==", userId)
            .get();

            if (!querySnapshot.empty) {
            const batch = db.batch();
            querySnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
                totalDeleted++;
            });
            await batch.commit();
            logger.log(
                `✅ Deleted ${querySnapshot.size} documents from ${collection.name}`
            );
            }
        }

        logger.log(`🎯 Total documents deleted: ${totalDeleted}`);

        return {
            success: true,
            message: "Account and ALL data permanently deleted",
            stats: {
            userId: userId,
            userEmail: userEmail,
            firestoreDocuments: totalDeleted,
            authUserDeleted: true, // Added this flag
            timestamp: new Date().toISOString(),
            },
        };
        } catch (error) {
        logger.error("💥 Error:", error);
        
        // Check if it's an auth deletion error
        if (error.code === 'auth/user-not-found') {
            logger.warn("⚠️ User already deleted from Auth, continuing with data cleanup");
            // Continue with Firestore deletion even if auth user is gone
            // ... add your Firestore deletion logic here
        }
        
        throw new functions.https.HttpsError(
            "internal",
            error.message || "Deletion failed"
        );
        }
    }
);