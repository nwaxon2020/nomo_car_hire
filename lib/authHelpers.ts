"use client";

import { UserCredential } from "firebase/auth";
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

const POINTS_PER_REFERRAL = 2;
const POINTS_REQUIRED_PER_FREE_RIDE = 20;

/**
 * Get dynamic welcome note from Firestore settings
 */
export const getDynamicWelcomeNote = async (userName: string) => {
  try {
    const settingsSnap = await getDoc(doc(db, "settings", "notifications"));
    const firstName = userName.split(" ")[0];

    if (settingsSnap.exists() && settingsSnap.data().welcomeNote) {
      const savedNote = settingsSnap.data().welcomeNote;
      return {
        id: `welcome-${Date.now()}`,
        type: "welcome",
        title: (savedNote.title || "Welcome").replace("[NAME]", firstName),
        message: (savedNote.message || "").replace("[NAME]", firstName),
        actionUrl: savedNote.link || "/user/profile",
        actionLabel: savedNote.actionLabel || "View Details",
        message2: (savedNote.message2 || "").replace("[NAME]", firstName),
        actionUrl2: savedNote.link2 || null,
        actionLabel2: savedNote.actionLabel2 || null,
        image: savedNote.imageUrl || null,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }
    return null;
  } catch (e) {
    console.error("Error fetching welcome settings:", e);
    return null;
  }
};

/**
 * Get referral short ID from user UID
 */
export const getReferralShortId = (userId: string) => userId.slice(-8);

/**
 * Create complete user data object with all required fields
 */
export const createUserData = (
  baseData: any,
  authType: "email" | "google",
  referrerFullId: string | null,
  welcomeNote: any
) => {
  const userShortId = getReferralShortId(baseData.uid || "");

  return {
    // Base user info
    uid: baseData.uid,
    fullName: baseData.fullName,
    email: baseData.email,
    profileImage: baseData.profileImage,
    phoneNumber: baseData.phoneNumber || "",
    city: baseData.city || "",

    // Auth info
    authType,
    isEmailVerified: authType === "google" ? true : false,

    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActive: serverTimestamp(),

    // Driver info
    isDriver: false,
    vip: false,
    verified: false,
    rating: 0,
    totalTrips: 0,
    earnings: 0,

    // User activity
    hiredCars: [],
    contactedDrivers: [],

    // Referral system
    referralShortId: userShortId,
    referredBy: referrerFullId,
    referralPoints: 0,
    referrals: [],
    referralCount: 0,
    freeRides: 0,
    lastFreeRideEarned: null,
    totalPointsEarned: 0,

    // Notifications
    notificationEnabled: true,
    notifications: welcomeNote ? [welcomeNote] : [],
    hasUnreadNotifications: welcomeNote ? true : false,
    fcmToken: "",

    // Preferences
    preferences: { theme: "light", language: "en", currency: "NGN" },
  };
};

/**
 * Award referral points to a referrer
 */
export const awardReferralPoints = async (
  referrerFullId: string,
  newUserId: string
) => {
  try {
    const referrerRef = doc(db, "users", referrerFullId);
    const referrerSnap = await getDoc(referrerRef);

    if (!referrerSnap.exists()) return;

    const referrerData = referrerSnap.data();
    const isDriver = referrerData.isDriver || false;
    const currentPoints =
      (referrerData.referralPoints || 0) + POINTS_PER_REFERRAL;

    await updateDoc(referrerRef, {
      referrals: arrayUnion({
        userId: newUserId,
        date: new Date().toISOString(),
        points: POINTS_PER_REFERRAL,
        status: "completed",
      }),
      referralPoints: increment(POINTS_PER_REFERRAL),
      referralCount: increment(1),
    });

    if (currentPoints >= 20 && currentPoints % 20 === 0) {
      if (isDriver) {
        await updateDoc(referrerRef, {
          notifications: arrayUnion({
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
        await updateDoc(referrerRef, {
          freeRides: newFreeRideCount,
          lastFreeRideEarned: new Date(),
          notifications: arrayUnion({
            id: Date.now().toString(),
            type: "free_ride_earned",
            title: "🎉 Free ₦5,000 Ride Earned!",
            message: `You earned a free ride! You now have ${newFreeRideCount} free ride(s).`,
            timestamp: new Date().toISOString(),
            read: false,
            actionUrl: "/user/bookings",
          }),
          hasUnreadNotifications: true,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error awarding points:", error);
  }
};

/**
 * Ensure user has all required notification fields
 */
export const ensureNotificationFields = async (userId: string, userData: any) => {
  const updates: any = {
    lastActive: serverTimestamp(),
  };

  // Add missing fields
  if (!userData.hasOwnProperty("notificationEnabled")) {
    updates.notificationEnabled = true;
  }
  if (!userData.hasOwnProperty("notifications")) {
    updates.notifications = [];
  }
  if (!userData.hasOwnProperty("hasUnreadNotifications")) {
    updates.hasUnreadNotifications = false;
  }
  if (!userData.hasOwnProperty("fcmToken")) {
    updates.fcmToken = "";
  }
  if (!userData.hasOwnProperty("preferences")) {
    updates.preferences = { theme: "light", language: "en", currency: "NGN" };
  }

  if (Object.keys(updates).length > 1) {
    await updateDoc(doc(db, "users", userId), updates);
  }
};

/**
 * UNIFIED HANDLER: Google Authentication (works for both signup and login)
 * 
 * This handles all Google auth scenarios:
 * 1. First time user (no data in Firestore) → Create complete profile WITH welcome note
 * 2. Returning user (data exists) → Update lastActive and sync fields (NO new welcome note)
 * 3. Referral bonus handling
 * 
 * ⚠️ IMPORTANT: Welcome note is ONLY created for NEW users, NOT on subsequent logins
 */
export const handleGoogleAuthUnified = async (
  userCredential: UserCredential,
  referrerId: string | null = null,
  isSignup: boolean = true
): Promise<{
  success: boolean;
  message: string;
  userExists: boolean;
}> => {
  try {
    const user = userCredential.user;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // ✅ FIRST TIME USER: Create complete profile WITH welcome note
    if (!snap.exists()) {
      // Fetch dynamic welcome note ONLY for new users
      const welcomeNote = await getDynamicWelcomeNote(
        user.displayName || "User"
      );

      // Create complete user data WITH welcome note
      const baseData = {
        uid: user.uid,
        fullName: user.displayName || "Google User",
        email: user.email,
        profileImage: user.photoURL || "/profile.png",
      };

      const completeUserData = createUserData(
        baseData,
        "google",
        referrerId,
        welcomeNote // ✅ Welcome note ONLY here for new users
      );

      // Save to Firestore
      await setDoc(userRef, completeUserData);

      // Award referral points if applicable
      if (referrerId) {
        await awardReferralPoints(referrerId, user.uid);
      }

      return {
        success: true,
        message: "User profile created successfully",
        userExists: false,
      };
    }

    // ✅ RETURNING USER: Sync data but NO new welcome note
    const userData = snap.data();

    // Ensure all notification fields exist (does NOT add welcome notes)
    await ensureNotificationFields(user.uid, userData);

    // Sync profile info from Google if changed
    const updates: any = {
      lastActive: serverTimestamp(),
    };

    // Update name if different and not empty
    if (
      user.displayName &&
      user.displayName !== userData.fullName &&
      user.displayName.trim()
    ) {
      updates.fullName = user.displayName;
    }

    // Update email if different
    if (user.email && user.email !== userData.email) {
      updates.email = user.email;
    }

    // Update profile photo if available and different
    if (
      user.photoURL &&
      user.photoURL !== userData.profileImage &&
      !userData.profileImage?.includes("profile.png")
    ) {
      updates.profileImage = user.photoURL;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 1) {
      await updateDoc(userRef, updates);
    }

    return {
      success: true,
      message: "User authenticated successfully",
      userExists: true,
    };
  } catch (error: any) {
    console.error("Google auth error:", error);
    return {
      success: false,
      message: error.message || "Google authentication failed",
      userExists: false,
    };
  }
};

/**
 * Find referrer by short ID (last 8 chars of UID)
 */
export const findReferrerByShortId = async (
  shortId: string
): Promise<{ referrerId: string | null; referrerData: any }> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralShortId", "==", shortId), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const referrerDoc = querySnapshot.docs[0];
      return {
        referrerId: referrerDoc.id,
        referrerData: referrerDoc.data(),
      };
    }

    return { referrerId: null, referrerData: null };
  } catch (error) {
    console.error("Error finding referrer:", error);
    return { referrerId: null, referrerData: null };
  }
};
