// app/driver/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import {
  doc, collection, addDoc, updateDoc, deleteDoc, query, where,
  onSnapshot, getDoc, Timestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { Vehicle, Comment, VIP_CONFIG } from "@/components/driversProfile/driver";
import { DriverHeader } from "@/components/driversProfile/DriverHeader";
import { VehicleFormModal } from "@/components/driversProfile/VehicleFormModal";
import WordGuessGame from "@/components/wordGame/wordGuessGame";
import LoadingRound from "@/components/re-useable-loading";
import DriverLocationToggle from "@/components/map/DriverLocationToggle";

// Import the new components
import { VIPModals } from "@/components/driversProfile/mainPage/VIPModals";
import { DeleteVehicleModal } from "@/components/driversProfile/mainPage/DeleteVehicleModal";
import { VehicleSection } from "@/components/driversProfile/mainPage/VehicleSection";
import { HistorySection } from "@/components/driversProfile/mainPage/HistorySection";
import { PromotionalSection } from "@/components/driversProfile/mainPage/PromotionalSection";

// Helper functions (keep as is)
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

      const uploadPromises = [
        images.front ? uploadImage(images.front, `vehicleLog/${driverId}/${timestamp}_front_${images.front.name}`, "Front view") : Promise.resolve(null),
        images.side ? uploadImage(images.side, `vehicleLog/${driverId}/${timestamp}_side_${images.side.name}`, "Side view") : Promise.resolve(null),
        images.back ? uploadImage(images.back, `vehicleLog/${driverId}/${timestamp}_back_${images.back.name}`, "Back view") : Promise.resolve(null),
        images.interior ? uploadImage(images.interior, `vehicleLog/${driverId}/${timestamp}_interior_${images.interior.name}`, "Interior view") : Promise.resolve(null),
        images.license ? uploadImage(images.license, `vehicleLog/${driverId}/${timestamp}_license_${images.license.name}`, "License document") : Promise.resolve(null),
        images.ownership ? uploadImage(images.ownership, `vehicleLog/${driverId}/${timestamp}_ownership_${images.ownership.name}`, "Ownership document") : Promise.resolve(null),
        images.insurance ? uploadImage(images.insurance, `vehicleLog/${driverId}/${timestamp}_insurance_${images.insurance.name}`, "Insurance document") : Promise.resolve(null)
      ];

      const results = await Promise.allSettled(uploadPromises)
        .then((resultArr) => resultArr.map((result) => result.status === 'fulfilled' ? result.value : null));

      const [frontUrl, sideUrl, backUrl, interiorUrl, licenseUrl, ownershipUrl, insuranceUrl] = results;

      const vehicleDoc = {
        driverId,
        ...formData,
        images: {
          front: frontUrl || editingVehicle?.images?.front || "",
          side: sideUrl || editingVehicle?.images?.side || "",
          back: backUrl || editingVehicle?.images?.back || "",
          interior: interiorUrl || editingVehicle?.images?.interior || "",
          license: licenseUrl || editingVehicle?.images?.license || "",
          ownership: ownershipUrl || editingVehicle?.images?.ownership || "",
          insurance: insuranceUrl || editingVehicle?.images?.insurance || ""
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

  const handleAddVehicleClick = () => {
    if (!canAddVehicle()) {
      setShowVIPModal(true);
      return;
    }
    setShowVehicleForm(true);
  };

  // Location Operations
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
      router.push(`/user/purchase?userId=${driverId}`);
    } catch (err) {
      console.error("Error redirecting to purchase:", err);
      toast.error("Failed to redirect to purchase page");
    }
  };

  const handleRateTrip = (driverId: string, vehicleId: string) => {
    router.push(`/user/car-hire?driver=${driverId}&vehicle=${vehicleId}&rate=true#search-results`);
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
    <div className="space-y-12 p-2 md:p-3 min-h-screen bg-gradient-to-br from-gray-700 via-gray-600 to-black grid grid-cols-1 items-center justify-center">


      {/* VIP Modals */}
      <VIPModals
        showVIPModal={showVIPModal}
        setShowVIPModal={setShowVIPModal}
        vipLevel={vipLevel}
        driverId={driverId}
        onVIPPurchase={handleVIPPurchase}
      />

      {/* Delete Confirmation Modal */}
      <DeleteVehicleModal
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        onDelete={removeVehicle}
        setVehicleToDelete={setVehicleToDelete}
      />

      {/* Live Location Toggle Section */}
      <div className="bg-white border-1 border-slate-50 mb-2 rounded-md md:rounded-xl">
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
        onUpgradeVIP={() => handleVIPPurchase(0)}
        onPlayGame={() => setGame(true)}
        onBuyTicket={() => router.push(`/user/ticket?userId=${driverId}`)}
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
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <WordGuessGame onClose={() => setGame(false)} />
        </div>
      )}

      {/* Vehicles Section */}
      <VehicleSection
        vehicles={vehicles}
        vipLevel={vipLevel}
        vehiclesCount={vehicles.length}
        onAddVehicle={() => setShowVehicleForm(true)}
        onUpgradeVIP={() => handleVIPPurchase(0)}
        onEditVehicle={startEdit}
        onDeleteVehicle={confirmDeleteVehicle}
        onMarkAvailable={markVehicleAsAvailable}
      />

      {/* History Section */}
      <HistorySection
        contactedDrivers={contactedDrivers}
        tripHistory={tripHistory}
        loadingTripHistory={loadingTripHistory}
        formatDate={formatDate}
        onRateTrip={handleRateTrip}
        comments={comments}
        formatDateFn={formatDate}
      />

      {/* Promotional Section */}
      <PromotionalSection
        driverId={driverId}
        vipLevel={vipLevel}
        onUpgradeVIP={() => handleVIPPurchase(0)}
      />

      <p className="mt-36 pb-10 text-gray-500 font-bold italic text-center text-[10px]">Powered by Nomop Ventures&reg;</p>

    </div>
  );
}