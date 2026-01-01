"use client"

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import {
  doc, collection, addDoc, updateDoc, deleteDoc, query, where,
  onSnapshot, getDoc, Timestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import TransportNewsPageUi from "../components/news";
import WordGuessGame from "../components/game";
import ShareButton from "@/components/sharebutton";
import LoadingRound from "@/components/re-useable-loading";
import DriverLocationToggle from "@/components/map/DriverLocationToggle";
import TripHistoryCard from "@/components/map/TripHistoryCard";
import { toast, Toaster } from "react-hot-toast";

// Helper functions for persisting VIP level across sessions
const getStoredVipLevel = (driverId: string): number | null => {
  try {
    const stored = localStorage.getItem(`driver-${driverId}-vipLevel`);
    return stored ? parseInt(stored) : null;
  } catch {
    // localStorage might be unavailable (SSR, private browsing)
    return null;
  }
};

const setStoredVipLevel = (driverId: string, level: number) => {
  try {
    localStorage.setItem(`driver-${driverId}-vipLevel`, level.toString());
  } catch {
    // Ignore localStorage errors (SSR, private browsing)
  }
};

// Capitalize full name
const capitalizeFullName = (name: string) =>
  name?.split(" ").filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || "Professional Driver";

// VIP Configuration
const VIP_CONFIG = {
  levels: [
    { level: 1, name: "Green VIP", color: "green", stars: 1, referralsRequired: 15, price: 5000 },
    { level: 2, name: "Yellow VIP", color: "yellow", stars: 2, referralsRequired: 20, price: 7500 },
    { level: 3, name: "Purple VIP", color: "purple", stars: 3, referralsRequired: 25, price: 11000 },
    { level: 4, name: "Gold VIP", color: "gold", stars: 4, referralsRequired: 30, price: 15000 },
    { level: 5, name: "Black VIP", color: "black", stars: 5, referralsRequired: 35, price: 20000 },
  ],
  maxLevel: 5,
  referralMultiplier: 5,
};

// Helper function to calculate VIP details with expiry
const calculateVIPDetails = (referralCount: number, purchasedVipLevel: number, vipExpiryDate?: Timestamp) => {
  let referralBasedLevel = 0;
  for (let i = 0; i < VIP_CONFIG.levels.length; i++) {
    if (referralCount >= VIP_CONFIG.levels[i].referralsRequired) {
      referralBasedLevel = VIP_CONFIG.levels[i].level;
    } else {
      break;
    }
  }

  // Check if VIP has expired
  const isExpired = vipExpiryDate ? vipExpiryDate.toDate() < new Date() : false;
  
  // If expired, reset purchased VIP level to 0
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
}; //chnaged.......................1

// Initialize VIP fields if they don't exist
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

      // Check if VIP has expired and reset if needed
      const now = new Date();
      if (data.vipExpiryDate && data.vipExpiryDate.toDate() < now) {
        updates.purchasedVipLevel = 0;
        updates.vipLevel = 0;
        updates.vipExpiryDate = null;
        updates.vipPurchaseDate = null;
        needsUpdate = true;
        
        // Also reset prestige level if needed
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
}; //chnaged.......................2

// VIP Star Component
const VIPStar = ({ level, prestigeLevel = 0, size = "md", showLabel = true, isExpired = false }: {
  level: number,
  prestigeLevel?: number,
  size?: "sm" | "md" | "lg",
  showLabel?: boolean,
  isExpired?: boolean
}) => {
  if (level <= 0) return null;

  const vipDetails = VIP_CONFIG.levels[level - 1];
  if (!vipDetails) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const getStarColor = (color: string) => {
    const colors: any = {
      green: "text-green-500",
      yellow: "text-yellow-500",
      purple: "text-purple-500",
      gold: "text-yellow-600",
      black: "text-gray-700"
    };
    return colors[color] || colors.green;
  };

  const getBackgroundColor = (color: string) => {
    const colors: any = {
      green: "bg-gradient-to-br from-green-100 to-green-300 border-green-300",
      yellow: "bg-gradient-to-br from-yellow-100 to-yellow-300 border-yellow-300",
      purple: "bg-gradient-to-br from-purple-100 to-purple-300 border-purple-300",
      gold: "bg-gradient-to-br from-yellow-200 to-yellow-400 border-yellow-400",
      black: "bg-gradient-to-br from-gray-800 to-black border-gray-700"
    };
    return colors[color] || colors.green;
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getBackgroundColor(vipDetails.color)} border shadow-sm ${isExpired ? 'opacity-60' : ''}`}>
      {isExpired && (
        <span className="text-xs text-red-600 font-semibold mr-1">EXPIRED</span>
      )}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: vipDetails.stars }).map((_, i) => (
          <svg
            key={i}
            className={`${sizeClasses[size]} ${getStarColor(vipDetails.color)} fill-current ${isExpired ? 'opacity-50' : ''}`}
            viewBox="0 0 24 24"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
      </div>
      {prestigeLevel > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          vipDetails.color === 'black' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'
          }`}>
          LV{prestigeLevel}
        </span>
      )}
      {showLabel && (
        <span className={`text-xs font-semibold ${
          vipDetails.color === 'black' ? 'text-white' : vipDetails.color === 'gold' ? 'text-gray-900' : 'text-gray-800'
          }`}>
          {vipDetails.name}
          {isExpired && ' (Expired)'}
        </span>
      )}
    </div>
  );
};// Changed........................4

