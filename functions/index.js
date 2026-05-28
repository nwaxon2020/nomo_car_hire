const { onCall, HttpsError } = require("firebase-functions/v2/https");
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
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    
    const { featureName } = request.data;
    if (!featureName) throw new HttpsError("invalid-argument", "Missing featureName");

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
        throw new HttpsError(
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
        
        throw new HttpsError(
            "internal",
            error.message || "Deletion failed"
        );
        }
    }
);

/**
 * ── AWARD REFERRAL POINTS ──
 * Safely awards points to a referrer, bypassing client-side rules.
 */
exports.awardReferralPoints = onCall(async (request) => {
    // We only require the user to be authenticated
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");

    const { referrerFullId, newUserId } = request.data;
    if (!referrerFullId || !newUserId) {
        throw new HttpsError("invalid-argument", "Missing referrerFullId or newUserId");
    }

    const db = admin.firestore();
    const POINTS_PER_REFERRAL = 5;

    try {
        const referrerRef = db.collection("users").doc(referrerFullId);
        
        await db.runTransaction(async (transaction) => {
            const referrerSnap = await transaction.get(referrerRef);
            if (!referrerSnap.exists) return;

            const referrerData = referrerSnap.data();
            const isDriver = referrerData.isDriver || false;
            const currentPoints = (referrerData.referralPoints || 0) + POINTS_PER_REFERRAL;

            // Basic referral update
            transaction.update(referrerRef, {
                referrals: admin.firestore.FieldValue.arrayUnion({
                    userId: newUserId,
                    date: new Date().toISOString(),
                    points: POINTS_PER_REFERRAL,
                    status: "completed",
                }),
                referralPoints: admin.firestore.FieldValue.increment(POINTS_PER_REFERRAL),
                referralCount: admin.firestore.FieldValue.increment(1),
            });

            // Reward thresholds
            if (currentPoints >= 20 && currentPoints % 20 === 0) {
                if (isDriver) {
                    transaction.update(referrerRef, {
                        notifications: admin.firestore.FieldValue.arrayUnion({
                            id: Date.now().toString(),
                            type: "vip_earned",
                            title: "🌟 VIP Star Activated!",
                            message: "Your referrals earned you a VIP Star!",
                            timestamp: new Date().toISOString(),
                            read: false,
                            actionUrl: `/user/driver-profile/${referrerFullId}`,
                        }),
                        hasUnreadNotifications: true,
                    });
                } else {
                    const newFreeRideCount = (referrerData.freeRides || 0) + 1;
                    transaction.update(referrerRef, {
                        freeRides: newFreeRideCount,
                        lastFreeRideEarned: admin.firestore.FieldValue.serverTimestamp(),
                        notifications: admin.firestore.FieldValue.arrayUnion({
                            id: Date.now().toString(),
                            type: "free_ride_earned",
                            title: "🎉 Free ₦5,000 Ride Earned!",
                            message: `You earned a free ride! You now have ${newFreeRideCount} free ride(s).`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            actionUrl: "/user/mobility/car-hire",
                        }),
                        hasUnreadNotifications: true,
                    });
                }
            }
        });
        
        return { success: true };
    } catch (error) {
        logger.error("❌ Failed to award referral points:", error);
        throw new HttpsError("internal", "Failed to award referral points");
    }
});

/**
 * ── AUTO-CLEAR OLD TRIPS ──
 * Deletes trip documents older than 90 days every day at 1:00 AM.
 */
exports.autoClearOldTrips = onSchedule("0 1 * * *", async (event) => {
    logger.log("=== STARTING AUTO-CLEAR OLD TRIPS ===");
    const db = admin.firestore();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(ninetyDaysAgo);

    try {
        // Clear trips
        const tripSnapshot = await db.collection("trips")
            .where("updatedAt", "<", ninetyDaysAgoTimestamp)
            .limit(500)
            .get();

        if (!tripSnapshot.empty) {
            const batch = db.batch();
            tripSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            logger.log(`✅ Successfully cleared ${tripSnapshot.size} old trips.`);
        }

        // Clear direct offers
        const offerSnapshot = await db.collection("directOffers")
            .where("updatedAt", "<", ninetyDaysAgoTimestamp)
            .limit(500)
            .get();

        if (!offerSnapshot.empty) {
            const batch = db.batch();
            offerSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            logger.log(`✅ Successfully cleared ${offerSnapshot.size} old direct offers.`);
        }

    } catch (error) {
        logger.error("❌ Auto-clear old logs failed:", error);
    }
});