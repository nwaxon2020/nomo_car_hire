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
  getDoc
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
  const signupType = searchParams.get("type"); // "driver" or "passenger"

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

      const redirectUrl = signupType === "driver" ? "/login?redirect=/user/register-as-driver" : "/login";
      setTimeout(() => router.push(redirectUrl), 2500);
    } catch (err: any) {
      setMessage(mapFirebaseError(err.message));
      setLoading(false);
    }
  };

  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [heroBg, setHeroBg] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [generalSnap, homeSnap] = await Promise.all([
          getDoc(doc(db, "site_configs", "general")),
          getDoc(doc(db, "cms", "homePage"))
        ]);

        if (generalSnap.exists()) {
          setSiteConfig(generalSnap.data());
        }

        if (homeSnap.exists()) {
          const homeData = homeSnap.data();
          if (homeData?.hero?.backgroundImage) {
            setHeroBg(homeData.hero.backgroundImage);
          }
        }
      } catch (err) {
        console.error("Failed to fetch configs", err);
      }
    };
    fetchConfig();
  }, []);

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
        const redirectUrl = signupType === "driver" ? "/user/register-as-driver" : "/";
        setTimeout(() => router.push(redirectUrl), 1500);
      } else {
        setMessage(`❌ ${authResult.message}`);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setMessage("❌ Google sign-up failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (!signupType) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {/* Background Image & Overlay */}
        <div
          className="absolute inset-0 bg-gray-900 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url('${heroBg || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070"}')` }}
        />
        <div className="absolute inset-0 bg-black/80" />

        <div className="relative z-10 max-w-4xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-lg md:text-3xl font-black text-white uppercase tracking-tighter drop-shadow-lg mb-2">Choose Your Preference</h1>
            <p className="text-gray-300 font-semibold md:font-bold tracking-widest uppercase text-xs md:text-sm">How would you like to join Nomo Cars?</p>
            <p className="mt-4 text-[11px] md:text-sm text-gray-400 max-w-2xl mx-auto font-medium">
              {siteConfig?.signupDescription || "Welcome to Nomo Cars! Whether you're looking for premium, comfortable rides across the city or you want to join our exclusive fleet to earn on your own schedule, your journey starts here."}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-10 justify-center">
            {/* Passenger Card */}
            <div
              onClick={() => router.push(`/signup?type=passenger${referralShortId ? '&ref=' + referralShortId : ''}`)}
              className="bg-white/10 border border-white/20 rounded-lg md:rounded-xl hover:bg-white/20 hover:scale-105 transition-all cursor-pointer flex-1 flex flex-col items-center text-center group shadow-2xl overflow-hidden relative"
            >
              <div className="w-full h-32 mb-6 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                <img
                  src={siteConfig?.passengerCardImage || "https://static-content.regulaforensics.com/Customer_stories/UBER/UBER-560x417.webp"}
                  alt="Passenger"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">Ride Booking</h2>
              <p className="text-gray-300 text-xs md:text-sm font-medium">Register as a passenger to book premium rides and travel in style across the city.</p>
            </div>

            {/* Driver Card */}
            <div
              onClick={() => router.push(`/signup?type=driver${referralShortId ? '&ref=' + referralShortId : ''}`)}
              className="bg-white/10 border border-white/20 rounded-lg md:rounded-xl hover:bg-white/20 hover:scale-105 transition-all cursor-pointer flex-1 flex flex-col items-center text-center group shadow-2xl overflow-hidden relative"
            >
              <div className="w-full h-32 mb-6 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                <img
                  src={siteConfig?.driverCardImage || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=600"}
                  alt="Driver"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">Work as a Driver</h2>
                <p className="text-gray-300 text-xs md:text-sm font-medium">Join our exclusive fleet, earn money on your own schedule, and enjoy VIP benefits.</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/" className="text-gray-400 hover:text-white uppercase text-[10px] tracking-widest font-bold transition-colors">
              <i className="fa fa-arrow-left mr-2"></i> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDriver = signupType === "driver";

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative ${isDriver ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Driver BG effect */}
      {isDriver && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url('${siteConfig?.driverCardImage || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070"}')` }}
          />
          <div className="absolute inset-0 bg-black/70" />
        </>
      )}

      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => router.back()} className={`transition-colors ${isDriver ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
          <i className="fa fa-arrow-left text-xl"></i>
        </button>
      </div>

      <div className={`relative z-10 shadow-2xl rounded-2xl p-8 max-w-md w-full border ${isDriver ? "bg-gray-900/80 border-amber-500/30 backdrop-blur-md" : "bg-white border-gray-100"}`}>

        {/* Step indicator for drivers */}
        {isDriver && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-xs">1</div>
                <span className="text-amber-400 font-black text-xs uppercase tracking-widest">Create Account</span>
              </div>
              <div className="flex-1 h-px bg-white/20"></div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-gray-400 font-black text-xs">2</div>
                <span className="text-gray-500 font-black text-xs uppercase tracking-widest">Driver Info</span>
              </div>
            </div>

          </div>
        )}

        <h1 className={`text-3xl font-extrabold text-center mb-6 ${isDriver ? "text-white" : "text-gray-800"}`}>
          {isDriver ? "Create Driver Account" : "Create Account"}
        </h1>

        {referralShortId && referrerData && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <p className={`font-semibold ${isDriver ? "text-green-300" : "text-green-800"}`}>Signing up through {referrerData.fullName.toUpperCase()}'s referral!</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex flex-col items-center">
            <label className={`w-24 h-24 mb-2 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100 cursor-pointer ${isDriver ? "border-amber-500" : "border-purple-600"}`}>
              {profileImage ? <img src={URL.createObjectURL(profileImage)} alt="Preview" className="w-full h-full object-cover" /> : <img src="/profile.png" alt="profile" />}
              <input type="file" accept="image/*" onChange={(e) => setProfileImage(e.target.files ? e.target.files[0] : null)} className="hidden" />
            </label>
            <input type="text" className={`w-full px-4 py-3 border rounded-xl mt-2 ${isDriver ? "bg-white/10 border-white/20 text-white placeholder-gray-400" : "bg-white border-gray-200 text-gray-800"}`} placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <input type="email" className={`w-full px-4 py-3 border rounded-xl ${isDriver ? "bg-white/10 border-white/20 text-white placeholder-gray-400" : "bg-white border-gray-200 text-gray-800"}`} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <div className="relative">
            <input type={showPassword ? "text" : "password"} className={`w-full px-4 py-3 border rounded-xl ${isDriver ? "bg-white/10 border-white/20 text-white placeholder-gray-400" : "bg-white border-gray-200 text-gray-800"}`} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className={`absolute right-3 top-3 ${isDriver ? "text-gray-400" : "text-gray-500"}`} onClick={() => setShowPassword(!showPassword)}>
              <i className={`fa ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
            </button>
          </div>

          <div className="relative">
            <input type={showConfirmPassword ? "text" : "password"} className={`w-full px-4 py-3 border rounded-xl ${isDriver ? "bg-white/10 border-white/20 text-white placeholder-gray-400" : "bg-white border-gray-200 text-gray-800"}`} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <button type="button" className={`absolute right-3 top-3 ${isDriver ? "text-gray-400" : "text-gray-500"}`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              <i className={`fa ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
            </button>
          </div>

          {message && <div className={`text-center mt-4 text-sm px-4 py-2 rounded-xl ${message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{message}</div>}

          <button type="submit" disabled={loading} className={`w-full text-white py-3 rounded-xl font-bold transition-all ${isDriver ? "bg-amber-500 hover:bg-amber-600" : "bg-purple-600 hover:bg-purple-700"}`}>
            {loading ? <LoadingRound /> : (isDriver ? "Continue to Driver Setup →" : "Register")}
          </button>
        </form>

        <div className="mt-6">
          <button onClick={googleSignup} disabled={googleLoading} className={`w-full text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${isDriver ? "bg-white/10 border border-white/20 hover:bg-white/20" : "bg-red-500 hover:bg-red-600"}`}>
            {googleLoading ? <LoadingRound /> : <><i className="fa fa-google"></i> Continue with Google</>}
          </button>
        </div>

        <p className={`mt-6 text-center text-sm ${isDriver ? "text-gray-400" : "text-gray-600"}`}>Already have an account? <Link href="/login" className={`font-semibold ${isDriver ? "text-amber-400 hover:text-amber-300" : "text-blue-700 hover:text-blue-800"}`}>Login</Link></p>
      </div>
    </div>
  );
}