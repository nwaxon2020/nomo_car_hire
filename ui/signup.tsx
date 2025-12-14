"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, googleProvider, db, storage } from "@/lib/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import { 
  setDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  increment,
  collection,
  getDocs,
  serverTimestamp // ← ADDED THIS IMPORT
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import LoadingRound from "@/components/re-useable-loading";

export default function SignUpUi() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralShortId = searchParams.get("ref"); // Last 8 chars of referrer's UID

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referrerData, setReferrerData] = useState<any>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  // Constants for referral system
  const POINTS_PER_REFERRAL = 2;
  const POINTS_REQUIRED_PER_FREE_RIDE = 20; // Changed from 10 to 20

  // Find referrer by short ID (last 8 chars of their UID)
  useEffect(() => {
    if (referralShortId && referralShortId.length === 8) {
      findReferrerByShortId(referralShortId);
    }
  }, [referralShortId]);

  // ✅ FIXED: Accept referralShortId as parameter to avoid TypeScript issues
  const findReferrerByShortId = async (shortId: string) => {
    try {
      console.log(`🔍 Looking for referrer with short ID: ${shortId}`);
      
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      
      // Find user whose UID ends with the short ID
      const referrerDoc = querySnapshot.docs.find(doc => 
        doc.id.endsWith(shortId)
      );
      
      if (referrerDoc) {
        const data = referrerDoc.data();
        setReferrerData(data);
        setReferrerId(referrerDoc.id); // Store the full referrer UID
        console.log(`✅ Found referrer: ${data.fullName} (UID: ${referrerDoc.id})`);
      } else {
        console.log(`❌ No user found ending with: ${shortId}`);
      }
    } catch (error) {
      console.error("Error finding referrer:", error);
    }
  };

  const validatePassword = (pwd: string) => /^(?=.*[0-9]).{8,}$/.test(pwd);

  const mapFirebaseError = (msg: string) => {
    if (msg.includes("auth/email-already-in-use"))
      return "This email is already in use.";
    if (msg.includes("auth/invalid-email"))
      return "Please enter a valid email address.";
    if (msg.includes("auth/weak-password"))
      return "Password should be at least 8 characters and include a number.";
    return "Something went wrong. Please try again.";
  };

  // ✅ Award referral points using referrer's FULL UID - UPDATED FOR 20 POINTS PER FREE RIDE
  const awardReferralPoints = async (referrerFullId: string, newUserId: string) => {
    try {
      console.log(`🎯 Awarding ${POINTS_PER_REFERRAL} points to: ${referrerFullId} from new user: ${newUserId}`);
      
      // Update referrer's document
      await updateDoc(doc(db, "users", referrerFullId), {
        referrals: arrayUnion({
          userId: newUserId,
          date: new Date(),
          points: POINTS_PER_REFERRAL,
          status: "completed"
        }),
        referralPoints: increment(POINTS_PER_REFERRAL),
        referralCount: increment(1),
      });

      // Check if referrer earned a free ride (20 points required)
      const referrerRef = doc(db, "users", referrerFullId);
      const referrerSnap = await getDoc(referrerRef);
      
      if (referrerSnap.exists()) {
        const referrerData = referrerSnap.data();
        const currentPoints = (referrerData.referralPoints || 0) + POINTS_PER_REFERRAL;
        // CHANGED: Now requires 20 points per free ride instead of 10
        const freeRides = Math.floor(currentPoints / POINTS_REQUIRED_PER_FREE_RIDE);
        
        // CHANGED: Check for 20 points threshold instead of 10
        if (currentPoints >= POINTS_REQUIRED_PER_FREE_RIDE && 
            currentPoints % POINTS_REQUIRED_PER_FREE_RIDE === 0) {
          await updateDoc(doc(db, "users", referrerFullId), {
            freeRides: freeRides,
            lastFreeRideEarned: new Date(),
          });
          
          // ADDED: Notification for free ride earned
          await updateDoc(doc(db, "users", referrerFullId), {
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
          
          console.log(`🏆 ${referrerData.fullName} earned a free ride at ${currentPoints} points! Total free rides: ${freeRides}`);
        } else {
          console.log(`📊 ${referrerData.fullName} now has ${currentPoints} points. Need ${POINTS_REQUIRED_PER_FREE_RIDE - (currentPoints % POINTS_REQUIRED_PER_FREE_RIDE)} more for next free ride.`);
        }
      }
      
      console.log(`✅ Points awarded successfully`);
      return true;
    } catch (error) {
      console.error("❌ Error awarding points:", error);
      return false;
    }
  };

  // ✅ Get last 8 chars of UID for user's referral short ID
  const getReferralShortId = (userId: string) => {
    return userId.slice(-8); // Last 8 characters are usually unique
  };

  // ✅ Common user data structure - UPDATED WITH NOTIFICATION FIELDS
  const createUserData = (baseData: any, authType: string, referrerFullId: string | null) => {
    const userShortId = getReferralShortId(baseData.uid || '');
    
    return {
      ...baseData,
      authType,
      createdAt: serverTimestamp(), // ← CHANGED: Using serverTimestamp
      hiredCars: [],
      contactedDrivers: [],
      
      // REFERRAL FIELDS
      referralShortId: userShortId, // Their own short ID for sharing
      referredBy: referrerFullId, // Who referred them (full UID)
      referralPoints: 0, // Points THEY earn from THEIR referrals
      referrals: [], // People THEY refer
      referralCount: 0,
      freeRides: 0,
      lastFreeRideEarned: null,
      totalPointsEarned: 0,

      // NEW: NOTIFICATION FIELDS ← ADDED THESE
      notificationEnabled: true, // Default to enabled
      notifications: [], // Empty array for notifications
      hasUnreadNotifications: false,
      lastNotification: null,
      fcmToken: "", // Will be set when they enable push notifications
      
      // NEW: PROFILE FIELDS ← ADDED THESE
      city: "", // Empty by default
      phone: "", // Will be added later
      rating: 0, // For drivers
      totalTrips: 0, // For drivers
      earnings: 0, // For drivers
      isEmailVerified: false, // Will be true after verification
      lastActive: serverTimestamp(),
      
      // For future use
      preferences: {
        theme: "light",
        language: "en",
        currency: "NGN"
      }
    };
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setMessage("");

    if (!profileImage) return setMessage("⚠️ Profile image is required.");
    if (!fullName.trim()) return setMessage("⚠️ Full name is required.");

    if (password !== confirmPassword)
      return setMessage("⚠️ Passwords do not match.");

    if (!validatePassword(password))
      return setMessage(
        "⚠️ Password must be at least 8 characters and include a number."
      );

    setLoading(true);

    try {
      // 1. Create auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await sendEmailVerification(userCred.user);

      // 2. Upload profile image
      const storageRef = ref(storage, `profileImages/${userCred.user.uid}`);
      await uploadBytes(storageRef, profileImage);
      const photoURL = await getDownloadURL(storageRef);

      // 3. Create user data
      const baseData = {
        uid: userCred.user.uid,
        fullName,
        email,
        profileImage: photoURL,
        isDriver: false,
        vip: false,
        isEmailVerified: false, // Will be true after they verify
      };

      const completeUserData = createUserData(baseData, "email", referrerId);

      // 4. Save user to Firestore
      const userRef = doc(db, "users", userCred.user.uid);
      await setDoc(userRef, completeUserData);

      // 5. Award points to referrer if exists
      if (referrerId) {
        await awardReferralPoints(referrerId, userCred.user.uid);
      }

      // 6. Send welcome notification to new user
      await updateDoc(doc(db, "users", userCred.user.uid), {
        notifications: arrayUnion({
          id: Date.now().toString(),
          type: "welcome",
          title: "👋 Welcome to Nomo Cars!",
          message: "Thanks for joining! Complete your profile to get started.",
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: "/user/profile"
        }),
        hasUnreadNotifications: true
      });

      setMessage("✅ Account created! Check your email for verification.");
      setLoading(false);

      setTimeout(() => router.push("/login"), 2500);

    } catch (err: any) {
      setMessage(mapFirebaseError(err.message));
      setLoading(false);
    }
  };

  const googleSignup = async () => {
    setGoogleLoading(true);
    setMessage("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // 1. Create user data
        const baseData = {
          uid: user.uid,
          fullName: user.displayName || "Google User",
          email: user.email,
          profileImage: user.photoURL || "/profile.png",
          isDriver: false,
          vip: false,
          isEmailVerified: true, // Google users are verified
        };

        const completeUserData = createUserData(baseData, "google", referrerId);

        // 2. Save user to Firestore
        await setDoc(userRef, completeUserData);

        // 3. Award points to referrer if exists
        if (referrerId) {
          await awardReferralPoints(referrerId, user.uid);
        }

        // 4. Send welcome notification
        await updateDoc(doc(db, "users", user.uid), {
          notifications: arrayUnion({
            id: Date.now().toString(),
            type: "welcome",
            title: "👋 Welcome to Nomo Cars!",
            message: "Thanks for joining with Google! Complete your profile.",
            timestamp: new Date().toISOString(),
            read: false,
            actionUrl: "/user/profile"
          }),
          hasUnreadNotifications: true
        });

      } else {
        // User already exists, just update last login
        await updateDoc(userRef, {
          lastActive: serverTimestamp(),
          profileImage: user.photoURL || snap.data().profileImage
        });
      }

      setGoogleLoading(false);
      router.push("/");
    } catch (err: any) {
      console.error("❌ Google signup error:", err);
      setMessage("Google signup failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-gray-50 shadow-2xl rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800">
          Create Account
        </h1>

        {/* Referral Banner */}
        {referralShortId && referrerData && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <span className="text-green-600 font-bold text-lg">🎁</span>
              </div>
              <div>
                <p className="font-semibold text-green-800">
                  Signing up through {referrerData.fullName.toUpperCase()}'s referral!
                </p>
                <p className="text-sm text-green-700">
                  We'll make your first ride an experience to remember!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Plus they earn {POINTS_PER_REFERRAL} points for your signup. 
                  <br />
                  {POINTS_REQUIRED_PER_FREE_RIDE} points = 1 free ride!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FORM for signup */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex flex-col items-center">
            <label className="w-24 h-24 mb-2 rounded-full overflow-hidden border-2 border-purple-600 flex items-center justify-center bg-gray-100 cursor-pointer">
              {profileImage ? (
                <img
                  src={URL.createObjectURL(profileImage)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src="/profile.png" alt="profile image" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProfileImage(
                    e.target.files ? e.target.files[0] : null
                  )
                }
                className="hidden"
              />
            </label>

            <input
              type="text"
              className="w-full px-4 py-3 border rounded-xl mt-2"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <input
            type="email"
            className="w-full px-4 py-3 border rounded-xl"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <i className="fa fa-eye"></i>
              ) : (
                <i className="fa fa-eye-slash"></i>
              )}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-500"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <i className="fa fa-eye"></i>
              ) : (
                <i className="fa fa-eye-slash"></i>
              )}
            </button>
          </div>

          {message && (
            <div
              className={`text-center mt-4 text-sm px-4 py-2 rounded-xl ${
                message.startsWith("✅")
                  ? "bg-green-100 text-green-700 border border-green-400"
                  : "bg-red-100 text-red-700 border border-red-400"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-all"
          >
            {loading ? <LoadingRound /> : "Register"}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={googleSignup}
            disabled={googleLoading}
            className="cursor-pointer w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
          >
            {googleLoading ? <LoadingRound /> : (
              <>
                <i className="fa fa-google"></i>
                Continue with Google
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-700 hover:underline font-semibold"
          >
            Login
          </Link>
        </p>

        {/* Referral System Explanation */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            <span className="font-bold">🎯 Referral System:</span><br />
            <span className="text-xs">
              • Share your profile link → Friends sign up<br />
              • You earn {POINTS_PER_REFERRAL} points per referral<br />
              • {POINTS_REQUIRED_PER_FREE_RIDE} points = FREE ₦5,000 ride!<br />
              • Get started by signing up
            </span>
          </p>
        </div>

        {/* NEW: Notification Explanation (subtle) */}
        <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            📢 By signing up, you agree to receive notifications about bookings, 
            offers, and safety updates. You can manage preferences in settings.
          </p>
        </div>
      </div>
    </div>
  );
}