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
  serverTimestamp,
  query,
  where,
  limit
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

  useEffect(() => {
    if (referralShortId && referralShortId.length === 8) {
      findReferrerByShortId(referralShortId);
    }
  }, [referralShortId]);

  const findReferrerByShortId = async (shortId: string) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralShortId", "==", shortId), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const referrerDoc = querySnapshot.docs[0];
        const data = referrerDoc.data();
        setReferrerData(data);
        setReferrerId(referrerDoc.id);
      }
    } catch (error) {
      console.error("Error finding referrer:", error);
    }
  };

  // --- RESTORED: FETCH FROM SETTINGS/NOTIFICATIONS ---
  // --- INSIDE SignUpUi.tsx ---
  const getDynamicWelcomeNote = async (userName: string) => {
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
          // ADD THIS LINE BELOW TO CAPTURE THE LABEL
          actionLabel: savedNote.actionLabel || "View Details",
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

  const validatePassword = (pwd: string) => /^(?=.*[0-9]).{8,}$/.test(pwd);

  const mapFirebaseError = (msg: string) => {
    if (msg.includes("auth/email-already-in-use")) return "This email is already in use.";
    if (msg.includes("auth/invalid-email")) return "Please enter a valid email address.";
    if (msg.includes("auth/weak-password")) return "Password should be at least 8 characters and include a number.";
    return "Something went wrong. Please try again.";
  };

  const awardReferralPoints = async (referrerFullId: string, newUserId: string) => {
    try {
      const referrerRef = doc(db, "users", referrerFullId);
      const referrerSnap = await getDoc(referrerRef);
      if (!referrerSnap.exists()) return;

      const referrerData = referrerSnap.data();
      const isDriver = referrerData.isDriver || false;
      const currentPoints = (referrerData.referralPoints || 0) + POINTS_PER_REFERRAL;

      await updateDoc(referrerRef, {
        referrals: arrayUnion({
          userId: newUserId,
          date: new Date().toISOString(),
          points: POINTS_PER_REFERRAL,
          status: "completed"
        }),
        referralPoints: increment(POINTS_PER_REFERRAL),
        referralCount: increment(1),
      });

      if (currentPoints >= 20 && currentPoints % 20 === 0) {
        if (isDriver) {
          await updateDoc(referrerRef, {
            driverVip: true,
            notifications: arrayUnion({
              id: Date.now().toString(),
              type: "vip_earned",
              title: "🌟 VIP Star Activated!",
              message: "Your referrals earned you a VIP Star!",
              timestamp: new Date().toISOString(),
              read: false,
              actionUrl: `/user/driver-profile/${referrerFullId}`
            }),
            hasUnreadNotifications: true
          });
        } else {
          const newFreeRideCount = (referrerData.freeRides || 0) + 1;
          await updateDoc(referrerRef, {
            freeRides: newFreeRideCount,
            notifications: arrayUnion({
              id: Date.now().toString(),
              type: "free_ride_earned",
              title: "🎉 Free ₦5,000 Ride Earned!",
              message: `You hit 20 points! You now have ${newFreeRideCount} free ride(s).`,
              timestamp: new Date().toISOString(),
              read: false,
              actionUrl: "/user/bookings"
            }),
            hasUnreadNotifications: true
          });
        }
      }
    } catch (error) {
      console.error("❌ Error awarding points:", error);
    }
  };

  const getReferralShortId = (userId: string) => userId.slice(-8);

  const createUserData = (baseData: any, authType: string, referrerFullId: string | null, welcomeNote: any) => {
    const userShortId = getReferralShortId(baseData.uid || '');

    return {
      ...baseData,
      authType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      hiredCars: [],
      contactedDrivers: [],
      referralShortId: userShortId,
      referredBy: referrerFullId,
      referralPoints: 0,
      referrals: [],
      referralCount: 0,
      freeRides: 0,
      totalPointsEarned: 0,
      notificationEnabled: true,
      // PUSH THE FETCHED NOTE DIRECTLY HERE
      notifications: welcomeNote ? [welcomeNote] : [],
      hasUnreadNotifications: welcomeNote ? true : false,
      lastNotification: null,
      fcmToken: "",
      city: "",
      phone: "",
      phoneNumber: baseData.phoneNumber || "",
      rating: 0,
      totalTrips: 0,
      earnings: 0,
      isEmailVerified: baseData.isEmailVerified || false,
      lastActive: serverTimestamp(),
      verified: false,
      preferences: { theme: "light", language: "en", currency: "NGN" }
    };
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setMessage("");
    if (!profileImage) return setMessage("⚠️ Profile image is required.");
    if (!fullName.trim()) return setMessage("⚠️ Full name is required.");
    if (password !== confirmPassword) return setMessage("⚠️ Passwords do not match.");
    if (!validatePassword(password)) return setMessage("⚠️ Password must be at least 8 chars + number.");

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCred.user);

      const storageRef = ref(storage, `profileImages/${userCred.user.uid}`);
      await uploadBytes(storageRef, profileImage);
      const photoURL = await getDownloadURL(storageRef);

      // FETCH DYNAMIC NOTE FIRST
      const welcomeNote = await getDynamicWelcomeNote(fullName);

      const baseData = {
        uid: userCred.user.uid,
        fullName,
        email,
        profileImage: photoURL,
        isDriver: false,
        vip: false,
        isEmailVerified: false,
      };

      const completeUserData = createUserData(baseData, "email", referrerId, welcomeNote);
      await setDoc(doc(db, "users", userCred.user.uid), completeUserData);

      if (referrerId) await awardReferralPoints(referrerId, userCred.user.uid);

      setMessage("✅ Account created! Check your email.");
      setLoading(false);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setMessage(mapFirebaseError(err.message));
      setLoading(false);
    }
  };

  const googleSignup = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const welcomeNote = await getDynamicWelcomeNote(user.displayName || "User");
        const baseData = {
          uid: user.uid,
          fullName: user.displayName || "Google User",
          email: user.email,
          profileImage: user.photoURL || "/profile.png",
          isDriver: false,
          vip: false,
          isEmailVerified: true,
        };
        const completeUserData = createUserData(baseData, "google", referrerId, welcomeNote);
        await setDoc(userRef, completeUserData);
        if (referrerId) await awardReferralPoints(referrerId, user.uid);
      }
      setGoogleLoading(false);
      router.push("/");
    } catch (err: any) {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-gray-50 shadow-2xl rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800">Create Account</h1>

        {referralShortId && referrerData && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800">Signing up through {referrerData.fullName.toUpperCase()}'s referral!</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex flex-col items-center">
            <label className="w-24 h-24 mb-2 rounded-full overflow-hidden border-2 border-purple-600 flex items-center justify-center bg-gray-100 cursor-pointer">
              {profileImage ? <img src={URL.createObjectURL(profileImage)} alt="Preview" className="w-full h-full object-cover" /> : <img src="/profile.png" alt="profile" />}
              <input type="file" accept="image/*" onChange={(e) => setProfileImage(e.target.files ? e.target.files[0] : null)} className="hidden" />
            </label>
            <input type="text" className="w-full px-4 py-3 border rounded-xl mt-2" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <input type="email" className="w-full px-4 py-3 border rounded-xl" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <div className="relative">
            <input type={showPassword ? "text" : "password"} className="w-full px-4 py-3 border rounded-xl" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="absolute right-3 top-3" onClick={() => setShowPassword(!showPassword)}>
              <i className={`fa ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
            </button>
          </div>

          <div className="relative">
            <input type={showConfirmPassword ? "text" : "password"} className="w-full px-4 py-3 border rounded-xl" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <button type="button" className="absolute right-3 top-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              <i className={`fa ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
            </button>
          </div>

          {message && <div className={`text-center mt-4 text-sm px-4 py-2 rounded-xl ${message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{message}</div>}

          <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-3 rounded-xl">{loading ? <LoadingRound /> : "Register"}</button>
        </form>

        <div className="mt-6">
          <button onClick={googleSignup} disabled={googleLoading} className="w-full bg-red-500 text-white py-3 rounded-xl flex items-center justify-center gap-2">
            {googleLoading ? <LoadingRound /> : <><i className="fa fa-google"></i> Continue with Google</>}
          </button>
        </div>

        <p className="mt-6 text-center text-sm">Already have an account? <Link href="/login" className="text-blue-700 font-semibold">Login</Link></p>
      </div>
    </div>
  );
}