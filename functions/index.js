const { onCall } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

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