"use client";

import { useState } from "react";
import { auth, db, storage, googleProvider } from "@/lib/firebaseConfig";
import {
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,
    reauthenticateWithPopup
} from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";

export default function DeleteAccountPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [showPasswordBox, setShowPasswordBox] = useState(false);
    const [password, setPassword] = useState("");
    const router = useRouter();

    const extractStoragePath = (url: string) => {
        try {
            const base = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
            return base;
        } catch (e) {
            return null;
        }
    };

    const handleDelete = async () => {
        const user = auth.currentUser;
        if (!user) return alert("You are not logged in.");

        try {
            setLoading(true);

            // 1. Get user document
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            const data = snap.exists() ? snap.data() : {};

            const profileImage = extractStoragePath(data.profileImage);
            const idImage = extractStoragePath(data.idPhotoURL);

            // 2. Reauthenticate user
            if (user.providerData[0].providerId === "password") {
                // Show password box
                setShowPasswordBox(true);
                setLoading(false);
                return;
            } else {
                // Google users
                await reauthenticateWithPopup(user, googleProvider);
            }

            await deleteUserData(user, userRef, profileImage, idImage);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Error deleting account. Try again.");
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async () => {
        const user = auth.currentUser;
        if (!user) return alert("You are not logged in.");
        if (!password) return alert("Please enter your password.");

        try {
            setLoading(true);

            const credential = EmailAuthProvider.credential(user.email!, password);
            await reauthenticateWithCredential(user, credential);

            // Get user doc again
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            const data = snap.exists() ? snap.data() : {};

            const profileImage = extractStoragePath(data.profileImage);
            const idImage = extractStoragePath(data.idPhotoURL);

            await deleteUserData(user, userRef, profileImage, idImage);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Reauthentication failed. Try again.");
            setLoading(false);
        }
    };

    const deleteUserData = async (user: any, userRef: any, profileImage: string | null, idImage: string | null) => {
        // Delete profile image
        if (profileImage) {
            await deleteObject(ref(storage, profileImage)).catch(() =>
                console.warn("Profile image could not be deleted")
            );
        }

        // Delete driver ID image
        if (idImage) {
            await deleteObject(ref(storage, idImage)).catch(() =>
                console.warn("Driver ID image could not be deleted")
            );
        }

        // Delete Firestore doc
        await deleteDoc(userRef);

        // Delete Auth user
        await deleteUser(user);

        // Show success message and delay redirect
        setMessage("Your account has been deleted successfully. Redirecting...");
        setShowPasswordBox(false);
        setTimeout(() => router.push("/login"), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
            <div className="bg-white shadow-lg rounded-xl p-8 max-w-lg w-full text-center">
                <h1 className="text-2xl font-semibold text-red-600 mb-4">
                    Delete Account
                </h1>
                <p className="text-gray-700 mb-6">
                    This action is permanent and cannot be undone.
                    All your data including profile photos, driver ID photos,
                    bookings, and authentication will be permanently removed.
                </p>

                {message && (
                    <p className="text-green-600 font-semibold mb-4">{message}</p>
                )}

                {!message && !showPasswordBox && (
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg w-full transition"
                    >
                        {loading ? "Processing..." : "Delete My Account"}
                    </button>
                )}

                {showPasswordBox && (
                    <div className="mt-4 flex flex-col items-center">
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <button
                            onClick={handlePasswordSubmit}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg w-full transition"
                        >
                            {loading ? "Verifying..." : "Confirm Delete"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
