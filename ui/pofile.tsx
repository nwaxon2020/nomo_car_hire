// app/user/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { ProfileHeader } from "@/components/userProfile/ProfileHeader";

const getVipExpiryDateFromEntry = (entry: any): Date | null => {
  if (!entry || !entry.expiryDate) return null;
  if (entry.expiryDate.toDate) return entry.expiryDate.toDate();
  if (entry.expiryDate.seconds) return new Date(entry.expiryDate.seconds * 1000);
  try {
    return new Date(entry.expiryDate);
  } catch {
    return null;
  }
};

const normalizeVipHistory = (vipHistory: any[] = []) => {
  const now = new Date();
  let changed = false;

  const normalized = vipHistory.map((entry: any) => {
    const expiry = getVipExpiryDateFromEntry(entry);
    if (!entry.expired && expiry && expiry <= now) {
      changed = true;
      return { ...entry, expired: true };
    }
    return entry;
  });

  return { normalized, changed };
};

const getActiveVipHistoryEntries = (vipHistory: any[] = []) => {
  const now = new Date();
  return (vipHistory || []).filter((entry: any) => {
    if (entry.expired) return false;
    const expiry = getVipExpiryDateFromEntry(entry);
    return expiry ? expiry > now : false;
  });
};

const getActivePurchasedVipLevel = (vipHistory: any[] = []) => {
  const activeEntries = getActiveVipHistoryEntries(vipHistory);
  if (activeEntries.length === 0) return 0;
  return Math.max(...activeEntries.map((e: any) => e.level || 0));
};
import { ContactHistory } from "@/components/userProfile/ContactHistory";
import { TripHistory } from "@/components/userProfile/TripHistory";
import { PromotionalCards } from "@/components/userProfile/PromotionalCards";
import { ContactSection } from "@/components/userProfile/ContactSection";

const POINTS_PER_FREE_RIDE = 20;

