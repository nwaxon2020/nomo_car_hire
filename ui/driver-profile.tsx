// app/driver/[id]/page.tsx (refactored main page)
"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import {
  doc, collection, addDoc, updateDoc, deleteDoc, query, where,
  onSnapshot, getDoc, Timestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

import { Vehicle, Comment, VIP_CONFIG } from "@/components/driversProfile/driver";
import { VIPStar } from "@/components/driversProfile/VIPStar";
import { VehicleCard } from "@/components/driversProfile/VehicleCard";
import { VehicleFormModal } from "@/components/driversProfile/VehicleFormModal";
import { DriverHeader } from "@/components/driversProfile/DriverHeader";
import WordGuessGame from "@/components/wordGuessGame";
import ShareButton from "@/components/sharebutton";
import LoadingRound from "@/components/re-useable-loading";
import DriverLocationToggle from "@/components/map/DriverLocationToggle";
import TripHistoryCard from "@/components/map/TripHistoryCard";

// Helper functions
const getStoredVipLevel = (driverId: string): number | null => {
  try {
    const stored = localStorage.getItem(`driver-${driverId}-vipLevel`);
    return stored ? parseInt(stored) : null;
  } catch {
    return null;
  }
};

const setStoredVipLevel = (driverId: string, level: number) => {
  try {
    localStorage.setItem(`driver-${driverId}-vipLevel`, level.toString());
  } catch { }
};

const capitalizeFullName = (name: string) =>
  name?.split(" ").filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || "Professional Driver";

const calculateVIPDetails = (referralCount: number, purchasedVipLevel: number, vipExpiryDate?: any) => {
  let referralBasedLevel = 0;
  for (let i = 0; i < VIP_CONFIG.levels.length; i++) {
    if (referralCount >= VIP_CONFIG.levels[i].referralsRequired) {
      referralBasedLevel = VIP_CONFIG.levels[i].level;
    } else {
      break;
    }
  }

  const isExpired = vipExpiryDate ? vipExpiryDate.toDate() < new Date() : false;
  const effectivePurchasedLevel = isExpired ? 0 : purchasedVipLevel;

  const vipLevel = Math.min(
    Math.max(effectivePurchasedLevel, referralBasedLevel),
    VIP_CONFIG.maxLevel
  );

  let prestigeLevel = 0;
  if (vipLevel >= VIP_CONFIG.maxLevel) {
    const maxLevelReferrals = VIP_CONFIG.levels[VIP_CONFIG.levels.length - 1].referralsRequired;
    const extraReferrals = referralCount - maxLevelReferrals;

    if (extraReferrals > 0) {
      prestigeLevel = Math.floor(extraReferrals / VIP_CONFIG.referralMultiplier);
    }
  }

  let nextReferralsNeeded = 0;
  let referralsForNext = 0;
  let progressPercentage = 0;

  if (vipLevel < VIP_CONFIG.maxLevel) {
    const nextLevelIndex = vipLevel;
    const nextLevelReq = VIP_CONFIG.levels[nextLevelIndex]?.referralsRequired || 0;
    const currentLevelReq = VIP_CONFIG.levels[vipLevel - 1]?.referralsRequired || 0;

    nextReferralsNeeded = Math.max(0, nextLevelReq - referralCount);
    referralsForNext = nextLevelReq;

    const referralsInCurrentLevel = referralCount - currentLevelReq;
    const referralsNeededForNext = nextLevelReq - currentLevelReq;
    progressPercentage = referralsNeededForNext > 0
      ? (referralsInCurrentLevel / referralsNeededForNext) * 100
      : 0;
  } else {
    const baseForCurrentPrestige = VIP_CONFIG.levels[VIP_CONFIG.levels.length - 1].referralsRequired +
      (prestigeLevel * VIP_CONFIG.referralMultiplier);
    nextReferralsNeeded = Math.max(0, baseForCurrentPrestige + VIP_CONFIG.referralMultiplier - referralCount);
    referralsForNext = baseForCurrentPrestige + VIP_CONFIG.referralMultiplier;

    const referralsInCurrentPrestige = referralCount - baseForCurrentPrestige;
    progressPercentage = (referralsInCurrentPrestige / VIP_CONFIG.referralMultiplier) * 100;
  }

  return {
    vipLevel,
    prestigeLevel,
    referralCount,
    nextReferralsNeeded,
    referralsForNext,
    progressPercentage: Math.min(progressPercentage, 100),
    isMaxLevel: vipLevel >= VIP_CONFIG.maxLevel,
    isExpired,
    currentLevelName: vipLevel > 0 ? VIP_CONFIG.levels[vipLevel - 1]?.name : "No VIP",
    nextLevelName: vipLevel < VIP_CONFIG.maxLevel
      ? VIP_CONFIG.levels[vipLevel]?.name
      : `Prestige LV${prestigeLevel + 1}`,
  };
};

