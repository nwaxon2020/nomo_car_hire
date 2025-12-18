"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import TransportNewsPageUi from "../components/news";
import WordGuessGame from "../components/game";
import ShareButton from "@/components/sharebutton";
import { toast, Toaster } from "react-hot-toast";

// ⭐ Capitalize full name function
function capitalizeFullName(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// Format date function
function formatDate(dateInput: any) {
    if (!dateInput) return "Unknown date";
    
    try {
        // Handle Firestore timestamp
        if (dateInput.toDate) {
            const date = dateInput.toDate();
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        // Handle string or number
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid date";
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid date";
    }
}

// Format time function
function formatTime(dateInput: any) {
    if (!dateInput) return "";
    
    try {
        if (dateInput.toDate) {
            const date = dateInput.toDate();
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "";
        
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return "";
    }
}

export default function UserProfilePageUi() {
    const params = useParams();
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [game, setGame] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);

    // Safely get userId with proper type handling
    const rawId = params?.id;
    const userId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId) : "";
    const POINTS_PER_FREE_RIDE = 20; // Changed from 10 to 20

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                const userRef = doc(db, "users", userId);
                const snap = await getDoc(userRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setUserData(data);
                    setNewName(data.fullName || "");
                } else {
                    setUserData(null);
                }
            } catch (err) {
                console.error("Error loading user:", err);
                setUserData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        if (!userId) {
            toast.error("User ID not found");
            return;
        }

        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                fullName: newName.trim(),
                updatedAt: new Date()
            });
            
            setUserData({ ...userData, fullName: newName.trim() });
            setEditingName(false);
            toast.success("Name updated successfully!");
        } catch (err) {
            console.error("Error updating name:", err);
            toast.error("Failed to update name");
        }
    };

    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!userId) {
            toast.error("User ID not found");
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }

        setUploadingImage(true);
        try {
            const storageRef = ref(storage, `profileImages/${userId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                photoURL,
                profileImage: photoURL,
                updatedAt: new Date()
            });
            
            setUserData({ ...userData, photoURL, profileImage: photoURL });
            toast.success("Profile image updated successfully!");
        } catch (err) {
            console.error("Error uploading profile image:", err);
            toast.error("Failed to update profile image");
        } finally {
            setUploadingImage(false);
        }
    };

    // Function to handle contact again - goes to car hire page with contact-driver anchor
    const handleContactAgain = (driverId: string, vehicleId?: string) => {
        // Pass driver ID and optionally vehicle ID as query parameters
        if (vehicleId) {
            router.push(`/user/car-hire?driver=${driverId}&vehicle=${vehicleId}#contact-driver`);
        } else {
            router.push(`/user/car-hire?driver=${driverId}#contact-driver`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl font-semibold animate-pulse">Fetching profile...</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl font-semibold text-red-600">User not found</div>
            </div>
        );
    }

    // Calculate referral progress with 20 points per free ride
    const referralPoints = userData.referralPoints || 0;
    const freeRides = Math.floor(referralPoints / POINTS_PER_FREE_RIDE);
    const pointsToNextFreeRide = POINTS_PER_FREE_RIDE - (referralPoints % POINTS_PER_FREE_RIDE);
    const progressPercentage = ((referralPoints % POINTS_PER_FREE_RIDE) / POINTS_PER_FREE_RIDE) * 100;

    return (
        <div className="relative p-3 sm:p-6 max-w-5xl mx-auto">
            <Toaster position="top-right" />
            
            {/* Header with Free Ride Status */}
            <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">

                {/* VIP card */}
                {
                    userData.vip? <div className="sm:absolute right-12 top-10 mt-2 inline-flex items-center gap-1 bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
                        <span className="text-yellow-600">⭐</span>
                        <span className="text-yellow-800 text-xs sm:text-sm font-semibold">VIP Customer</span>
                    </div> : ""
                }

                <div className="flex flex-col justify-between items-start gap-4">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-2">
                            {/* Profile Image with Edit Button */}
                            <div className="relative">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gray-300">
                                    {userData.photoURL || userData.profileImage ? (
                                        <img
                                            src={userData.photoURL || userData.profileImage}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                                            {userData.fullName?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Edit Profile Image Button */}
                                <label className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-1 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <span className="text-gray-600 text-sm">✏️</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleProfileImageChange}
                                        disabled={uploadingImage}
                                    />
                                </label>
                                {uploadingImage && (
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                        <div className="text-white text-xs">Uploading...</div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    {editingName ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="px-3 py-1 border border-gray-300 rounded-lg text-lg font-semibold"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleUpdateName}
                                                className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingName(false);
                                                    setNewName(userData.fullName || "");
                                                }}
                                                className="bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-sm hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                                                {capitalizeFullName(userData.fullName || "Unnamed User")}
                                            </h1>
                                            <button
                                                onClick={() => setEditingName(true)}
                                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                                title="Edit name"
                                            >
                                                ✏️
                                            </button>
                                        </>
                                    )}
                                </div>
                                
                                <p className="text-gray-500 text-sm mt-1">Passenger</p>
                                
                                {/* Star indicator for free rides */}
                                {freeRides > 0 && (
                                    <div className="flex items-center gap-1 mt-2">
                                        {freeRides > 1 && (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                                {freeRides}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Free Ride Status */}
                        {freeRides > 0 ? (
                            <div className="mt-2 inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-lg">
                                <span className="text-yellow-600 font-bold">★</span>
                                <span className="text-yellow-800 font-semibold">
                                    You have {freeRides} free ride{freeRides > 1 ? 's' : ''}
                                </span>
                            </div>
                        ) : referralPoints > 0 && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold">{referralPoints} points</span> • 
                                    Need {pointsToNextFreeRide} more points for a free ride
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1 max-w-xs">
                                    <div 
                                        className="bg-green-600 h-2 rounded-full" 
                                        style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Referral Stats Card */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 w-full">
                        <h3 className="font-bold text-green-800 text-sm mb-2">Referral Progress</h3>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-2xl font-bold text-green-900">{referralPoints}</p>
                                <p className="text-xs text-green-700">Points</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-gray-800 ml-1">{freeRides}</p>                               
                                <p className={`text-xs ${freeRides >= 1 ? "text-[goldenrod] font-semibold" : "text-gray-800"}`}>Free Rides</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-900">{userData.referralCount || 0}</p>
                                <p className="text-xs text-blue-700">Referrals</p>
                            </div>
                        </div>
                        <div className="mt-2 text-center text-xs text-gray-600">
                            <p className="text-gray-500">(2 points per successful referral)</p>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-2 hover:text-gray-600">
                            <a href="#share-link" >
                                {referralPoints === 0 
                                    ? "Share your link to start earning points!"
                                    : referralPoints >= POINTS_PER_FREE_RIDE 
                                        ? "🎉 You've earned free rides! Keep sharing!"
                                        : `${pointsToNextFreeRide} more points for your next free ride. Share Link to earn more`
                                }
                            </a>
                        </p>
                    </div>
                </div>

                {/* Open Game Button */}
                <div className="text-right">
                    <button
                        onClick={() => setGame(true)}
                        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
                    >
                        🎮 Play Game
                    </button>
                </div>

                {/* Word guessing game section div */}
                {game && (
                    <div className="p-10 bg-black rounded-md absolute top-0 right-[-12px] sm:right-1 lg:right-65 z-20">
                        {/* Close Game Button */}
                        <p
                            onClick={() => setGame(false)}
                            className="cursor-pointer text-white text-right text-2xl font-black"
                        >
                            x
                        </p>
                        <WordGuessGame />
                    </div>
                )}
            </div>

            {/* Improved History Sections */}
            <div className="mb-8">
                {/* Drivers Contacted - Clean Cards */}
                <section className="px-2 sm:px-8 w-full bg-white shadow-lg rounded-xl border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Contact History</h2>
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                            {userData.contactedDrivers?.length || 0} contacts
                        </span>
                    </div>

                    {userData.contactedDrivers && userData.contactedDrivers.length > 0 ? (
                        <div className="grid lg:grid-cols-2 gap-3 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {userData.contactedDrivers.map((driver: any, index: number) => (
                                <div
                                    key={index}
                                    className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            {driver.profileImage ? (
                                                <img
                                                    src={driver.profileImage}
                                                    alt={driver.firstName || "Driver"}
                                                    className="w-16 h-16 object-cover rounded-full border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                                                    <span className="text-xl">👨‍✈️</span>
                                                </div>
                                            )}
                                            {/* Status indicator */}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-800">
                                                        {driver.driverName || "Driver"}
                                                    </h3>
                                                    <p className="text-gray-600 text-xs mt-0.5">
                                                        📱 {driver.phoneNumber || driver.driverPhone || "No phone"}
                                                    </p>
                                                    <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                                        <span>🚗 {driver.vehicleName || "Vehicle"}</span>
                                                        {driver.vehicleModel && (
                                                            <span className="text-gray-400">• {driver.vehicleModel}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="my-1 sm:text-right">
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {formatDate(driver.contactDate || driver.lastContacted)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {formatTime(driver.contactDate || driver.lastContacted)}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Driver rating if available */}
                                            {(driver.averageRating || driver.rating) && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex items-center">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span
                                                                key={i}
                                                                className={`text-xs ${
                                                                    i < Math.round(driver.averageRating || driver.rating || 0)
                                                                        ? "text-yellow-400"
                                                                        : "text-gray-300"
                                                                }`}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {(driver.averageRating || driver.rating)?.toFixed(1)} 
                                                        {driver.totalRatings && ` (${driver.totalRatings})`}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Contact Again Button */}
                                            <button
                                                onClick={() => handleContactAgain(driver.driverId || driver.uid, driver.vehicleId)}
                                                className="mt-3 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded text-xs hover:from-green-700 hover:to-green-800 transition-all duration-200 w-full flex items-center justify-center gap-1"
                                            >
                                                <span>📞</span>
                                                <span>Contact Again</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-dashed border-gray-300">
                            <div className="text-gray-400 text-5xl mb-3">👨‍✈️</div>
                            <p className="text-gray-500 text-sm mb-3">No driver contacts yet</p>
                            <button 
                                onClick={() => router.push('/user/car-hire')}
                                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-2 rounded-lg text-sm hover:from-green-700 hover:to-green-800 transition-all duration-300"
                            >
                                Connect with Drivers
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {/* VIP and Link Section */}
            <section id="share-link" className="my-12">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Earn Free Rides!</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {/* First card */}
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                        <img
                            src="/customerSmiling.jpeg"
                            alt="Person Smiling"
                            className="w-full h-40 object-cover"
                        />
                        <div className="text-sm mx-auto text-center p-4 pb-0 text-green-800 font-semibold hover:underline">
                            <ShareButton 
                                userId={userId}
                                title="Get a Free Ride on Nomopoventures!"
                                text="Join me on Nomopoventures for amazing rides! Use my link to sign up and get 2 points for my referral. I need 20 points for a FREE RIDE! 🚗✨"
                            />
                        </div>
                        <p className="mt-0 p-4 pt-0 text-center text-xs text-gray-500">
                            🎁 Invite friends, earn 2 points each! Score 20 points and unlock a FREE ride!
                        </p>
                    </div>

                    {/* Second card */}
                    <div className="text-sm bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                        <img
                            src="/driverSmiling.webp"
                            alt="Happy Driving"
                            className="w-full h-40 object-cover"
                        />
                        <div className="mx-auto text-center p-4 pb-0 text-green-800 font-semibold hover:underline">
                            <a href="/user/purchase">
                                Upgrade to <span className="text-[gold]">VIP</span> Service
                            </a>
                        </div>
                        <p className="mt-0 p-4 pt-0 text-center text-xs text-gray-500">
                            🌟 Become a VIP member and enjoy premium comfort rides, earn points, and unlock free ride rewards — all while supporting our journey.
                        </p>
                    </div>

                    {/* Third card */}
                    <div className="text-sm bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                        <img
                            src="/keke.jpeg"
                            alt="Stopping Car"
                            className="w-full h-40 object-cover"
                        />
                        <div className="mx-auto text-center p-4 pb-0 text-green-800 font-semibold hover:underline">
                            <a href="">You Can Now Hire Keke Napep</a>
                        </div>
                        <p className="mt-0 p-4 pt-0 text-center text-xs text-gray-500">
                            🛺 Anywhere is possible with our app! Hire a Keke Napep and enjoy an easier, faster journey.
                        </p>
                    </div>
                </div>
                
            </section>

            {/* Complain section */}
            <div className="my-10 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 sm:p-8 text-center shadow-xl border border-gray-700">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">
                    We're Here to Help
                </h2>

                <p className="text-sm sm:text-base lg:text-lg text-gray-300 mb-4 leading-relaxed">
                    For complaints, enquiries, reports and much more — our team is available 
                    <span className="text-white font-semibold"> 24/7</span>.
                </p>

                <a
                    href="mailto:nomopoventures@yahoo.com"
                    className="inline-block bg-red-700 hover:bg-red-600 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-white font-semibold text-sm sm:text-base transition-all"
                >
                    Contact Us Today!
                </a>
            </div>

            {/* Transport News Section */}
            <div className="bg-white mt-8 p-2">
                <h1 className="py-3 text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">
                    Latest Transport, Flight, Pricing, Shipping, & Other News
                </h1><hr />

                <div className="p-2 py-3 w-full rounded max-h-[30rem] overflow-y-auto">
                    <TransportNewsPageUi />
                </div>
            </div>
        </div>
    );
}