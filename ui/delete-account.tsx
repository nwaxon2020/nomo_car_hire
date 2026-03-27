"use client";

import { useState } from "react";
import { auth } from "@/lib/firebaseConfig";
import { signOut, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

export default function DeleteAccountPageUi() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1); // 1: Warning, 2: Verify, 3: Processing
    const router = useRouter();

    const handleReauthAnddelete = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            setMessage("❌ You must be logged in to perform this action.");
            return;
        }

        setLoading(true);
        setMessage("🔄 Verifying credentials...");

        try {
            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            
            setStep(3);
            setMessage("🔄 Deleting your account from our system...");

            // Delete only the Auth Account (No Cloud Function/Firestore Logic)
            await deleteUser(user);
            
            setMessage("✅ Account successfully deleted. Redirecting...");
            setTimeout(() => router.push("/"), 3000);
        } catch (error: any) {
            console.error(error);
            setLoading(false);
            if (error.code === 'auth/wrong-password') {
                setMessage("❌ Incorrect password. Please try again.");
            } else {
                setMessage("❌ Action failed. Please login again and retry.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-10 bg-gray-50">
            <div className="bg-white shadow-2xl md:rounded-2xl p-3 py-10 md:p-12 max-w-2xl w-full border border-gray-100">
                <h1 className="text-2xl md:text-3xl font-extrabold text-red-600 mb-8 text-center tracking-tight">
                    Delete Account
                </h1>
                
                {/* Progress Stepper */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-red-600' : 'text-gray-400'}`}>1. Warning</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>2. Verify</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 3 ? 'text-red-600' : 'text-gray-400'}`}>3. Finalize</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                        <div 
                            className="bg-red-600 h-full transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* STEP 1: Warning UI */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="mb-8 p-3 md:p-6 bg-red-50 border-2 border-red-100 rounded md:rounded-xl">
                            <div className="flex items-center gap-3 mb-4 text-red-700">
                                <AlertTriangle size={28} />
                                <p className="font-black text-xl">Irreversible Action</p>
                            </div>
                            
                            <p className="text-red-600 mb-6 leading-relaxed">
                                You are about to permanently close your **Nomo Cars** account. Once confirmed:
                            </p>
                            
                            <ul className="space-y-3 text-sm text-red-800 font-medium mb-8">
                                <li className="flex items-center gap-2">√ Your login credentials will be destroyed</li>
                                <li className="flex items-center gap-2">√ Access to your dashboard will be revoked</li>
                                <li className="flex items-center gap-2">√ This action cannot be undone</li>
                            </ul>
                            
                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-xs text-white font-black rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                            >
                                I Understand - Continue
                            </button>
                        </div>
                    </div>
                )}
                
                {/* STEP 2: Password UI */}
                {step === 2 && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="mb-8 p-3 md:p-6 bg-blue-50 border-2 border-blue-100 rounded md:rounded-xl">
                            <div className="flex items-center gap-3 mb-4 text-blue-700">
                                <ShieldCheck size={28} />
                                <p className="font-black text-xl">Identity Verification</p>
                            </div>
                            
                            <p className="text-blue-600 mb-6">Enter your password to authorize the account closure.</p>
                            
                            <div className="relative mb-6">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className="w-full p-4 bg-white border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm md:text-base"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                                >
                                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                </button>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setMessage("");
                                        setPassword("");
                                    }}
                                    className="flex-1 py-4 bg-white border-2 border-gray-200 text-xs text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
                                >
                                    ← Go Back
                                </button>

                                <button
                                    onClick={handleReauthAnddelete}
                                    disabled={loading || !password.trim()}
                                    className="flex-1 py-4 bg-red-600 text-white text-xs font-black rounded-xl shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "Confirm Deletion"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* STEP 3: Processing UI */}
                {step === 3 && (
                    <div className="py-12 text-center animate-pulse">
                        <Loader2 size={48} className="animate-spin text-red-600 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-gray-800">Finalizing...</h2>
                        <p className="text-gray-500 mt-2">We are cleaning up your session.</p>
                    </div>
                )}

                {/* Feedback Message */}
                {message && (
                    <div className={`mt-6 p-4 rounded-xl text-center font-bold border-2 ${
                        message.includes("✅") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                        {message}
                    </div>
                )}

                {/* CANCEL OPTION: Always visible unless processing or finished */}
                {step !== 3 && !message.includes("✅") && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => router.back()}
                            className="text-gray-500 hover:text-gray-800 text-sm font-medium underline underline-offset-4 transition-colors"
                            disabled={loading}
                        >
                            ← Cancel and go back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}