const initializeVIPFields = async (driverId: string) => {
  try {
    const userRef = doc(db, "users", driverId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const updates: any = {};
      let needsUpdate = false;

      if (data.referralCount === undefined) {
        updates.referralCount = 0;
        needsUpdate = true;
      }

      if (data.purchasedVipLevel === undefined) {
        updates.purchasedVipLevel = 0;
        needsUpdate = true;
      }

      const now = new Date();
      if (data.vipExpiryDate && data.vipExpiryDate.toDate() < now) {
        updates.purchasedVipLevel = 0;
        updates.vipLevel = 0;
        updates.vipExpiryDate = null;
        updates.vipPurchaseDate = null;
        needsUpdate = true;
        updates.prestigeLevel = 0;
      }

      const referralCount = data.referralCount || 0;
      const purchasedVipLevel = updates.purchasedVipLevel !== undefined ? updates.purchasedVipLevel : data.purchasedVipLevel || 0;
      const vipDetails = calculateVIPDetails(referralCount, purchasedVipLevel, data.vipExpiryDate);

      if (data.vipLevel === undefined || data.vipLevel !== vipDetails.vipLevel) {
        updates.vipLevel = vipDetails.vipLevel;
        needsUpdate = true;
      }

      if (data.prestigeLevel === undefined || data.prestigeLevel !== vipDetails.prestigeLevel) {
        updates.prestigeLevel = vipDetails.prestigeLevel;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await updateDoc(userRef, {
          ...updates,
          updatedAt: Timestamp.now()
        });
      }
    }
  } catch (error) {
    console.error("Error initializing VIP fields:", error);
  }
};

