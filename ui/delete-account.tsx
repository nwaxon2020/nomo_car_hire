"use client";

import { useState } from "react";
import { auth } from "@/lib/firebaseConfig";
import { signOut, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Eye, EyeOff } from "lucide-react"; // For password visibility toggle

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  stats?: {
    userId: string;
    userEmail?: string;
    firestoreDocuments: number;
    storageFilesAttempted: number;
    storageFoldersSearched: string[];
    collectionsDeleted: string[];
    timestamp: string;
  };
}

export default function DeleteAccountPageUi() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1); // 1: Confirm, 2: Password, 3: Processing
    const router = useRouter();

    // REMOVED: const functions = getFunctions(undefined, 'us-central1'); // This line is unused

    // Step 1: Initial confirmation
    const handleInitialConfirm = () => {
        setStep(2); // Move to password step
        setMessage("🔐 Please enter your password to continue.");
    };

    // Step 2: Re-authenticate with password
    const reauthenticateUser = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            setMessage("❌ You must be logged in.");
            return false;
        }

        if (!password.trim()) {
            setMessage("❌ Please enter your password.");
            return false;
        }

        try {
            setMessage("🔄 Verifying your password...");
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            setMessage("✅ Password verified. Proceeding with deletion...");
            return true;
        } catch (error) {
            console.error("Re-authentication failed:", error);
            
            if (error && typeof error === 'object' && 'code' in error) {
                const firebaseError = error as { code: string; message?: string };
                
                // UPDATED: User-friendly error messages
                switch (firebaseError.code) {
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential':
                        setMessage("❌ Incorrect password. Please try again.");
                        break;
                    case 'auth/too-many-requests':
                        setMessage("❌ Too many attempts. Please try again in a few minutes.");
                        break;
                    case 'auth/user-mismatch':
                    case 'auth/user-not-found':
                        setMessage("❌ Account not found. Please refresh the page.");
                        break;
                    case 'auth/network-request-failed':
                        setMessage("❌ Network error. Please check your connection.");
                        break;
                    default:
                        // Generic error message - no Firebase details
                        setMessage("❌ Password verification failed. Please try again.");
                }
            } else {
                setMessage("❌ Password verification failed.");
            }
            
            setPassword(""); // Clear password for security
            return false;
        }
    };

    // Step 3: Main deletion function
    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user) {
            setMessage("❌ You are not logged in.");
            return;
        }

        // Re-authenticate first
        const isAuthenticated = await reauthenticateUser();
        if (!isAuthenticated) {
            return;
        }

        setStep(3);
        setLoading(true);
        setMessage("🔄 Starting permanent deletion process...");

        try {
            // CRITICAL FIX: Get fresh token AND wait
            console.log("Getting fresh ID token...");
            await user.getIdToken(true);
            
            // IMPORTANT: Wait 2 seconds for token to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setMessage("🔄 Authentication refreshed. Deleting all data...");
            
            // CRITICAL FIX: Initialize functions with region
            const functionsInstance = getFunctions(undefined, 'us-central1');
            
            // Call Cloud Function
            const deleteUserFunction = httpsCallable<{}, DeleteAccountResponse>(
                functionsInstance, 
                'deleteUserAndData'
            );
            
            const result = await deleteUserFunction();
            
            console.log("Cloud Function result:", result.data);
            
            // Sign out user
            await signOut(auth);
            
            // Show detailed success message
            // In your handleDeleteAccount function, update the success message:
            if (result.data.stats) {
                const stats = result.data.stats;
                setMessage(
                    `✅ Account COMPLETELY deleted! \n` +
                    `📊 Removed: \n` +
                    `• User from authentication system \n` +
                    `• ${stats.firestoreDocuments} database records \n` +
                    `• All associated data \n` +
                    `Redirecting in 3 seconds...`
                );
            } else {
                setMessage("✅ Account and all data permanently deleted! Redirecting...");
            }
            
            setTimeout(() => {
                router.push("/");
            }, 3000);
            
        } catch (error) {
            console.error("Delete failed:", error);
            setLoading(false);
            setStep(2); // Go back to password step
            
            setMessage("❌ Deletion failed. Please try again.");
        }
    };

    

    return (
        <div className="min-h-screen flex items-center justify-center p-2 md:p-6 bg-gray-50">
            <div className="bg-white shadow-xl rounded-2xl p-3 py-8 md:p-8 max-w-2xl w-full">
                <h1 className="text-2xl md:text-3xl font-bold text-red-600 mb-6 text-center">
                    Delete Account
                </h1>
                
                {/* Progress indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${step >= 1 ? 'text-red-600' : 'text-gray-400'}`}>
                            1. Warning
                        </span>
                        <span className={`text-sm font-medium ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
                            2. Verify
                        </span>
                        <span className={`text-sm font-medium ${step >= 3 ? 'text-red-600' : 'text-gray-400'}`}>
                            3. Delete
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* STEP 1: Warning */}
                {step === 1 && (
                    <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">⚠️</div>
                            <p className="font-bold text-red-700 text-lg">Permanent Deletion Warning</p>
                        </div>
                        
                        <p className="text-red-600 mb-4">
                            This will permanently delete ALL your data from:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                            <div className="space-y-2">
                                <p className="font-semibold">📁 Firestore Collections</p>
                                <ul className="space-y-1 pl-2">
                                    <li className="flex items-center gap-2">• users (Your profile)</li>
                                    <li className="flex items-center gap-2">• bookingRequests</li>
                                    <li className="flex items-center gap-2">• vehicleLog</li>
                                    <li className="flex items-center gap-2">• preChats</li>
                                    <li className="flex items-center gap-2">• generalSiteReviews</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <p className="font-semibold">🖼️ Storage Folders</p>
                                <ul className="space-y-1 pl-2">
                                    <li className="flex items-center gap-2">• driverIDs/</li>
                                    <li className="flex items-center gap-2">• driverProfiles/</li>
                                    <li className="flex items-center gap-2">• profileImages/</li>
                                    <li className="flex items-center gap-2">• vehicleLog/</li>
                                    <li className="flex items-center gap-2">• All user files</li>
                                </ul>
                            </div>
                        </div>
                        
                        <p className="text-center text-red-700 text-sm font-semibold mb-4">
                            ⚠️ This action is irreversible. Once deleted, your data cannot be recovered.
                        </p>
                        
                        <button
                            onClick={handleInitialConfirm}
                            className="text-sm md:text-base w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                        >
                            I Understand - Continue to Verification
                        </button>
                    </div>
                )}
                
                {/* STEP 2: Password Verification */}
                {step === 2 && (
                    <div className="mb-8 p-5 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">🔐</div>
                            <p className="font-bold text-yellow-700 text-lg">Password Verification Required</p>
                        </div>
                        
                        <p className="text-yellow-700 mb-4">
                            For security, please enter your current password to confirm this action.
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full p-3 border-2 border-yellow-300 rounded-lg focus:outline-none focus:border-yellow-500 pr-10"
                                        disabled={loading}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    You must re-enter your password to proceed with deletion.
                                </p>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setPassword("");
                                        setMessage("");
                                    }}
                                    className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                                    disabled={loading}
                                >
                                    ← Go Back
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={loading || !password.trim()}
                                    className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Verifying...
                                        </div>
                                    ) : (
                                        "Verify & Delete Account"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* STEP 3: Processing */}
                {step === 3 && (
                    <div className="mb-8 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">🔄</div>
                            <p className="font-bold text-blue-700 text-lg">Deletion in Progress</p>
                        </div>
                        
                        <p className="text-blue-700 mb-4">
                            Please wait while we permanently delete all your data. This may take a few moments.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3 py-4">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="font-medium text-blue-700">Processing deletion...</span>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span>Deleting Firestore data...</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span>Removing storage files...</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span>Cleaning up user records...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message display */}
                {message && (
                    <div className={`text-center mb-6 p-4 rounded-xl border-2 whitespace-pre-line ${
                        message.includes("✅") 
                            ? "bg-green-50 border-green-200 text-green-800" 
                            : message.includes("🔄") || message.includes("🔐")
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                        <div className="font-semibold">{message}</div>
                    </div>
                )}

                {/* Success message */}
                {message.includes("✅") && (
                    <div className="text-center py-4 animate-pulse">
                        <div className="text-4xl mb-4">✅</div>
                        <p className="text-green-600 font-bold text-lg mb-2">
                            Successfully Deleted
                        </p>
                        <p className="text-gray-600">
                            You will be redirected to the homepage...
                        </p>
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full animate-progress"></div>
                        </div>
                    </div>
                )}
                
                {/* Cancel option */}
                {step !== 3 && !message.includes("✅") && (
                    <div className="text-center mt-6">
                        <button
                            onClick={() => router.back()}
                            className="text-gray-600 hover:text-gray-800 underline"
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