"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import {
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser,
    GoogleAuthProvider,
    reauthenticateWithPopup
} from "firebase/auth";
import {
    doc,
    collection,
    query,
    where,
    getDocs,
    writeBatch
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

export default function DeleteAccountPageUi() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1);
    const router = useRouter();

    const handleAccountDeletion = async () => {
        const user = auth.currentUser;
        if (!user) {
            setMessage("❌ You must be logged in to perform this action.");
            return;
        }

        setLoading(true);
        setMessage("🔄 Verifying identity...");

        try {
            // 1. RE-AUTHENTICATION
            const providerId = user.providerData[0]?.providerId;
            if (providerId === "google.com") {
                const provider = new GoogleAuthProvider();
                await reauthenticateWithPopup(user, provider);
            } else {
                if (!password) {
                    setLoading(false);
                    setMessage("❌ Please enter your password.");
                    return;
                }
                const credential = EmailAuthProvider.credential(user.email!, password);
                await reauthenticateWithCredential(user, credential);
            }

            // Move to Finalize Step
            setStep(3);
            setMessage("🗑️ Wiping all records from our system...");

            const batch = writeBatch(db);
            const uid = user.uid;

            // --- FIRESTORE WIPE ---

            // A. User Profile
            batch.delete(doc(db, "users", uid));

            // B. Booking Requests (matches your JSON: 'userId')
            const brQuery = query(collection(db, "bookingRequests"), where("userId", "==", uid));
            const brDocs = await getDocs(brQuery);
            brDocs.forEach((d) => batch.delete(d.ref));

            // C. Trips (matches your JSON: 'customerId')
            const tQuery = query(collection(db, "trips"), where("customerId", "==", uid));
            const tDocs = await getDocs(tQuery);
            tDocs.forEach((d) => batch.delete(d.ref));

            // D. Vehicle Logs
            const vQuery = query(collection(db, "vehicleLog"), where("driverId", "==", uid));
            const vDocs = await getDocs(vQuery);
            vDocs.forEach((d) => batch.delete(d.ref));

            // E. Chats
            const cQuery = query(collection(db, "preChats"), where("participants", "array-contains", uid));
            const cDocs = await getDocs(cQuery);
            cDocs.forEach((d) => batch.delete(d.ref));

            // Execute deletions
            await batch.commit();

            // 2. DELETE AUTH ACCOUNT
            await deleteUser(user);

            setMessage("✅ Account successfully deleted. Redirecting...");
            setTimeout(() => router.push("/"), 3000);

        } catch (error: any) {
            console.error(error);
            setLoading(false);
            setStep(2);
            if (error.code === 'auth/wrong-password') {
                setMessage("❌ Incorrect password. Please try again.");
            } else if (error.code === 'auth/requires-recent-login') {
                setMessage("❌ For security, please log out and back in before deleting.");
            } else {
                setMessage(`❌ Action failed: ${error.message}`);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-10 bg-gray-50">
            <div className="bg-white shadow-2xl md:rounded-2xl p-3 py-10 md:p-12 max-w-2xl w-full border border-gray-100">
                <h1 className="text-2xl md:text-3xl font-extrabold text-red-600 mb-8 text-center tracking-tight">Delete Account</h1>

                <div className="mb-10">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-red-600' : 'text-gray-400'}`}>1. Warning</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>2. Verify</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 3 ? 'text-red-600' : 'text-gray-400'}`}>3. Finalize</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                        <div className="bg-red-600 h-full transition-all duration-500 ease-out" style={{ width: `${(step / 3) * 100}%` }}></div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
                        <div className="mb-8 p-3 md:p-6 bg-red-50 border-2 border-red-100 rounded md:rounded-xl">
                            <div className="flex items-center gap-3 mb-4 text-red-700">
                                <AlertTriangle size={28} />
                                <p className="font-black text-xl text-left">Irreversible Action</p>
                            </div>
                            <p className="text-red-600 mb-6 leading-relaxed text-left">This will permanently wipe your profile, booking requests, and trips.</p>
                            <button onClick={() => setStep(2)} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg">I Understand - Continue</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="mb-8 p-3 md:p-6 bg-blue-50 border-2 border-blue-100 rounded md:rounded-xl">
                            <div className="flex items-center gap-3 mb-4 text-blue-700">
                                <ShieldCheck size={28} />
                                <p className="font-black text-xl">Identity Verification</p>
                            </div>
                            <p className="text-blue-600 mb-6">Authorize the account closure to proceed.</p>
                            {auth.currentUser?.providerData[0]?.providerId !== 'google.com' && (
                                <div className="relative mb-6">
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm your password"
                                        className="w-full p-4 bg-white border-2 border-blue-200 rounded-xl outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                    </button>
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-xl">← Go Back</button>
                                <button onClick={handleAccountDeletion} disabled={loading} className="flex-1 py-4 bg-red-600 text-white font-black rounded-xl shadow-lg">
                                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "Confirm & Wipe Data"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="py-12 text-center">
                        <Loader2 size={48} className="animate-spin text-red-600 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-gray-800">Finalizing...</h2>
                        <p className="text-gray-500 mt-2">{message}</p>
                    </div>
                )}

                {message && step !== 3 && (
                    <div className={`mt-6 p-4 rounded-xl text-center font-bold border-2 ${message.includes("✅") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}