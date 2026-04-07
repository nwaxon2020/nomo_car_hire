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
import {
  handleGoogleAuthUnified,
  ensureNotificationFields,
} from "@/lib/authHelpers";

export default function LoginUi() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referralShortId = searchParams.get("ref");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false); // New state for resend button

  const [error, setError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [referrerData, setReferrerData] = useState<any>(null);

  const POINTS_PER_REFERRAL = 2;
  const POINTS_REQUIRED_PER_FREE_RIDE = 20;

  const exchangeTokenAndRedirect = async (userCredential: UserCredential) => {
    try {
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
      fcmToken: "",
      city: "",
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
            actionUrl: "/user/mobility/bookings"
          }),
          hasUnreadNotifications: true
        });
      }
    } catch (err) {
      console.error("Error awarding referral:", err);
    }
  };

  const ensureNotificationFields = async (userId: string, userData: any) => {
    await updateDoc(doc(db, "users", userId), {
      lastActive: serverTimestamp(),
      ...(!userData.hasOwnProperty('notificationEnabled') && {
        notificationEnabled: true,
        notifications: userData.notifications || [],
        hasUnreadNotifications: false,
        fcmToken: "",
        city: userData.city || "",
        rating: userData.rating || 0,
        totalTrips: userData.totalTrips || 0,
        earnings: userData.earnings || 0,
        preferences: userData.preferences || { theme: "light", language: "en", currency: "NGN" }
      })
    });
  };

  // --- FIXED RESEND LOGIC ---
  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setResending(true);
    try {
      // Reload user to ensure we have the latest state
      await user.reload();
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setVerificationMessage("Check your inbox! Verification email sent.");
      } else {
        setVerificationMessage("Email is already verified. Please login again.");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        setVerificationMessage("Too many attempts. Please wait a few minutes.");
      } else {
        setVerificationMessage("Failed to send. Try again later.");
      }
    } finally {
      setResending(false);
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
        setVerificationMessage("Your email is not verified yet.");
        setShowVerificationBanner(true);
        setLoadingLogin(false);
      } else {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          await ensureNotificationFields(user.uid, userData);
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

      // Use unified Google auth handler
      const authResult = await handleGoogleAuthUnified(result, referrerId, false);

      if (authResult.success) {
        // Ensure notification fields exist
        const userData = (await getDoc(doc(db, "users", result.user.uid))).data();
        if (userData) {
          await ensureNotificationFields(result.user.uid, userData);
        }
        await exchangeTokenAndRedirect(result);
      } else {
        setError(authResult.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError("Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 pt-0">
      <div className="bg-gray-50 shadow-xl rounded-lg md:rounded-2xl p-4 md:p-8 max-w-md w-full border border-gray-200">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 uppercase tracking-tighter">Welcome Back</h1>

        {referralShortId && referrerData && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800 text-center uppercase text-[10px] tracking-widest">
              🎁 Referral from {referrerData.fullName?.toUpperCase()}!
            </p>
          </div>
        )}

        {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl mb-4 text-center border border-red-400 font-bold text-[10px] uppercase tracking-widest">{error}</div>}

        {showVerificationBanner && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 flex flex-col items-start">
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{verificationMessage}</p>
            <button
              type="button"
              disabled={resending}
              onClick={handleResendVerification}
              className={`mt-2 text-[9px] font-black underline uppercase ${resending ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-700'}`}
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase text-xs font-bold bg-white" />

          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase text-xs font-bold bg-white" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 text-[10px] font-black uppercase hover:text-blue-600 transition">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex justify-end -mt-2">
            <Link href="/forgot-password" title="reset password link" className="text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" disabled={loadingLogin} className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition font-black uppercase tracking-widest flex items-center justify-center">
            {loadingLogin ? <LoadingRound /> : "Login"}
          </button>
        </form>

        <div className="text-[10px] text-center my-6 text-gray-400 font-black tracking-widest uppercase">OR</div>

        <button onClick={handleGoogleLogin} disabled={googleLoading} className="w-full bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-xl hover:border-red-400 transition font-black uppercase text-xs flex items-center justify-center gap-2">
          {googleLoading ? <LoadingRound /> : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
              Continue with Google
            </>
          )}
        </button>

        <p className="text-center text-[10px] mt-8 font-black text-gray-400 uppercase tracking-widest">
          Don't have an account?
          <Link href="/signup" className="text-blue-600 ml-2 font-black   hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}