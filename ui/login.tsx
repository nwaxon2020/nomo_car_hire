"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, googleProvider, db } from "@/lib/firebaseConfig";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  UserCredential
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
  collection,
  getDocs,
  serverTimestamp 
} from "firebase/firestore";
import Link from "next/link";
import LoadingRound from "@/components/re-useable-loading";

export default function LoginUi() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referralShortId = searchParams.get("ref");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [error, setError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referrerData, setReferrerData] = useState<any>(null);

  const POINTS_PER_REFERRAL = 2;
  const POINTS_REQUIRED_PER_FREE_RIDE = 20;

  // FIXED: Using window.location.href to force a clean session load
  const exchangeTokenAndRedirect = async (userCredential: UserCredential) => {
    try {
      // Firebase Client SDK handles the session automatically in the browser.
      // Forced refresh ensures all layouts and components recognize the new user.
      window.location.href = "/";
    } catch (err) {
      console.error("Redirect error:", err);
      setError("Login successful, but redirect failed.");
    }
  };

  const mapFirebaseError = (msg: string) => {
    if (msg.includes("auth/invalid-credential")) return "Invalid email or password.";
    if (msg.includes("auth/user-not-found")) return "No account found.";
    if (msg.includes("auth/wrong-password")) return "Wrong password.";
    if (msg.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
    return "Something went wrong.";
  };

  useEffect(() => {
    if (referralShortId && referralShortId.length === 8) {
      findReferrerByShortId(referralShortId);
    }
  }, [referralShortId]);

  const findReferrerByShortId = async (shortId: string) => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const refDoc = querySnapshot.docs.find((doc) => doc.id.endsWith(shortId));

      if (refDoc) {
        setReferrerId(refDoc.id);
        setReferrerData(refDoc.data());
      }
    } catch (error) {
      console.error("Error finding referrer:", error);
    }
  };

  const getReferralShortId = (uid: string) => uid.slice(-8);

  const createUserData = (baseData: any, authType: string, referrerFullId: string | null) => {
    const userShortId = getReferralShortId(baseData.uid);
    return {
      ...baseData,
      authType,
      createdAt: serverTimestamp(),
      isDriver: false,
      vip: false,
      hiredCars: [],
      contactedDrivers: [],
      referralShortId: userShortId,
      referredBy: referrerFullId,
      referralPoints: 0,
      referrals: [],
      referralCount: 0,
      freeRides: 0,
      lastFreeRideEarned: null,
      totalPointsEarned: 0,
      notificationEnabled: true,
      notifications: [],
      hasUnreadNotifications: false,
      lastNotification: null,
      fcmToken: "",
      city: "",
      phone: "",
      rating: 0,
      totalTrips: 0,
      earnings: 0,
      isEmailVerified: authType === "google" ? true : false,
      lastActive: serverTimestamp(),
      preferences: { theme: "light", language: "en", currency: "NGN" }
    };
  };

  const awardReferralPoints = async (referrerFullId: string, newUserId: string) => {
    try {
      await updateDoc(doc(db, "users", referrerFullId), {
        referrals: arrayUnion({
          userId: newUserId,
          date: new Date(),
          points: POINTS_PER_REFERRAL,
          status: "completed",
        }),
        referralPoints: increment(POINTS_PER_REFERRAL),
        referralCount: increment(1),
      });

      const refDoc = await getDoc(doc(db, "users", referrerFullId));
      const refData = refDoc.data();
      const updatedPoints = (refData?.referralPoints || 0) + POINTS_PER_REFERRAL;

      if (updatedPoints % POINTS_REQUIRED_PER_FREE_RIDE === 0) {
        const freeRides = Math.floor(updatedPoints / POINTS_REQUIRED_PER_FREE_RIDE);
        await updateDoc(doc(db, "users", referrerFullId), {
          freeRides: freeRides,
          lastFreeRideEarned: new Date(),
          notifications: arrayUnion({
            id: Date.now().toString(),
            type: "free_ride_earned",
            title: "🎉 Free Ride Earned!",
            message: `You earned a free ride! You now have ${freeRides} free ride(s).`,
            timestamp: new Date().toISOString(),
            read: false,
            actionUrl: "/user/bookings"
          }),
          hasUnreadNotifications: true
        });
      }
    } catch (err) {
      console.error("Error awarding referral:", err);
    }
  };

  const ensureNotificationFields = async (userId: string, userData: any) => {
    if (!userData.hasOwnProperty('notificationEnabled')) {
      await updateDoc(doc(db, "users", userId), {
        notificationEnabled: true,
        notifications: userData.notifications || [],
        hasUnreadNotifications: false,
        lastNotification: null,
        fcmToken: "",
        lastActive: serverTimestamp(),
        city: userData.city || "",
        phone: userData.phone || "",
        rating: userData.rating || 0,
        totalTrips: userData.totalTrips || 0,
        earnings: userData.earnings || 0,
        preferences: userData.preferences || { theme: "light", language: "en", currency: "NGN" }
      });
    }
  };

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        setVerificationMessage("Verification email sent!");
      } catch (error: any) {
        setVerificationMessage("Failed to send verification email.");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    setError("");
    setVerificationMessage("");
    setShowVerificationBanner(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        setVerificationMessage("Please verify your email address.");
        setShowVerificationBanner(true);
        setLoadingLogin(false);
      } else {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          await ensureNotificationFields(user.uid, userDoc.data());
          await updateDoc(userRef, {
            lastActive: serverTimestamp(),
            notifications: arrayUnion({
              id: Date.now().toString(),
              type: "login",
              title: "👋 Welcome Back!",
              message: `Logged in at ${new Date().toLocaleTimeString()}`,
              timestamp: new Date().toISOString(),
              read: false,
              actionUrl: "/"
            }),
            hasUnreadNotifications: true
          });
        }
        await exchangeTokenAndRedirect(userCredential);
      }
    } catch (err: any) {
      setError(mapFirebaseError(err.message));
      setLoadingLogin(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const completeUserData = createUserData({
          uid: user.uid,
          fullName: user.displayName || "Google User",
          email: user.email,
          profileImage: user.photoURL || "/profile.png",
          isEmailVerified: true,
        }, "google", referrerId);

        await setDoc(userRef, completeUserData);
        if (referrerId) await awardReferralPoints(referrerId, user.uid);
      } else {
        await ensureNotificationFields(user.uid, snap.data());
        await updateDoc(userRef, { lastActive: serverTimestamp() });
      }

      await exchangeTokenAndRedirect(result);
    } catch (err: any) {
      setError("Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-gray-50 shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-200">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back</h1>

        {referralShortId && referrerData && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800 text-center">
              🎁 Referral from {referrerData.fullName?.toUpperCase()}!
            </p>
          </div>
        )}

        {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl mb-4 text-center border border-red-400">{error}</div>}

        {showVerificationBanner && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-yellow-700">{verificationMessage}</p>
            <button onClick={handleResendVerification} className="mt-2 text-sm font-medium underline">Resend email</button>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500" />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-600">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" disabled={loadingLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-semibold flex items-center justify-center">
            {loadingLogin ? <LoadingRound /> : "Login"}
          </button>
        </form>

        <div className="text-xs text-center my-4 text-gray-500">OR</div>

        <button onClick={handleGoogleLogin} disabled={googleLoading} className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition font-semibold flex items-center justify-center">
          {googleLoading ? <LoadingRound /> : "Continue with Google"}
        </button>

        <p className="text-center text-sm mt-6">
          <Link href="/signup" className="text-purple-700 hover:underline font-semibold ml-1">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}