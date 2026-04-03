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
import {
  handleGoogleAuthUnified,
  findReferrerByShortId,
  createUserData as createUserDataHelper,
  awardReferralPoints as awardReferralPointsHelper,
  getDynamicWelcomeNote as getDynamicWelcomeNoteHelper,
} from "@/lib/authHelpers";

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
      loadReferrerData();
    }
  }, [referralShortId]);

  const loadReferrerData = async () => {
    const { referrerId, referrerData } = await findReferrerByShortId(referralShortId!);
    if (referrerId && referrerData) {
      setReferrerId(referrerId);
      setReferrerData(referrerData);
    }
  };

  const validatePassword = (pwd: string) => /^(?=.*[0-9]).{8,}$/.test(pwd);

  const mapFirebaseError = (msg: string) => {
    if (msg.includes("auth/email-already-in-use")) return "This email is already in use.";
    if (msg.includes("auth/invalid-email")) return "Please enter a valid email address.";
    if (msg.includes("auth/weak-password")) return "Password should be at least 8 characters and include a number.";
    return "Something went wrong. Please try again.";
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
      const welcomeNote = await getDynamicWelcomeNoteHelper(fullName);

      const baseData = {
        uid: userCred.user.uid,
        fullName,
        email,
        profileImage: photoURL,
      };

      const completeUserData = createUserDataHelper(baseData, "email", referrerId, welcomeNote);
      await setDoc(doc(db, "users", userCred.user.uid), completeUserData);

      if (referrerId) await awardReferralPointsHelper(referrerId, userCred.user.uid);

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
    setMessage("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Use unified Google auth handler
      const authResult = await handleGoogleAuthUnified(result, referrerId, true);
      
      if (authResult.success) {
        setMessage(`✅ ${authResult.userExists ? "Welcome back!" : "Account created successfully!"}`);
        setGoogleLoading(false);
        setTimeout(() => router.push("/"), 1500);
      } else {
        setMessage(`❌ ${authResult.message}`);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setMessage("❌ Google sign-up failed. Please try again.");
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