export default function UserProfilePageUi() {
    const params = useParams();
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [tripHistory, setTripHistory] = useState<any[]>([]);
    const [loadingTripHistory, setLoadingTripHistory] = useState(false);
    const [showChat, setShowChat] = useState(false);

    const rawId = params?.id;
    const userId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId) : "";

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
                    let data = snap.data();

                    const normalizedResult = normalizeVipHistory(data.vipHistory || []);
                    const normalizedVipHistory = normalizedResult.normalized;
                    const activeVipEntries = getActiveVipHistoryEntries(normalizedVipHistory);
                    const activePurchasedVipLevel = getActivePurchasedVipLevel(normalizedVipHistory);
                    const isVip = activeVipEntries.length > 0;

                    const updates: any = {};
                    if (normalizedResult.changed) updates.vipHistory = normalizedVipHistory;
                    if ((data.purchasedVipLevel || 0) !== activePurchasedVipLevel) updates.purchasedVipLevel = activePurchasedVipLevel;
                    if ((data.vipLevel || 0) !== (isVip ? Math.max(data.vipLevel || 0, activePurchasedVipLevel) : 0)) updates.vipLevel = isVip ? Math.max(data.vipLevel || 0, activePurchasedVipLevel) : 0;
                    if (data.vip !== isVip) updates.vip = isVip;

                    if (Object.keys(updates).length > 0) {
                        updates.updatedAt = new Date();
                        await updateDoc(userRef, updates);
                        data = { ...data, ...updates };
                    }

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

    useEffect(() => {
        if (userId) {
            loadTripHistory();
        }
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
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }
        setUploadingImage(true);
        try {
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { storage } = await import("@/lib/firebaseConfig");
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

    const loadTripHistory = async () => {
        if (!userId) return;
        setLoadingTripHistory(true);
        try {
            const { collection, query, where, getDocs, doc, getDoc } = await import("firebase/firestore");
            const tripsRef = collection(db, "trips");
            const q = query(tripsRef, where("customerId", "==", userId));
            const tripsSnapshot = await getDocs(q);
            const tripsList: any[] = [];

            for (const tripDoc of tripsSnapshot.docs) {
                const tripData = tripDoc.data();
                if (tripData.status === "completed" || tripData.status === "cancelled") {
                    const driverDoc = await getDoc(doc(db, "users", tripData.driverId));
                    const driverData = driverDoc.data();
                    const vehicleDoc = await getDoc(doc(db, "vehicleLog", tripData.vehicleId));
                    const vehicleData = vehicleDoc.data();

                    let driverRating = 0;
                    if (driverData?.ratings && Array.isArray(driverData.ratings) && driverData.ratings.length > 0) {
                        const sum = driverData.ratings.reduce((a: number, b: number) => a + b, 0);
                        driverRating = sum / driverData.ratings.length;
                    }

                    let userRating = undefined;
                    let userReview = undefined;
                    if (driverData?.comments) {
                        const userComment = driverData.comments.find(
                            (comment: any) => comment.userId === userId
                        );
                        if (userComment) {
                            userRating = userComment.rating;
                            userReview = userComment.comment;
                        }
                    }

                    tripsList.push({
                        id: tripDoc.id,
                        tripId: tripDoc.id,
                        driverId: tripData.driverId,
                        driverName: driverData?.fullName || `${driverData?.firstName || ''} ${driverData?.lastName || ''}`.trim() || 'Driver',
                        driverImage: driverData?.profileImage,
                        driverRating: driverRating,
                        vehicleId: tripData.vehicleId,
                        vehicleName: vehicleData?.carName || "",
                        vehicleModel: vehicleData?.carModel || "",
                        vehicleImage: vehicleData?.images?.front || "/car_select.jpg",
                        pickupLocation: tripData.pickupLocation || "",
                        destination: tripData.destination || "",
                        status: tripData.status,
                        startTime: tripData.startTime,
                        endTime: tripData.endTime,
                        rating: userRating,
                        review: userReview,
                        createdAt: tripData.createdAt,
                        updatedAt: tripData.updatedAt
                    });
                }
            }

            const sortedTrips = tripsList.sort((a, b) => {
                const timeA = a.endTime?.toMillis?.() || a.endTime?.seconds * 1000 || new Date(a.endTime).getTime() || 0;
                const timeB = b.endTime?.toMillis?.() || b.endTime?.seconds * 1000 || new Date(b.endTime).getTime() || 0;
                return timeB - timeA;
            }).slice(0, 5);

            setTripHistory(sortedTrips);
        } catch (error) {
            console.error("Error loading trip history:", error);
        } finally {
            setLoadingTripHistory(false);
        }
    };

    const handleContactAgain = (driverId: string, vehicleId?: string) => {
        if (vehicleId) {
            router.push(`/user/mobility/car-hire?driver=${driverId}&vehicle=${vehicleId}#contact-driver`);
        } else {
            router.push(`/user/mobility/car-hire?driver=${driverId}#contact-driver`);
        }
    };

    const handleRateTrip = (driverId: string, vehicleId: string) => {
        router.push(`/user/mobility/car-hire?driver=${driverId}&vehicle=${vehicleId}&rate=true#search-results`);
    };

    const referralPoints = userData?.referralPoints || 0;
    const freeRides = Math.floor(referralPoints / POINTS_PER_FREE_RIDE);
    const pointsToNextFreeRide = POINTS_PER_FREE_RIDE - (referralPoints % POINTS_PER_FREE_RIDE);
    const progressPercentage = ((referralPoints % POINTS_PER_FREE_RIDE) / POINTS_PER_FREE_RIDE) * 100;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
                    <p className="text-gray-400">The user profile you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">


            <div className="relative max-w-7xl mx-auto px-3 py-8 lg:px-8">
                {/* Profile Header */}
                <ProfileHeader
                    userData={userData}
                    userId={userId}
                    referralPoints={referralPoints}
                    freeRides={freeRides}
                    pointsToNextFreeRide={pointsToNextFreeRide}
                    progressPercentage={progressPercentage}
                    uploadingImage={uploadingImage}
                    editingName={editingName}
                    newName={newName}
                    setNewName={setNewName}
                    setEditingName={setEditingName}
                    handleUpdateName={handleUpdateName}
                    handleProfileImageChange={handleProfileImageChange}
                />

                {/* Contact History */}
                <ContactHistory
                    contactedDrivers={userData.contactedDrivers || []}
                    onContactAgain={handleContactAgain}
                    onConnectDrivers={() => router.push('/user/mobility/car-hire')}
                />

                {/* Trip History */}
                <TripHistory
                    trips={tripHistory}
                    loading={loadingTripHistory}
                    onRateTrip={handleRateTrip}
                    onBookTrip={() => router.push('/user/mobility/car-hire')}
                />


                {/* Promotional Cards */}
                <PromotionalCards
                    userId={userId}
                    onUpgradeVIP={() => router.push('/user/mobility/purchase')}
                    onBookKeke={() => router.push('/user/mobility/car-hire?category=keke')}
                />

                {/* Contact Section */}
                <ContactSection />
            </div>

            <p className="mt-36 pb-10 text-gray-500 font-bold italic text-center text-[10px]">Powered by Nomop Ventures&reg;</p>
        </div>
    );
}