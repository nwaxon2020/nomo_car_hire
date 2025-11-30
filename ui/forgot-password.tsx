"use client";

import { useState } from "react";
import { auth } from "@/lib/firebaseConfig";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import Link from "next/link";

export default function ForgotPasswordUi() {
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const checkEmailExists = async (email: string): Promise<boolean> => {
        try {
            // Check if email exists in Firebase Auth
            const methods = await fetchSignInMethodsForEmail(auth, email);
            return methods.length > 0; // If methods array has items, email exists
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return false;
            }
            // For other errors, you might want to handle them differently
            console.error('Error checking email:', error);
            throw error;
        }
    };

    const reset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg("");

        try {
            // First check if email exists in Firebase
            const emailExists = await checkEmailExists(email);
            
            if (!emailExists) {
                setMsg("Email not found. Please create an account first.");
                setLoading(false);
                return;
            }

            // If email exists, send password reset link
            await sendPasswordResetEmail(auth, email);
            setMsg("Password reset link sent to your email.");

        } catch (err: any) {
            // Handle specific Firebase errors
            if (err.code === 'auth/user-not-found') {
                setMsg("Email not found. Please create an account first.");
            } else if (err.code === 'auth/invalid-email') {
                setMsg("Invalid email address.");
            } else if (err.code === 'auth/too-many-requests') {
                setMsg("Too many attempts. Please try again later.");
            } else {
                setMsg("An error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-600 p-4">
            <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full">
                <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-800 drop-shadow">Reset Password</h1>

                <form onSubmit={reset} className="space-y-4">
                    <input
                        type="email"
                        className="w-full px-4 py-3 border rounded-xl"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Checking..." : "Send Reset Link"}
                    </button>
                </form>

                {msg && (
                    <p className={`text-center text-sm mt-4 ${
                        msg.includes("not found") || msg.includes("create an account") || msg.includes("Invalid") || msg.includes("error")
                            ? "text-red-600" 
                            : "text-green-600"
                    }`}>
                        {msg}
                    </p>
                )}

                <p className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-blue-700 hover:underline font-semibold">Back to Login</Link>
                </p>
                
                <p className="mt-4 text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-blue-700 hover:underline font-semibold">
                        Create one here
                    </Link>
                </p>
            </div>
        </div>
    );
}