"use client";

import { useState } from "react";
import { auth, db, storage, googleProvider } from "@/lib/firebaseConfig";
import {
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,
    reauthenticateWithPopup
} from "firebase/auth";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
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

    const deleteUserData = async (user: any,userRef: any,profileImage: string | null,idImage: string | null) => {
        try {
            // 1. Delete profile image
            if (profileImage) {
                await deleteObject(ref(storage, profileImage)).catch(() =>
                    console.warn("Profile image could not be deleted")
                );
            }

            // 2. Delete driver ID image
            if (idImage) {
                await deleteObject(ref(storage, idImage)).catch(() =>
                    console.warn("Driver ID image could not be deleted")
                );
            }

            // ⭐ 3. DELETE ALL VEHICLES THAT BELONG TO THIS USER ⭐
            const vehiclesRef = collection(db, "vehicleLog"); 
            const q = query(vehiclesRef, where("driverId", "==", user.uid)); 
            const snapshot = await getDocs(q);

            for (const docSnap of snapshot.docs) {
                const vehicleData = docSnap.data();

                // Delete each image from vehicle.images
                if (vehicleData.images) {
                    for (const key of Object.keys(vehicleData.images)) {
                        const imgUrl = vehicleData.images[key];
                        const storagePath = extractStoragePath(imgUrl);
                        if (storagePath) {
                            await deleteObject(ref(storage, storagePath)).catch(() =>
                                console.warn(`Failed to delete vehicle image: ${key}`)
                            );
                        }
                    }
                }

                // Delete vehicle document
                await deleteDoc(doc(db, "vehicleLog", docSnap.id));
            }

            // 4. Delete Firestore user doc
            await deleteDoc(userRef);

            // 5. Delete Auth user
            await deleteUser(user);

            // 6. Show success message + redirect
            setMessage("Your account and vehicles have been deleted successfully. Redirecting...");
            setShowPasswordBox(false);
            setTimeout(() => router.push("/login"), 2000);

        } catch (error) {
            console.error("Error deleting user data:", error);
            alert("Something went wrong deleting your data. Please try again.");
            setLoading(false);
        }
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