export default function DriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const driverId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  // State Management
  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState<any>(null);
  const [game, setGame] = useState(false);

  // Vehicle States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [selectedMainImage, setSelectedMainImage] = useState<{ [key: string]: string }>({});

  // Location States
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);

  // VIP and Stats
  const [referralCount, setReferralCount] = useState<number>(0);
  const [vipLevel, setVipLevel] = useState<number>(0);
  const [purchasedVipLevel, setPurchasedVipLevel] = useState<number>(0);
  const [prestigeLevel, setPrestigeLevel] = useState<number>(0);
  const [customersCarried, setCustomersCarried] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Other States
  const [contactedDrivers, setContactedDrivers] = useState<any[]>([]);
  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [loadingTripHistory, setLoadingTripHistory] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showVIPUpgradeModal, setShowVIPUpgradeModal] = useState(false);

  const vipDetails = calculateVIPDetails(referralCount, purchasedVipLevel);
  const averageRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : "0.0";

  const canAddVehicle = () => {
    if (vipLevel === 0) return vehicles.length < 2;
    if (vipLevel >= 1 && vipLevel <= 3) return vehicles.length < 10;
    if (vipLevel >= 4) return true;
    return false;
  };

  const getVehicleLimitMessage = () => {
    if (vipLevel === 0) {
      return "Regular drivers can add up to 2 vehicles. Upgrade to VIP for more!";
    } else if (vipLevel >= 1 && vipLevel <= 3) {
      return `VIP Level ${vipLevel} drivers can add up to 10 vehicles. Upgrade to Gold/Black VIP for unlimited vehicles!`;
    }
    return "";
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recently";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString("en-GB");
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB");
      }
      return new Date(timestamp).toLocaleDateString("en-GB");
    } catch {
      return "Recently";
    }
  };

  // Load Trip History
  const loadTripHistory = async () => {
    if (!driverId) return;
    setLoadingTripHistory(true);

    try {
      const { collection, query, where, getDocs, doc, getDoc } = await import("firebase/firestore");

      const tripsRef = collection(db, "trips");
      const q = query(tripsRef, where("customerId", "==", driverId));
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
              (comment: any) => comment.userId === driverId
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

  // Vehicle CRUD Operations
  const uploadImage = async (file: File, path: string, label: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);

      task.on('state_changed',
        () => { },
        (error) => {
          reject(new Error(`Failed to upload ${label}: ${error.message}`));
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (error) {
            reject(new Error(`Failed to get download URL for ${label}`));
          }
        }
      );
    });
  };

  const submitVehicle = async (formData: any, images: any) => {
    setSavingVehicle(true);

    try {
      const timestamp = Date.now();
      const uploadPromises = [];

      if (images.front) {
        uploadPromises.push(uploadImage(images.front, `vehicleLog/${driverId}/${timestamp}_front_${images.front.name}`, "Front view"));
      }
      if (images.side) {
        uploadPromises.push(uploadImage(images.side, `vehicleLog/${driverId}/${timestamp}_side_${images.side.name}`, "Side view"));
      }
      if (images.back) {
        uploadPromises.push(uploadImage(images.back, `vehicleLog/${driverId}/${timestamp}_back_${images.back.name}`, "Back view"));
      }
      if (images.interior) {
        uploadPromises.push(uploadImage(images.interior, `vehicleLog/${driverId}/${timestamp}_interior_${images.interior.name}`, "Interior view"));
      }

      const [frontUrl, sideUrl, backUrl, interiorUrl] = await Promise.allSettled(uploadPromises)
        .then((results) => results.map((result) => result.status === 'fulfilled' ? result.value : null));

      const finalFrontUrl = frontUrl || editingVehicle?.images.front;
      const finalSideUrl = sideUrl || editingVehicle?.images.side;
      const finalBackUrl = backUrl || editingVehicle?.images.back;
      const finalInteriorUrl = interiorUrl || editingVehicle?.images.interior;

      const vehicleDoc = {
        driverId,
        ...formData,
        images: {
          front: finalFrontUrl!,
          side: finalSideUrl!,
          back: finalBackUrl!,
          interior: finalInteriorUrl!
        },
        createdAt: editingVehicle?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingVehicle?.id) {
        await updateDoc(doc(db, "vehicleLog", editingVehicle.id), vehicleDoc);
        toast.success("✅ Vehicle updated successfully!");
      } else {
        const newDocRef = await addDoc(collection(db, "vehicleLog"), vehicleDoc);

        try {
          const userRef = doc(db, "users", driverId);
          await updateDoc(userRef, {
            vehicleLog: arrayUnion(newDocRef.id),
            updatedAt: Timestamp.now()
          });
        } catch (uErr: any) {
          await deleteDoc(newDocRef);
          throw new Error("Vehicle added but user record couldn't be updated.");
        }

        toast.success("✅ Vehicle added successfully!");
      }

      setShowVehicleForm(false);
      setEditingVehicle(null);
      resetVehicleForm();
    } catch (err: any) {
      console.error("Failed to save vehicle:", err);
      toast.error(`Failed to save vehicle: ${err.message}`, { duration: 5000 });
    } finally {
      setSavingVehicle(false);
    }
  };

  const startEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setShowVehicleForm(true);
  };

  const confirmDeleteVehicle = (id?: string) => {
    if (!id) return;
    setVehicleToDelete(id);
    setShowDeleteModal(true);
  };

  const removeVehicle = async () => {
    if (!vehicleToDelete) return;

    try {
      await deleteDoc(doc(db, "vehicleLog", vehicleToDelete));
      try {
        const userRef = doc(db, "users", driverId);
        await updateDoc(userRef, { vehicleLog: arrayRemove(vehicleToDelete), updatedAt: Timestamp.now() });
      } catch (uErr) {
        console.error("Failed to remove vehicle id from user's vehicleLog:", uErr);
      }

      setSelectedMainImage(prev => {
        const newState = { ...prev };
        delete newState[vehicleToDelete];
        return newState;
      });

      toast.success("Vehicle deleted successfully");
    } catch (err) {
      console.error("Could not delete vehicle:", err);
      toast.error("Could not delete vehicle");
    } finally {
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    }
  };

  const markVehicleAsAvailable = async (vehicleId: string) => {
    try {
      const vehicleRef = doc(db, "vehicleLog", vehicleId);
      await updateDoc(vehicleRef, {
        status: "available",
        updatedAt: Timestamp.now()
      });
      toast.success("Vehicle marked as available!");
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      toast.error("Failed to update vehicle status");
    }
  };

  const handleThumbnailClick = (vehicleId: string, imageUrl: string) => {
    setSelectedMainImage(prev => ({
      ...prev,
      [vehicleId]: imageUrl
    }));
  };

  const handleAddVehicleClick = () => {
    if (!canAddVehicle()) {
      setShowVIPModal(true);
      return;
    }
    setShowVehicleForm(true);
  };

  // Location Operations
  const startEditLocation = () => {
    setEditingLocation(true);
    setCity(driverData?.city || "");
    setState(driverData?.state || "");
  };

  const updateLocation = async () => {
    if (!city.trim() || !state.trim()) {
      toast.error("Please enter both city and state");
      return;
    }

    setSavingLocation(true);
    try {
      const userRef = doc(db, "users", driverId);
      await updateDoc(userRef, {
        city: city.trim(),
        state: state.trim(),
        updatedAt: Timestamp.now()
      });
      toast.success("Location updated successfully!");
      setEditingLocation(false);
    } catch (err) {
      console.error("Error updating location:", err);
      toast.error("Failed to update location");
    } finally {
      setSavingLocation(false);
    }
  };

  const cancelLocationEdit = () => {
    setEditingLocation(false);
    setCity(driverData?.city || "");
    setState(driverData?.state || "");
  };

  const handleLocationChange = (field: string, value: string) => {
    if (field === 'city') setCity(value);
    if (field === 'state') setState(value);
  };

  const toggleWhatsappPreference = async () => {
    const newValue = !whatsappPreferred;
    try {
      const userRef = doc(db, "users", driverId);
      await updateDoc(userRef, {
        whatsappPreferred: newValue,
        updatedAt: Timestamp.now()
      });
      setWhatsappPreferred(newValue);
      toast.success(`WhatsApp preference ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("Error updating WhatsApp preference:", err);
      toast.error("Failed to update preference");
    }
  };

  const handleVIPPurchase = async (level: number) => {
    try {
      router.push(`/user/purchase?level=${level}`);
    } catch (err) {
      console.error("Error redirecting to purchase:", err);
      toast.error("Failed to redirect to purchase page");
    }
  };

  const handleRateTrip = (driverId: string, vehicleId: string) => {
    router.push(`/user/car-hire?driver=${driverId}&vehicle=${vehicleId}&rate=true#search-results`);
  };

  const resetVehicleForm = () => {
    // Form reset handled by modal internal state
  };

  // Fetch Data Effect
  useEffect(() => {
    if (!driverId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        await initializeVIPFields(driverId);

        const userRef = doc(db, "users", driverId);
        const unsubUser = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            const profileImage = data.profileImage || data.photoURL || "";
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || "Professional Driver";
            const verified = data.verified || false;
            const customersCarried = data.customersCarried || [];

            const referralCount = data.referralCount || 0;
            const purchasedVipLevel = data.purchasedVipLevel || 0;
            let vipLevel = data.vipLevel || 0;
            let prestigeLevel = data.prestigeLevel || 0;

            const storedVipLevel = getStoredVipLevel(driverId);
            const calculatedVIP = calculateVIPDetails(referralCount, purchasedVipLevel);

            if (calculatedVIP.vipLevel !== vipLevel || calculatedVIP.prestigeLevel !== prestigeLevel) {
              vipLevel = calculatedVIP.vipLevel;
              prestigeLevel = calculatedVIP.prestigeLevel;

              if (storedVipLevel !== null && vipLevel > storedVipLevel) {
                const newLevelName = VIP_CONFIG.levels[vipLevel - 1]?.name;
                toast.success(`🎉 Congratulations! You've reached ${newLevelName}!`, {
                  duration: 5000,
                  icon: '⭐',
                });
              }

              try {
                await updateDoc(userRef, {
                  vipLevel: vipLevel,
                  prestigeLevel: prestigeLevel,
                  updatedAt: Timestamp.now()
                });
              } catch (updateError) {
                console.error("Error updating VIP levels:", updateError);
              }
            }

            setStoredVipLevel(driverId, vipLevel);

            setDriverData({ ...data, profileImage, fullName });
            setReferralCount(referralCount);
            setVipLevel(vipLevel);
            setPurchasedVipLevel(purchasedVipLevel);
            setPrestigeLevel(prestigeLevel);
            setIsVerified(verified);
            setCustomersCarried(customersCarried.length || 0);

            setCity(data.city || "");
            setState(data.state || "");
            setWhatsappPreferred(data.whatsappPreferred || false);

            if (data.ratings && Array.isArray(data.ratings)) {
              const ratingsArray: number[] = [];
              data.ratings.forEach((rating: any) => {
                if (typeof rating === 'number') {
                  ratingsArray.push(rating);
                } else if (rating && typeof rating === 'object' && 'rating' in rating) {
                  ratingsArray.push(rating.rating);
                }
              });
              setRatings(ratingsArray);
            }

            if (data.comments && Array.isArray(data.comments)) {
              const commentsList: Comment[] = data.comments.map((comment: any, index: number) => ({
                id: `comment-${index}`,
                passengerId: comment.userId || comment.passengerId || "",
                passengerName: comment.userName || comment.passengerName || "Anonymous",
                text: comment.text || comment.comment || "",
                createdAt: comment.createdAt || Timestamp.now(),
                driverId: comment.driverId || driverId
              }));
              setComments(commentsList);
            }

            if (data.contactedDrivers) {
              setContactedDrivers(data.contactedDrivers);
            }

            loadTripHistory();
          }
        });

        const vehiclesRef = collection(db, "vehicleLog");
        const qVehicles = query(vehiclesRef, where("driverId", "==", driverId));
        const unsubVehicles = onSnapshot(qVehicles, snapshot => {
          const list: Vehicle[] = [];
          snapshot.forEach(docSnap => {
            const vehicleData = { id: docSnap.id, ...(docSnap.data() as any) };
            list.push(vehicleData);
            if (vehicleData.id && !selectedMainImage[vehicleData.id]) {
              setSelectedMainImage(prev => ({
                ...prev,
                [vehicleData.id]: vehicleData.images.front
              }));
            }
          });
          setVehicles(list);
        });

        setLoading(false);
        return () => {
          unsubUser();
          unsubVehicles();
        };
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile");
        setLoading(false);
      }
    };

    fetchData();
  }, [driverId]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <LoadingRound />
    </div>
  );

  if (!driverId) return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-lg lg:text-xl font-semibold text-red-600 bg-white p-6 rounded-xl shadow-lg">Driver ID not found</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-6 md:p-8">
      <Toaster position="top-right" />

      {/* VIP Limit Modal */}
      {showVIPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setShowVIPModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl transition-colors"
            >
              ×
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                <VIPStar level={vipLevel || 1} size="lg" showLabel={false} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {vipLevel === 0 ? 'Upgrade to VIP Driver' : 'Upgrade VIP Level'}
              </h3>
              <p className="text-gray-600 mb-4">
                {vipLevel === 0
                  ? "You can only add 2 vehicles as a regular driver. Upgrade to VIP to add more vehicles!"
                  : `You can add up to ${vipLevel <= 3 ? '10' : 'unlimited'} vehicles at VIP Level ${vipLevel}. Upgrade to add more!`}
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-green-800 mb-2">VIP Vehicle Limits:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Regular Driver: <strong>2 vehicles max</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Green/Yellow/Purple VIP: <strong>10 vehicles max</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Gold/Black VIP: <strong>Unlimited vehicles</strong></span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              <button
                onClick={() => setShowVIPModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowVIPModal(false);
                  setShowVIPUpgradeModal(true);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all text-center"
              >
                {vipLevel > 0 ? 'Upgrade Level' : 'Become VIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP Upgrade Modal */}
      {showVIPUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setShowVIPUpgradeModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl transition-colors"
            >
              ×
            </button>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {vipLevel > 0 ? 'Upgrade VIP Level' : 'Become a VIP Driver'}
              </h3>
              <p className="text-gray-600">Earn through referrals or purchase to level up!</p>
            </div>

            {/* Current VIP Status */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <VIPStar level={vipLevel} prestigeLevel={prestigeLevel} size="lg" showLabel={true} />
                  <div>
                    <h4 className="font-semibold text-gray-800">Current Status</h4>
                    <p className="text-sm text-gray-600">
                      {vipLevel > 0 ? (
                        vipLevel < VIP_CONFIG.maxLevel ? (
                          `Need ${vipDetails.nextReferralsNeeded} more referrals for next level`
                        ) : (
                          `Prestige Level ${prestigeLevel}`
                        )
                      ) : (
                        "Start your VIP journey!"
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-2xl font-bold text-gray-800">{referralCount}</div>
                  <div className="text-sm text-gray-600">Total Referrals</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress to {vipLevel > 0 ? vipDetails.nextLevelName : 'Green VIP'}</span>
                  <span>
                    {referralCount}/{vipLevel > 0 ? vipDetails.referralsForNext : VIP_CONFIG.levels[0].referralsRequired}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                    style={{ width: `${vipLevel > 0 ? vipDetails.progressPercentage : (referralCount / VIP_CONFIG.levels[0].referralsRequired) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* VIP Levels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {VIP_CONFIG.levels.map((level) => {
                const isCurrentLevel = vipLevel === level.level;
                const isUnlocked = vipLevel >= level.level;
                const canPurchase = purchasedVipLevel < level.level;
                const canEarnByReferral = referralCount >= level.referralsRequired;

                return (
                  <div
                    key={level.level}
                    className={`border rounded-xl p-4 transition-all duration-300 ${isCurrentLevel
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : isUnlocked
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                  >
                    <div className="flex justify-center mb-3">
                      <VIPStar level={level.level} size="lg" showLabel={false} />
                    </div>
                    <h4 className="text-lg font-semibold text-center mb-2">{level.name}</h4>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Referrals Needed:</span>
                        <span className={`font-medium ${canEarnByReferral ? 'text-green-600' : ''}`}>
                          {level.referralsRequired}
                          {canEarnByReferral && ' ✓'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium">₦{level.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${isCurrentLevel ? 'text-green-600' :
                          isUnlocked ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                          {isCurrentLevel ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleVIPPurchase(level.level)}
                        disabled={!canPurchase}
                        className={`w-full py-2 rounded-lg font-medium transition-all ${!canPurchase
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                          }`}
                      >
                        {!canPurchase ? 'Already Unlocked' : 'Purchase Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-purple-800 mb-2">How VIP Works:</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>Two Ways to Level Up:</strong> Get referrals OR purchase directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>Vehicle Limits:</strong> Regular (2), VIP 1-3 (10), VIP 4-5 (Unlimited)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>Search Priority:</strong> Higher VIP levels appear first in search results</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-amber-800 mb-2">Earn VIP Through Referrals</h4>
              <p className="text-sm text-gray-700 mb-3">
                {vipLevel > 0
                  ? `You have ${referralCount} referrals. Need ${vipDetails.nextReferralsNeeded} more for next level!`
                  : `You have ${referralCount} referrals. Need ${VIP_CONFIG.levels[0].referralsRequired - referralCount} more to become Green VIP!`
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <ShareButton
                    userId={driverId}
                    title="Book a Professional Driver on Nomopoventures!"
                    text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
                  />
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowVIPUpgradeModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl text-red-600">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Vehicle</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this vehicle? This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setVehicleToDelete(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={removeVehicle}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-center"
              >
                Delete Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Location Toggle Section */}
      <div className="mb-6">
        <DriverLocationToggle
          driverId={driverId}
          vehicleId={vehicles.length > 0 ? vehicles[0].id : undefined}
        />
      </div>

      {/* Driver Header Component */}
      <DriverHeader
        driverData={driverData}
        vipLevel={vipLevel}
        prestigeLevel={prestigeLevel}
        isVerified={isVerified}
        referralCount={referralCount}
        customersCarried={customersCarried}
        averageRating={averageRating}
        ratingsCount={ratings.length}
        vehiclesCount={vehicles.length}
        canAddVehicle={canAddVehicle()}
        onAddVehicle={handleAddVehicleClick}
        onUpgradeVIP={() => setShowVIPUpgradeModal(true)}
        onPlayGame={() => setGame(true)}
        onEditLocation={startEditLocation}
        isEditingLocation={editingLocation}
        editingLocationData={{ city, state }}
        onLocationChange={handleLocationChange}
        onUpdateLocation={updateLocation}
        onCancelLocationEdit={cancelLocationEdit}
        isSavingLocation={savingLocation}
        whatsappPreferred={whatsappPreferred}
        onToggleWhatsapp={toggleWhatsappPreference}
        vipDetails={vipDetails}
      />

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        isOpen={showVehicleForm}
        onClose={() => {
          setShowVehicleForm(false);
          setEditingVehicle(null);
        }}
        onSubmit={submitVehicle}
        editingVehicle={editingVehicle}
        isLoading={savingVehicle}
        canAddVehicle={canAddVehicle()}
        vehicleLimitMessage={getVehicleLimitMessage()}
      />

      {/* Word Guessing Game */}
      {game && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto relative">
            <button
              onClick={() => setGame(false)}
              className="bg-gray-800 p-2 px-4 rounded-lg absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-20 transition-colors"
            >
              ✕
            </button>
            <WordGuessGame />
          </div>
        </div>
      )}

      {/* Vehicles Section */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-2">
          <h2 className="text-xl font-bold text-gray-800">My Vehicles</h2>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} added
            {!canAddVehicle() && vipLevel > 0 && vipLevel <= 3 && (
              <span className="ml-2 text-amber-600 font-semibold">• VIP {vipLevel >= 4 ? 'Gold+' : 'Upgrade'} for more</span>
            )}
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-gray-400 text-5xl mb-3">🚗</div>
            <p className="text-gray-500 mb-2">No vehicles yet</p>
            <p className="text-sm text-gray-400 mb-4">Click "Add Vehicle" to create your first vehicle</p>
            <button
              onClick={handleAddVehicleClick}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium shadow-md"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                selectedMainImage={selectedMainImage[v.id!] || v.images.front}
                onThumbnailClick={(imageUrl) => handleThumbnailClick(v.id!, imageUrl)}
                onEdit={() => startEdit(v)}
                onDelete={() => confirmDeleteVehicle(v.id)}
                onMarkAvailable={() => markVehicleAsAvailable(v.id!)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Contact History and Trip History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Contact History */}
        <section className="bg-white shadow-xl rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Drivers You Contacted</h2>

          {contactedDrivers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">👨‍✈️</div>
              <p className="text-gray-500 text-sm">You haven't contacted any drivers yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {contactedDrivers.map((driver, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-2xl">👨‍✈️</span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-800">
                        {driver.driverName || "Driver"}
                      </h3>
                      <p className="text-gray-600 text-xs mt-0.5">
                        📱 {driver.phoneNumber || "No phone"}
                      </p>
                      <p className="text-gray-500 text-xs mt-1 truncate">
                        🚗 {driver.vehicleName || "Vehicle"} • {driver.vehicleModel}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        📅 {formatDate(driver.contactDate || driver.lastContacted)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trip History */}
        <section className="bg-white shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Trip History</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
              {tripHistory.length} trips
            </span>
          </div>

          {loadingTripHistory ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading trip history...</p>
            </div>
          ) : tripHistory.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {tripHistory.map((trip, index) => (
                <TripHistoryCard
                  key={trip.id || index}
                  trip={trip}
                  onRateTrip={() => handleRateTrip(trip.driverId, trip.vehicleId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-dashed border-gray-300">
              <div className="text-gray-400 text-5xl mb-3">🚗</div>
              <p className="text-gray-500 text-sm mb-3">No trip history yet</p>
              <button
                onClick={() => router.push('/user/car-hire')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md"
              >
                Book Your First Trip
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Comments Section */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl rounded-2xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-2">
          <h2 className="text-xl font-bold text-white">Customer Comments</h2>
          {comments.length > 0 && (
            <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
              ({comments.length} comments)
            </div>
          )}
        </div>

        {comments.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No comments yet.</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {comments.slice(0, 5).map((c, index) => (
              <div key={c.id || index} className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-amber-400">
                    {c.passengerName || 'Anonymous'}
                  </p>
                  {c.createdAt && (
                    <p className="text-xs text-gray-400">
                      {c.createdAt.toDate ? c.createdAt.toDate().toLocaleDateString() : formatDate(c.createdAt)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-300">{c.text}</p>
              </div>
            ))}
            {comments.length > 5 && (
              <div className="text-center mt-4">
                <button className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
                  View all {comments.length} comments →
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Promotion Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl overflow-hidden shadow-lg">
          <div className="h-40 bg-blue-100 overflow-hidden">
            <img
              src="/driverShareProfile.jpeg"
              alt="Driver Sharing Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg">
                🔗
              </div>
              <h3 className="font-bold text-blue-800">Share Link to Upgrade Your VIP Status</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Share your driver profile! Get referrals to climb VIP levels. Higher VIP levels get priority in search results and more bookings!
            </p>
            <div className="mt-4">
              <ShareButton
                userId={driverId}
                title="Book a Professional Driver on Nomopoventures!"
                text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl overflow-hidden shadow-lg">
          <div className="h-40 bg-yellow-100 overflow-hidden">
            <img
              src="/vipcard.avif"
              alt="VIP Driver Benefits"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-lg">
                ⭐
              </div>
              <h3 className="font-bold text-yellow-800">
                {vipLevel > 0 ? 'Upgrade Your VIP Level' : 'Become a VIP Driver'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              VIP drivers appear first in search results and get more bookings!
            </p>
            <button
              onClick={() => setShowVIPUpgradeModal(true)}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-2.5 rounded-xl font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md"
            >
              {vipLevel > 0 ? 'Upgrade VIP Level' : 'Become VIP'}
            </button>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-center shadow-xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-3">
          We're Here to Help
        </h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          For complaints, enquiries, reports and much more — our team is available
          <span className="text-white font-semibold"> 24/7</span>.
        </p>
        <a
          href="mailto:nomopoventures@yahoo.com"
          className="inline-block bg-red-700 hover:bg-red-600 px-8 py-3 rounded-xl text-white font-semibold transition-all shadow-lg"
        >
          Contact Us Today!
        </a>
      </div>
    </div>
  );
}