interface Vehicle {
  id?: string;
  driverId: string;
  carName: string;
  carModel: string;
  carType: string;
  passengers: number;
  ac: boolean;
  plateNumber: string;
  exteriorColor: string;
  interiorColor: string;
  images: { front: string; side: string; back: string; interior: string; };
  description?: string;
  status?: "available" | "unavailable" | "maintenance";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface Comment {
  id: string;
  passengerId: string;
  passengerName: string;
  text: string;
  createdAt: Timestamp;
  driverId: string;
}

export default function DriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const driverId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState<any>(null);
  const [game, setGame] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showVIPUpgradeModal, setShowVIPUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [whatsappPreferred, setWhatsappPreferred] = useState(false);

  const [carName, setCarName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("sedan");
  const [passengers, setPassengers] = useState<number>(4);
  const [ac, setAc] = useState<boolean>(true);
  const [plateNumber, setPlateNumber] = useState("");
  const [description, setDescription] = useState("");
  const [exteriorColor, setExteriorColor] = useState("");
  const [interiorColor, setInteriorColor] = useState("");
  const [vehicleStatus, setVehicleStatus] = useState<"available" | "unavailable" | "maintenance">("available");

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [interiorFile, setInteriorFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<{ front?: string; side?: string; back?: string; interior?: string }>({});

  const [comments, setComments] = useState<Comment[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [vipLevel, setVipLevel] = useState<number>(0);
  const [purchasedVipLevel, setPurchasedVipLevel] = useState<number>(0);
  const [prestigeLevel, setPrestigeLevel] = useState<number>(0);
  const [customersCarried, setCustomersCarried] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [ratings, setRatings] = useState<number[]>([]);

  const [contactedDrivers, setContactedDrivers] = useState<any[]>([]);
  const [selectedMainImage, setSelectedMainImage] = useState<{ [key: string]: string }>({});

  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [loadingTripHistory, setLoadingTripHistory] = useState(false);

  const vipDetails = calculateVIPDetails(referralCount, purchasedVipLevel);

  // Check vehicle limits based on VIP level
  const canAddVehicle = () => {
    if (vipLevel === 0) return vehicles.length < 2;
    if (vipLevel >= 1 && vipLevel <= 3) return vehicles.length < 10;
    if (vipLevel >= 4) return true;
    return false;
  };

  // Helper function for vehicle limit message
  const getVehicleLimitMessage = () => {
    if (vipLevel === 0) {
      return "Regular drivers can add up to 2 vehicles. Upgrade to VIP for more!";
    } else if (vipLevel >= 1 && vipLevel <= 3) {
      return `VIP Level ${vipLevel} drivers can add up to 10 vehicles. Upgrade to Gold/Black VIP for unlimited vehicles!`;
    } else if (vipLevel >= 4) {
      return "Gold/Black VIP drivers have unlimited vehicles!";
    }
    return "";
  };

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

            // Get stored VIP level for this driver
            const storedVipLevel = getStoredVipLevel(driverId);
            
            // Calculate what the VIP level should be
            const calculatedVIP = calculateVIPDetails(referralCount, purchasedVipLevel);
            
            // Check if we need to update the VIP level in Firestore
            if (calculatedVIP.vipLevel !== vipLevel || calculatedVIP.prestigeLevel !== prestigeLevel) {
              vipLevel = calculatedVIP.vipLevel;
              prestigeLevel = calculatedVIP.prestigeLevel;
              
              // Show congratulatory toast ONLY if this is a real level-up
              // (storedVipLevel is null on first load, so no toast on initial page load)
              if (storedVipLevel !== null && vipLevel > storedVipLevel) {
                const newLevelName = VIP_CONFIG.levels[vipLevel - 1]?.name;
                toast.success(`🎉 Congratulations! You've reached ${newLevelName}!`, {
                  duration: 5000,
                  icon: '⭐',
                });
              }
              
              // Update VIP level in Firestore
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
            
            // Always update localStorage with current VIP level
            setStoredVipLevel(driverId, vipLevel);

            // Update state with the data
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

  const averageRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : "0.0";

  useEffect(() => {
    const newPreviews: any = {};
    if (frontFile) newPreviews.front = URL.createObjectURL(frontFile);
    if (sideFile) newPreviews.side = URL.createObjectURL(sideFile);
    if (backFile) newPreviews.back = URL.createObjectURL(backFile);
    if (interiorFile) newPreviews.interior = URL.createObjectURL(interiorFile);
    setPreviews(newPreviews);

    return () => { Object.values(newPreviews).forEach((url: any) => url && URL.revokeObjectURL(url)); };
  }, [frontFile, sideFile, backFile, interiorFile]);

  // Load trip history
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

          const tripHistoryItem = {
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
          };

          tripsList.push(tripHistoryItem);
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

  // Handle rate trip
  const handleRateTrip = (driverId: string, vehicleId: string) => {
    router.push(`/user/car-hire?driver=${driverId}&vehicle=${vehicleId}&rate=true#search-results`);
  };

  const submitVehicle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingVehicle(true);

    try {
      const errors: string[] = [];

      if (!carName.trim()) errors.push("Vehicle name is required");
      if (!carModel.trim()) errors.push("Vehicle model is required");
      if (!plateNumber.trim()) errors.push("Plate number is required");
      if (!exteriorColor.trim()) errors.push("Exterior color is required");
      if (!interiorColor.trim()) errors.push("Interior color is required");
      if (!carType.trim()) errors.push("Vehicle type is required");

      const plateRegex = /^[A-Z0-9]{3,10}$/i;
      if (plateNumber.trim() && !plateRegex.test(plateNumber.trim())) {
        errors.push("Plate number should be 3-10 alphanumeric characters");
      }

      const colorRegex = /^[a-zA-Z\s]{2,20}$/;
      if (exteriorColor.trim() && !colorRegex.test(exteriorColor.trim())) {
        errors.push("Exterior color should be 2-20 letters only");
      }
      if (interiorColor.trim() && !colorRegex.test(interiorColor.trim())) {
        errors.push("Interior color should be 2-20 letters only");
      }

      if (!editingVehicle) {
        const requiredImages = [
          { file: frontFile, label: "Front view" },
          { file: sideFile, label: "Side view" },
          { file: backFile, label: "Back view" },
          { file: interiorFile, label: "Interior view" }
        ];

        requiredImages.forEach(({ file, label }) => {
          if (!file) {
            errors.push(`${label} photo is required`);
          } else {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
              errors.push(`${label} must be a JPG, PNG, or WebP image`);
            }

            if (file.size > 5 * 1024 * 1024) {
              errors.push(`${label} image must be less than 5MB`);
            }
          }
        });
      }

      if (editingVehicle) {
        const filesToCheck = [
          { file: frontFile, label: "Front view" },
          { file: sideFile, label: "Side view" },
          { file: backFile, label: "Back view" },
          { file: interiorFile, label: "Interior view" }
        ];

        filesToCheck.forEach(({ file, label }) => {
          if (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
              errors.push(`${label} must be a JPG, PNG, or WebP image`);
            }

            if (file.size > 5 * 1024 * 1024) {
              errors.push(`${label} image must be less than 5MB`);
            }
          }
        });
      }

      if (!editingVehicle && !canAddVehicle()) {
        errors.push(`Vehicle limit reached! ${getVehicleLimitMessage()}`);
      }

      if (errors.length > 0) {
        const errorMessage = errors.join('\n• ');
        toast.error(`Please fix the following:\n• ${errorMessage}`, {
          duration: 5000,
        });
        setSavingVehicle(false);
        return;
      }

      const uploadWithProgress = async (file: File | null, path: string, label: string): Promise<string | null> => {
        if (!file) return null;

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

      const timestamp = Date.now();

      const uploadPromises = [];

      if (frontFile) {
        uploadPromises.push(
          uploadWithProgress(
            frontFile,
            `vehicleLog/${driverId}/${timestamp}_front_${frontFile.name}`,
            "Front view"
          )
        );
      }

      if (sideFile) {
        uploadPromises.push(
          uploadWithProgress(
            sideFile,
            `vehicleLog/${driverId}/${timestamp}_side_${sideFile.name}`,
            "Side view"
          )
        );
      }

      if (backFile) {
        uploadPromises.push(
          uploadWithProgress(
            backFile,
            `vehicleLog/${driverId}/${timestamp}_back_${backFile.name}`,
            "Back view"
          )
        );
      }

      if (interiorFile) {
        uploadPromises.push(
          uploadWithProgress(
            interiorFile,
            `vehicleLog/${driverId}/${timestamp}_interior_${interiorFile.name}`,
            "Interior view"
          )
        );
      }

      const [frontUrl, sideUrl, backUrl, interiorUrl] = await Promise.allSettled(uploadPromises)
        .then((results) => {
          return results.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              throw new Error(`Upload failed: ${result.reason}`);
            }
          });
        });

      const finalFrontUrl = frontUrl || editingVehicle?.images.front;
      const finalSideUrl = sideUrl || editingVehicle?.images.side;
      const finalBackUrl = backUrl || editingVehicle?.images.back;
      const finalInteriorUrl = interiorUrl || editingVehicle?.images.interior;

      const missingImages = [];
      if (!finalFrontUrl) missingImages.push("Front view");
      if (!finalSideUrl) missingImages.push("Side view");
      if (!finalBackUrl) missingImages.push("Back view");
      if (!finalInteriorUrl) missingImages.push("Interior view");

      if (missingImages.length > 0 && !editingVehicle) {
        throw new Error(`Missing required images: ${missingImages.join(', ')}`);
      }

      const vehicleDoc = {
        driverId,
        carName: carName.trim(),
        carModel: carModel.trim(),
        carType: carType.trim(),
        passengers,
        ac,
        plateNumber: plateNumber.trim().toUpperCase(),
        exteriorColor: exteriorColor.trim(),
        interiorColor: interiorColor.trim(),
        status: vehicleStatus,
        images: {
          front: finalFrontUrl!,
          side: finalSideUrl!,
          back: finalBackUrl!,
          interior: finalInteriorUrl!
        },
        description: description.trim(),
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
          console.error("Failed to update user's vehicleLog array:", uErr);
          await deleteDoc(newDocRef);
          throw new Error("Vehicle added but user record couldn't be updated. Please contact support.");
        }

        toast.success("✅ Vehicle added successfully!");
      }

