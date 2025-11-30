"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider, db } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import axios from "axios";
import Link from "next/link";

export default function LoginPageUi() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // 🔥 Main fix: ensure clean session + redirect works properly
    const exchangeTokenAndRedirect = async (userCredential: UserCredential) => {
        try {
        setMsg("Authenticating...");
        const idToken = await userCredential.user.getIdToken();
        await axios.post("/api/login", { idToken });
        setMsg("Login successful! Redirecting...");
        setError("");

        setTimeout(() => router.push("/"), 300);
        } catch (err) {
        console.error("Session exchange error:", err);
        setError("Could not establish a secure session. Try again.");
        }
    };

    const mapFirebaseError = (msg: string) => {
        if (msg.includes("auth/invalid-credential")) return "Invalid email or password.";
        if (msg.includes("auth/user-not-found")) return "No account with this email.";
        if (msg.includes("auth/wrong-password")) return "Wrong password.";
        if (msg.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
        return "Something went wrong. Try again.";
    };

    const loginUser = async (e: any) => {
        e.preventDefault();
        setError("");
        setMsg("");

        try {
            const user = await signInWithEmailAndPassword(auth, email, password);

            if (!user.user.emailVerified)
                return setError("Verify your email before logging in.");

            await exchangeTokenAndRedirect(user);
        } catch (err: any) {
            setError(mapFirebaseError(err.message));
        }
    };

    const googleLogin = async () => {
        setError("");
        setMsg("");

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // 🔥 Ensure Firestore document exists for Google user
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
                await setDoc(userRef, {
                fullName: user.displayName || "",
                email: user.email || "",
                profileImage: user.photoURL || "/profile.png",
                isDriver: false,
                createdAt: new Date(),
                authType: "google",
                hiredCars: [],
                contactedDrivers: [],
                });
            }

            await exchangeTokenAndRedirect(result);

        } catch (err: any) {
            console.error(err);
            setError("Google login failed. Try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="bg-gray-50 shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-200">
                <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
                    Welcome Back
                </h1>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-center">{error}</div>}
                {msg && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-4 text-center">{msg}</div>}

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
                        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-semibold"
                    >
                        Login
                    </button>
                </form>

                <button
                    onClick={googleLogin}
                    className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition font-semibold mt-6"
                >
                    Continue with Google
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
