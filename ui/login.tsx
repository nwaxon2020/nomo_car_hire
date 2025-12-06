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
} from "firebase/firestore";
import axios from "axios";
import Link from "next/link";
import LoadingRound from "@/compoents/re-useable-loading";

export default function LoginUi() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referralShortId = searchParams.get("ref"); // ?ref=xxxxxxx

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

  // Referral constants
  const POINTS_PER_REFERRAL = 2;
  const POINTS_REQUIRED_PER_FREE_RIDE = 20;

  // Token exchange function from first code
  const exchangeTokenAndRedirect = async (userCredential: UserCredential) => {
    try {
      const idToken = await userCredential.user.getIdToken();
      await axios.post("/api/login", { idToken });
      router.push("/");
    } catch (err) {
      console.error("Token exchange error:", err);
      setError("Failed to establish a secure session.");
    }
  };

  // Error mapping function from first code
  const mapFirebaseError = (msg: string) => {
    if (msg.includes("auth/invalid-credential")) return "Invalid email or password.";
    if (msg.includes("auth/user-not-found")) return "No account found.";
    if (msg.includes("auth/wrong-password")) return "Wrong password.";
    if (msg.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
    return "Something went wrong.";
  };

  // FIND REFERRER
  useEffect(() => {
    if (referralShortId && referralShortId.length === 8) {
      findReferrerByShortId(referralShortId);
    }
  }, [referralShortId]);

  const findReferrerByShortId = async (shortId: string) => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      const refDoc = querySnapshot.docs.find((doc) =>
        doc.id.endsWith(shortId)
      );

      if (refDoc) {
        setReferrerId(refDoc.id);
        setReferrerData(refDoc.data());
      }
    } catch (error) {
      console.error("Error finding referrer:", error);
    }
  };

  // Get referral short ID
  const getReferralShortId = (uid: string) => uid.slice(-8);

  // Create clean user data
  const createUserData = (
    baseData: any,
    authType: string,
    referrerFullId: string | null
  ) => {
    const userShortId = getReferralShortId(baseData.uid);

    return {
      ...baseData,
      authType,
      createdAt: new Date(),

      // App Required Data
      isDriver: false,
      vip: false,
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
    };
  };

  // Award points to referrer
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
      const updatedPoints =
        (refData?.referralPoints || 0) + POINTS_PER_REFERRAL;

      if (updatedPoints % POINTS_REQUIRED_PER_FREE_RIDE === 0) {
        await updateDoc(doc(db, "users", referrerFullId), {
          freeRides: Math.floor(updatedPoints / POINTS_REQUIRED_PER_FREE_RIDE),
          lastFreeRideEarned: new Date(),
        });
      }
    } catch (err) {
      console.error("Error awarding referral:", err);
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        setVerificationMessage("Verification email sent! Please check your inbox.");
      } catch (error: any) {
        console.error("Error sending verification email:", error);
        setVerificationMessage(`Failed to send verification email: ${error.message}`);
      }
    }
  };

  // HANDLE EMAIL LOGIN (combined from both codes)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    setError("");
    setVerificationMessage("");
    setShowVerificationBanner(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if email is verified after login
      if (!user.emailVerified) {
        setVerificationMessage("Please verify your email address to continue.");
        setShowVerificationBanner(true);
        setLoadingLogin(false);
      } else {
        await exchangeTokenAndRedirect(userCredential);
      }
    } catch (err: any) {
      setError(mapFirebaseError(err.message));
      setLoadingLogin(false);
    }
  };

  // HANDLE GOOGLE LOGIN (combined from both codes)
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    setVerificationMessage("");
    setShowVerificationBanner(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      // If user doesn't exist, create new user with referral system
      if (!snap.exists()) {
        const baseData = {
          uid: user.uid,
          fullName: user.displayName || "Google User",
          email: user.email,
          profileImage: user.photoURL || "/profile.png",
          isDriver: false,
          vip: false,
        };

        const completeUserData = createUserData(
          baseData,
          "google",
          referrerId
        );

        await setDoc(userRef, completeUserData);

        if (referrerId) {
          await awardReferralPoints(referrerId, user.uid);
        }
      }

      // Exchange token and redirect
      await exchangeTokenAndRedirect(result);
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-gray-50 shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-200">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back</h1>

        {/* Regular error messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Email verification message - appears ONLY after login attempt with unverified email */}
        {showVerificationBanner && verificationMessage && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{verificationMessage}</p>
                {verificationMessage.includes("Please verify your email") && (
                  <button
                    onClick={handleResendVerification}
                    className="mt-2 text-sm font-medium text-yellow-700 hover:text-yellow-600 underline"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />

          {/* Password input with show/hide toggle from first code */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-600"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-semibold flex items-center justify-center"
          >
            {loadingLogin ? <LoadingRound /> : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="text-xs font-semibold text-center my-2 text-gray-500">OR</div>

        {/* GOOGLE LOGIN BUTTON */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition font-semibold flex items-center justify-center"
        >
          {googleLoading ? <LoadingRound /> : "Continue with Google"}
        </button>

        <p className="text-center text-sm mt-6">
          <Link href="/forgot-password" className="text-blue-700 hover:underline font-semibold">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm mt-4">
          Don't have an account?
          <Link href="/signup" className="text-purple-700 hover:underline font-semibold ml-1">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}