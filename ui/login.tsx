"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import axios from "axios";
import Link from "next/link";
import LoadingRound from "@/ui/re-useable-loading";

export default function LoginPageUi() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

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

  const mapFirebaseError = (msg: string) => {
    if (msg.includes("auth/invalid-credential")) return "Invalid email or password.";
    if (msg.includes("auth/user-not-found")) return "No account found.";
    if (msg.includes("auth/wrong-password")) return "Wrong password.";
    if (msg.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
    return "Something went wrong.";
  };

  const loginUser = async (e: any) => {
    e.preventDefault();

    setError("");
    setMsg("");
    setLoadingLogin(true);

    try {
      const user = await signInWithEmailAndPassword(auth, email, password);

      if (!user.user.emailVerified) {
        setLoadingLogin(false);
        return setError("Verify your email before logging in.");
      }

      await exchangeTokenAndRedirect(user);
    } catch (err: any) {
      setError(mapFirebaseError(err.message));
      setLoadingLogin(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    setMsg("");
    setLoadingGoogle(true);

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
          vip: false,
          createdAt: new Date(),
          authType: "google",
          hiredCars: [],
          contactedDrivers: [],
        });
      }

      await exchangeTokenAndRedirect(result);
    } catch (err) {
      console.error(err);
      setError("Google login failed.");
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-gray-50 shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-200">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={loginUser} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />

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
              {showPassword ? <i className="fa fa-eye"></i> : <i className="fa fa-eye-slash"></i>}
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

        <button
          onClick={googleLogin}
          disabled={loadingGoogle}
          className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition font-semibold mt-6 flex items-center justify-center"
        >
          {loadingGoogle ? <LoadingRound /> : "Continue with Google"}
        </button>

        <p className="text-center text-sm mt-6">
          <Link href="/forgot-password" className="text-blue-700 hover:underline font-semibold">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm mt-4">
          Don’t have an account?
          <Link href="/signup" className="text-purple-700 hover:underline font-semibold ml-1">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