      resetVehicleForm();
      setShowVehicleForm(false);
      setEditingVehicle(null);

    } catch (err: any) {
      console.error("Failed to save vehicle:", err);

      let errorMessage = "Failed to save vehicle";
      if (err.message.includes("storage/unauthorized")) {
        errorMessage = "Storage access denied. Please contact support.";
      } else if (err.message.includes("storage/object-not-found")) {
        errorMessage = "File not found. Please re-upload the images.";
      } else if (err.message.includes("permission-denied")) {
        errorMessage = "Permission denied. You may not have access to perform this action.";
      } else if (err.message.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      toast.error(`${errorMessage}: ${err.message}`, {
        duration: 5000,
      });
    } finally {
      setSavingVehicle(false);
    }
  };

  const startEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setCarName(v.carName);
    setCarModel(v.carModel);
    setCarType(v.carType || "sedan");
    setPassengers(v.passengers);
    setAc(v.ac);
    setPlateNumber(v.plateNumber);
    setDescription(v.description || "");
    setExteriorColor(v.exteriorColor || "");
    setInteriorColor(v.interiorColor || "");
    setVehicleStatus(v.status || "available");
    setPreviews(v.images);
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recently";

    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString("en-GB");
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB");
      }
      return new Date(timestamp).toLocaleDateString("en-GB");
    } catch (error) {
      return "Recently";
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

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }
    setter(file);
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

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingRound />
    </div>
  );

  if (!driverId) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-lg lg:text-xl font-semibold text-red-600">Driver ID not found</div>
    </div>
  );

  return (
    <div className="px-2 py-3 md:p-6 mx-auto">
      <Toaster position="top-right" />

      {/* VIP Modal for vehicle limit */}
      {showVIPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowVIPModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-2xl"
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

      {/* VIP Upgrade Selection Modal */}
      {showVIPUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowVIPUpgradeModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-2xl"
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
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                    style={{ width: `${vipLevel > 0 ? vipDetails.progressPercentage : (referralCount / VIP_CONFIG.levels[0].referralsRequired) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {vipLevel > 0
                    ? `${vipDetails.nextReferralsNeeded} more referrals for next level`
                    : `${VIP_CONFIG.levels[0].referralsRequired - referralCount} more referrals to become Green VIP`
                  }
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

                      {!canEarnByReferral && level.level > vipLevel && (
                        <div className="text-xs text-center text-gray-500">
                          Or get {level.referralsRequired - referralCount} more referrals
                        </div>
                      )}
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
                  <span><strong>Referral Requirements:</strong> 15, 20, 25, 30, 35 referrals for levels 1-5</span>
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
                <div className="text-center sm:text-right">
                  <div className="text-lg font-bold text-amber-800">
                    {vipLevel > 0 ? vipDetails.nextReferralsNeeded : VIP_CONFIG.levels[0].referralsRequired - referralCount}
                  </div>
                  <div className="text-sm text-gray-600">More referrals needed</div>
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

      {/* Live Location Toggle Section */}
      <div className="mb-6">
        <DriverLocationToggle
          driverId={driverId}
          vehicleId={vehicles.length > 0 ? vehicles[0].id : undefined}
        />

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">How This Helps You:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Customers can see how close you are to their location</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Increases your chances of getting booked</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Shows customers you're active and available</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Provides accurate ETAs when customers book</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
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

      {/* Header Card */}
      <div className="bg-white shadow-lg rounded-2xl p-4 lg:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="lg:w-1/2">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 mb-4">
              <div className="relative">
                {/* Profile Image */}
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm">
                  {driverData?.profileImage ? (
                    <img
                      src={driverData.profileImage}
                      alt="Driver Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xl lg:text-2xl font-bold">
                      {driverData?.firstName?.charAt(0).toUpperCase() || "D"}
                      {driverData?.lastName?.charAt(0).toUpperCase() || "D"}
                    </div>
                  )}
                </div>
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center border-2 border-white">
                    ✓
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
                    {driverData?.fullName || "Professional Driver"}
                  </h1>
                  {vipLevel > 0 && (
                    <VIPStar level={vipLevel} prestigeLevel={prestigeLevel} size="md" showLabel={true} />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <p className="text-gray-600 text-sm">
                    📍 {driverData?.city || "City not specified"}, {driverData?.state || "State not specified"}
                  </p>
                  <button
                    onClick={startEditLocation}
                    className="text-blue-500 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                  >
                    ✏️
                  </button>
                </div>

                {editingLocation && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                          className="w-full border border-gray-300 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="State"
                          className="w-full border border-gray-300 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={updateLocation}
                        disabled={savingLocation}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingLocation ? "Saving..." : "Update"}
                      </button>
                      <button
                        onClick={cancelLocationEdit}
                        className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${isVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'}`}>
                    {isVerified ? 'Verified Driver' : 'Unverified'}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      Progress to {vipLevel > 0 ? vipDetails.nextLevelName : 'Green VIP'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {referralCount}/{vipLevel > 0 ? vipDetails.referralsForNext : VIP_CONFIG.levels[0].referralsRequired} referrals
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                      style={{
                        width: `${vipLevel > 0 ? vipDetails.progressPercentage :
                          Math.min((referralCount / VIP_CONFIG.levels[0].referralsRequired) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {vipLevel > 0
                      ? `${vipDetails.nextReferralsNeeded} more referrals for next level`
                      : `${VIP_CONFIG.levels[0].referralsRequired - referralCount} more referrals to become Green VIP`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Preference Toggle */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">📱</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">WhatsApp Preferred</p>
                    <p className="text-xs text-gray-500">
                      {whatsappPreferred
                        ? "Passengers can contact you via WhatsApp"
                        : "Passengers contact you via regular calls"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleWhatsappPreference}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${whatsappPreferred ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${whatsappPreferred ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* VIP Expiry Status */}
            {driverData?.vipExpiryDate && vipLevel > 0 && (
              <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-amber-600">⏰</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800">VIP Status</p>
                      <p className="text-xs text-amber-600">
                        {(() => {
                          const expiryDate = driverData.vipExpiryDate.toDate()
                          const now = new Date()
                          const diffTime = expiryDate.getTime() - now.getTime()
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                          
                          if (diffDays <= 0) {
                            return "VIP has expired"
                          } else if (diffDays <= 7) {
                            return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
                          } else if (diffDays <= 30) {
                            const weeks = Math.floor(diffDays / 7)
                            return `Expires in ${weeks} week${weeks !== 1 ? 's' : ''}`
                          } else {
                            const months = Math.floor(diffDays / 30)
                            return `Valid for ${months} month${months !== 1 ? 's' : ''}`
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const expiryDate = driverData.vipExpiryDate.toDate()
                    const now = new Date()
                    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    
                    if (diffDays <= 30) {
                      return (
                        <button
                          onClick={() => router.push(`/user/purchase?level=${vipLevel}`)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
                        >
                          Renew
                        </button>
                      )
                    }
                    return null
                  })()}
                </div>
                
                {/* Progress bar for expiry */}
                {(() => {
                  const expiryDate = driverData.vipExpiryDate.toDate()
                  const purchaseDate = driverData.vipPurchaseDate?.toDate() || new Date()
                  const now = new Date()
                  
                  const totalDuration = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
                  const elapsed = now.getTime() - purchaseDate.getTime()
                  const percentage = Math.min((elapsed / totalDuration) * 100, 100)
                  
                  return (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-700">Time remaining</span>
                        <span className="text-amber-700">{Math.round(100 - percentage)}%</span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-1.5">
                        <div 
                          className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" 
                          style={{ width: `${100 - percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            {/* Change..................................................3 */}
          </div>

          {/* Stats Grid */}
          <div className="lg:w-1/2 grid grid-cols-2 lg:grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Rating</p>
              <p className="text-xl lg:text-2xl font-bold">{averageRating}</p>
              <p className="text-xs text-gray-500 mt-1">⭐ ({ratings.length} reviews)</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-green-700 mb-1">Customers</p>
              <p className="text-xl lg:text-2xl font-bold">{customersCarried}</p>
              <p className="text-xs text-gray-500 mt-1">Total passengers</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-purple-700 mb-1">Referrals</p>
              <p className="text-xl lg:text-2xl font-bold">{referralCount}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{
                    width: `${vipLevel > 0 ? vipDetails.progressPercentage :
                      Math.min((referralCount / VIP_CONFIG.levels[0].referralsRequired) * 100, 100)}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {vipLevel > 0 ? `VIP Level ${vipLevel}` : `Need ${VIP_CONFIG.levels[0].referralsRequired - referralCount} more for VIP`}
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Vehicles</p>
              <p className="text-xl lg:text-2xl font-bold">{vehicles.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {vipLevel === 0
                  ? `${Math.max(0, 2 - vehicles.length)} more available`
                  : vipLevel <= 3
                    ? `${Math.max(0, 10 - vehicles.length)} more available`
                    : 'Unlimited'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
            <div className="w-full lg:w-auto">
              <ShareButton
                userId={driverId}
                title="Book a Professional Driver on Nomopoventures!"
                text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-2 w-full lg:w-auto">
              <button
                onClick={handleAddVehicleClick}
                className="flex-1 lg:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Add Vehicle {!canAddVehicle() && `(${vehicles.length} added)`}
              </button>

              <button
                onClick={() => setShowVIPUpgradeModal(true)}
                className="flex-1 lg:flex-none bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors text-sm font-medium"
              >
                {vipLevel > 0 ? 'Upgrade VIP' : 'Become VIP'}
              </button>

              <button
                onClick={() => setGame(true)}
                className="flex-1 lg:flex-none bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                🎮 Play Game
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Add Vehicle Form */}
      {showVehicleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-[white] rounded-lg shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowVehicleForm(false);
                setEditingVehicle(null);
                resetVehicleForm();
              }}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>

            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>

            <form onSubmit={submitVehicle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={carName}
                    onChange={(e) => setCarName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Toyota Camry"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2022 LE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plate Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ABC123DE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={carType}
                    onChange={(e) => setCarType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="bus">Bus</option>
                    <option value="keke">Keke</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exterior Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={exteriorColor}
                    onChange={(e) => setExteriorColor(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Red, Blue, Black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interior Color <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={interiorColor}
                    onChange={(e) => setInteriorColor(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Black, Beige, Gray"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passengers <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={10}>10+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={vehicleStatus}
                    onChange={(e) => setVehicleStatus(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ac"
                  checked={ac}
                  onChange={(e) => setAc(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="ac" className="ml-2 text-sm text-gray-700">
                  Air Conditioning Available
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your vehicle features..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Images <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(All 4 photos required, max 5MB each)</span>
                </label>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Front View</label>
                    <div className="relative w-full h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors">
                      {previews.front ? (
                        <img src={previews.front} alt="Front preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">📸</span>
                          <span className="text-xs mt-1">Front</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(setFrontFile, e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={!editingVehicle}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Side View</label>
                    <div className="relative w-full h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors">
                      {previews.side ? (
                        <img src={previews.side} alt="Side preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">📸</span>
                          <span className="text-xs mt-1">Side</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(setSideFile, e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={!editingVehicle}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Back View</label>
                    <div className="relative w-full h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors">
                      {previews.back ? (
                        <img src={previews.back} alt="Back preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">📸</span>
                          <span className="text-xs mt-1">Back</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(setBackFile, e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={!editingVehicle}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Interior View</label>
                    <div className="relative w-full h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-blue-400 transition-colors">
                      {previews.interior ? (
                        <img src={previews.interior} alt="Interior preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl">📸</span>
                          <span className="text-xs mt-1">Interior</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(setInteriorFile, e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={!editingVehicle}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVehicleForm(false);
                    setEditingVehicle(null);
                    resetVehicleForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingVehicle ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Word guessing game section */}
      {game && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto relative">
            <button
              onClick={() => setGame(false)}
              className="bg-gray-800 p-2 px-4 rounded-lg absolute top-10 md:top-4 right-4 text-white text-2xl hover:text-gray-300 z-20"
            >
              ✕
            </button>
            <WordGuessGame />
          </div>
        </div>
      )}

      {/* Vehicles Section */}
      <section className="bg-white shadow-lg rounded-xl p-4 lg:p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-2">
          <h2 className="text-lg lg:text-xl font-semibold">My Vehicles</h2>
          <div className="text-xs text-gray-500">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} added
            {!canAddVehicle() && vipLevel > 0 && vipLevel <= 3 && (
              <span className="ml-2 text-amber-600 font-semibold">• VIP {vipLevel >= 4 ? 'Gold+' : 'Upgrade'} for more</span>
            )}
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-gray-400 text-4xl mb-2">🚗</div>
            <p className="text-gray-500 mb-2">No vehicles yet</p>
            <p className="text-sm text-gray-400 mb-4">Click "Add Vehicle" to create your first vehicle</p>
            <button
              onClick={handleAddVehicleClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="md:py-5 grid grid-cols-1 md:grid-cols-3 overflow-x-auto gap-4 max-h-[65rem]">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-gray-100 border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow"
              >
                <div className="relative w-full h-40 rounded-lg overflow-hidden mb-3">
                  <img
                    src={selectedMainImage[v.id!] || v.images.front}
                    className="w-full h-full object-cover"
                    alt={v.carName}
                  />

                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'available' ? 'bg-green-100 text-green-800' :
                      v.status === 'unavailable' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {v.status ? `${v.status.charAt(0).toUpperCase()}${v.status.slice(1)}` : 'Available'}
                    </span>

                    {v.status !== 'available' && v.id && (
                      <button
                        onClick={() => markVehicleAsAvailable(v.id!)}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors"
                      >
                        Mark Available
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-center items-center gap-2 mb-3 border-b border-gray-200 pb-1">
                  <img
                    src={v.images.front}
                    className={`w-12 h-12 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.front
                      ? "border-blue-500 border-2"
                      : "border-gray-300"
                      }`}
                    onClick={() => handleThumbnailClick(v.id!, v.images.front)}
                    alt="Front view"
                  />
                  <img
                    src={v.images.side}
                    className={`w-12 h-12 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.side
                      ? "border-blue-500 border-2"
                      : "border-gray-300"
                      }`}
                    onClick={() => handleThumbnailClick(v.id!, v.images.side)}
                    alt="Side view"
                  />
                  <img
                    src={v.images.back}
                    className={`w-12 h-12 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.back
                      ? "border-blue-500 border-2"
                      : "border-gray-300"
                      }`}
                    onClick={() => handleThumbnailClick(v.id!, v.images.back)}
                    alt="Back view"
                  />
                  <img
                    src={v.images.interior}
                    className={`w-12 h-12 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.interior
                      ? "border-blue-500 border-2"
                      : "border-gray-300"
                      }`}
                    onClick={() => handleThumbnailClick(v.id!, v.images.interior)}
                    alt="Interior view"
                  />
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-800">
                      {capitalizeFullName(v.carName)}
                    </h3>
                    <span className="text-xs bg-white text-gray-800 px-2 py-1 rounded-full capitalize">
                      {v.carType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{v.carModel.toUpperCase()}</p>
                  <p className="text-xs text-gray-500">Plate: {v.plateNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span>👤</span>
                    <span>{v.passengers} seats</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>❄️</span>
                    <span>{v.ac ? 'AC' : 'No AC'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>🎨</span>
                    <span>{v.exteriorColor}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span>🛋️</span>
                    <span>{v.interiorColor}</span>
                  </div>
                </div>

                {v.description && (
                  <p className="text-xs text-gray-700 bg-green-100 rounded p-2 mb-3 line-clamp-2">
                    {v.description}
                  </p>
                )}

                <div className="flex justify-between pt-3 border-t border-gray-100 border-t border-gray-200">
                  <button
                    onClick={() => startEdit(v)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => confirmDeleteVehicle(v.id)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-1"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Driver's Contact History */}
      <div className="mb-6">
        <section className="bg-white shadow-lg rounded-xl p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-semibold mb-4">Drivers You Contacted</h2>

          {contactedDrivers.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 text-4xl mb-2">👨‍✈️</div>
              <p className="text-gray-500 text-sm">You haven't contacted any drivers yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {contactedDrivers.map((driver, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                        <span className="text-xl">👨‍✈️</span>
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

        {/* Trip History Section */}
        <section className="mt-8 px-2 sm:px-8 w-full bg-white shadow-lg rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Trip History</h2>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
              >
                Book Your First Trip
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Comments Section */}
      <section className="bg-black border border-gray-800 shadow-lg rounded-xl p-1 py-2 lg:p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-2">
          <h2 className="text-lg lg:text-xl text-gray-200 font-semibold">Customer Comments</h2>
          {comments.length > 0 && (
            <div className="text-xs lg:text-sm text-gray-200">
              ({comments.length} comments)
            </div>
          )}
        </div>

        {comments.length === 0 ? (
          <p className="text-gray-200 text-center py-4">No comments yet.</p>
        ) : (
          <div className="max-h-[22rem] lg:max-h-[28rem] px-1 sm:px-2 overflow-y-auto gap-2 lg:gap-3">
            {comments.slice(0, 3).map((c, index) => (
              <div key={c.id || index} className="my-4 bg-gray-900 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-1">
                  <p className="font-semibold text-[goldenrod] text-sm lg:text-base">
                    {c.passengerName || 'Anonymous'}
                  </p>
                </div>
                <p className="text-xs lg:text-sm text-gray-200 line-clamp-2">{c.text}</p>
                {c.createdAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    {c.createdAt.toDate ? c.createdAt.toDate().toLocaleDateString() : formatDate(c.createdAt)}
                  </p>
                )}
              </div>
            ))}
            {comments.length > 3 && (
              <div className="text-center mt-2">
                <button className="text-blue-600 text-sm hover:text-blue-800">
                  View all {comments.length} comments →
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Promotion Cards Section */}
      <section className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4">Grow Your Driver Business</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl overflow-hidden">
            <div className="h-32 lg:h-40 bg-blue-100 overflow-hidden">
              <img
                src="/driverShareProfile.jpeg"
                alt="Driver Sharing Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm lg:text-base">
                  🔗
                </div>
                <h3 className="font-semibold text-blue-800 text-sm lg:text-base">Share Link to Upgrade Your VIP Status</h3>
              </div>
              <p className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3">
                Share your driver profile! Get referrals to climb VIP levels. Higher VIP levels get priority in search results and more bookings!
              </p>
              <div className="space-y-1 mb-3">
                {VIP_CONFIG.levels.slice(0, 3).map((level) => (
                  <div key={level.level} className="flex justify-between text-xs">
                    <span>{level.name}:</span>
                    <span>{level.referralsRequired} referrals</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all text-center text-xs lg:text-sm">
                <ShareButton
                  userId={driverId}
                  title="Book a Professional Driver on Nomopoventures!"
                  text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl overflow-hidden">
            <div className="h-32 lg:h-40 bg-yellow-100 overflow-hidden">
              <img
                src="/vipcard.avif"
                alt="VIP Driver Benefits"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-sm lg:text-base">
                  ⭐
                </div>
                <h3 className="font-semibold text-yellow-800 text-sm lg:text-base">
                  {vipLevel > 0 ? 'Upgrade Your VIP Level' : 'Become a VIP Driver'}
                </h3>
              </div>
              <div className="space-y-2 mb-3">
                {VIP_CONFIG.levels.slice(0, 3).map((level) => (
                  <div key={level.level} className="flex items-center gap-2">
                    <VIPStar level={level.level} size="sm" showLabel={false} />
                    <span className="text-xs">
                      {level.name}: ₦{level.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mb-3">
                VIP drivers appear first in search results and get more bookings!
              </p>
              <button
                onClick={() => setShowVIPUpgradeModal(true)}
                className="block w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-amber-700 transition-all text-center text-xs lg:text-sm"
              >
                {vipLevel > 0 ? 'Upgrade VIP Level' : 'Become VIP'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <div className="my-10 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 lg:p-6 lg:p-8 text-center shadow-xl border border-gray-700">
        <h2 className="text-lg lg:text-xl lg:text-2xl font-bold text-white mb-2">
          We're Here to Help
        </h2>

        <p className="text-xs lg:text-sm lg:text-base text-gray-300 mb-4 leading-relaxed">
          For complaints, enquiries, reports and much more — our team is available
          <span className="text-white font-semibold"> 24/7</span>.
        </p>

        <a
          href="mailto:nomopoventures@yahoo.com"
          className="inline-block bg-red-700 hover:bg-red-600 px-4 py-2 lg:px-6 lg:py-3 rounded-xl text-white font-semibold text-xs lg:text-sm lg:text-base transition-all"
        >
          Contact Us Today!
        </a>
      </div>

      {/* Transport News */}
      <div className="bg-white mt-6 p-3 lg:p-4 rounded-xl shadow">
        <h2 className="text-lg lg:text-2xl font-bold mb-3">Latest Transport News</h2>
        <div className="max-h-[45rem] lg:max-h-90 overflow-y-auto p-2">
          <TransportNewsPageUi />
        </div>
      </div>
    </div>
  );

  // Helper function to reset form
  function resetVehicleForm() {
    setCarName("");
    setCarModel("");
    setCarType("sedan");
    setPassengers(4);
    setAc(true);
    setPlateNumber("");
    setDescription("");
    setExteriorColor("");
    setInteriorColor("");
    setVehicleStatus("available");
    setFrontFile(null);
    setSideFile(null);
    setBackFile(null);
    setInteriorFile(null);
    setPreviews({});
  }
}