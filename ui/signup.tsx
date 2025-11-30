"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider, db, storage } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";

export default function SignUpUi() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!profileImage) {
      setMessage("⚠️ Profile image is required.");
      return;
    }

    if (!fullName.trim()) {
      setMessage("⚠️ Full name is required.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("⚠️ Passwords do not match.");
      return;
    }

    if (!validatePassword(password)) {
      setMessage("⚠️ Password must be at least 8 characters and include a number.");
      return;
    }

    setLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCred.user);

      const storageRef = ref(storage, `profileImages/${userCred.user.uid}`);
      await uploadBytes(storageRef, profileImage);
      const photoURL = await getDownloadURL(storageRef);

      await setDoc(doc(db, "users", userCred.user.uid), {
        fullName,
        email,
        profileImage: photoURL,
        isDriver: false,
        createdAt: new Date(),
        authType: "email",
        hiredCars: [],
        contactedDrivers: [],
      });

      setMessage("✅ Account created! Check your email for verification.");
      setLoading(false);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setMessage(mapFirebaseError(err.message));
      setLoading(false);
    }
  };

  const googleSignup = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          fullName: user.displayName || "",
          email: user.email,
          profileImage: user.photoURL || "/profile.png",
          isDriver: false,
          createdAt: new Date(),
          authType: "google",
          hiredCars: [],
          contactedDrivers: [],
        });
      }

      setLoading(false);
      router.push("/");
    } catch (err: any) {
      setMessage("Google login failed. Please try again.");
      setLoading(false);
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-gray-50 shadow-2xl rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800 drop-shadow">Create Account</h1>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            <label className="w-24 h-24 mb-2 rounded-full overflow-hidden border-2 border-purple-600 flex items-center justify-center bg-gray-100 cursor-pointer">
              {profileImage ? (
                <img src={URL.createObjectURL(profileImage)} alt="Profile Preview" className="w-full h-full object-cover" />
              ) : (
                <img src="/profile.png" alt="profile image" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setProfileImage(e.target.files ? e.target.files[0] : null)} className="hidden" />
            </label>
            <input type="text" className="w-full px-4 py-3 border rounded-xl mt-2" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <input type="email" className="w-full px-4 py-3 border rounded-xl" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          {/* Password */}
          <div className="relative">
            <input type={showPassword ? "text" : "password"} className="w-full px-4 py-3 border rounded-xl" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="absolute right-3 top-3 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <i className="fa fa-eye" style={{ fontSize: "18px" }}></i> : <i className="fa fa-eye-slash" style={{ fontSize: "18px" }}></i>}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input type={showConfirmPassword ? "text" : "password"} className="w-full px-4 py-3 border rounded-xl" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <button type="button" className="absolute right-3 top-3 text-gray-500" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <i className="fa fa-eye" style={{ fontSize: "18px" }}></i> : <i className="fa fa-eye-slash" style={{ fontSize: "18px" }}></i>}
            </button>
          </div>

          {message && (
            <div className={`text-center mt-4 text-sm px-4 py-2 rounded-xl ${message.startsWith("✅") ? "bg-green-100 text-green-700 border border-green-400" : "bg-red-100 text-red-700 border border-red-400"}`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="cursor-pointer w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-all">
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <div className="mt-6">
          <button onClick={googleSignup} className="cursor-pointer w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-all">
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm">
          Already have an account? <Link href="/login" className="text-blue-700 hover:underline font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}
