"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useParams } from "next/navigation";
import TransportNewsPageUi from "../components/news";
import WordGuessGame from "../components/game";
import ShareButton from "@/components/sharebutton";
import LoadingRound from "@/components/re-useable-loading";
import { toast, Toaster } from "react-hot-toast";

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

// Helper function to calculate VIP details
const calculateVIPDetails = (referralCount: number, purchasedVipLevel: number) => {
  let referralBasedLevel = 0;
  for (let i = 0; i < VIP_CONFIG.levels.length; i++) {
    if (referralCount >= VIP_CONFIG.levels[i].referralsRequired) {
      referralBasedLevel = VIP_CONFIG.levels[i].level;
    } else {
      break;
    }
  }
  
  const vipLevel = Math.min(
    Math.max(purchasedVipLevel, referralBasedLevel),
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
    currentLevelName: vipLevel > 0 ? VIP_CONFIG.levels[vipLevel - 1]?.name : "No VIP",
    nextLevelName: vipLevel < VIP_CONFIG.maxLevel 
      ? VIP_CONFIG.levels[vipLevel]?.name 
      : `Prestige LV${prestigeLevel + 1}`,
  };
};

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
      
      if (data.vipLevel === undefined) {
        const referralCount = data.referralCount || 0;
        const purchasedVipLevel = data.purchasedVipLevel || 0;
        const vipDetails = calculateVIPDetails(referralCount, purchasedVipLevel);
        updates.vipLevel = vipDetails.vipLevel;
        needsUpdate = true;
      }
      
      if (data.prestigeLevel === undefined) {
        const referralCount = data.referralCount || 0;
        const purchasedVipLevel = data.purchasedVipLevel || 0;
        const vipDetails = calculateVIPDetails(referralCount, purchasedVipLevel);
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

// VIP Star Component
const VIPStar = ({ level, prestigeLevel = 0, size = "md", showLabel = true }: { 
  level: number, 
  prestigeLevel?: number, 
  size?: "sm" | "md" | "lg", 
  showLabel?: boolean 
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
      black: "text-gray-900"
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
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getBackgroundColor(vipDetails.color)} border shadow-sm`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: vipDetails.stars }).map((_, i) => (
          <svg 
            key={i}
            className={`${sizeClasses[size]} ${getStarColor(vipDetails.color)} fill-current`}
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
        </span>
      )}
    </div>
  );
};

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

  const [completedJobs, setCompletedJobs] = useState<number>(0);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [ratings, setRatings] = useState<number[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [vipLevel, setVipLevel] = useState<number>(0);
  const [purchasedVipLevel, setPurchasedVipLevel] = useState<number>(0);
  const [prestigeLevel, setPrestigeLevel] = useState<number>(0);
  const [customersCarried, setCustomersCarried] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  
  const [contactedDrivers, setContactedDrivers] = useState<any[]>([]);
  const [selectedMainImage, setSelectedMainImage] = useState<{ [key: string]: string }>({});

  const BONUS_PER_15 = 5000;
  const completedBonuses = Math.floor(completedJobs / 15) * BONUS_PER_15;
  const toNextBonus = 15 - (completedJobs % 15);
  const progressPercentage = ((completedJobs % 15) / 15) * 100;
  const vipDetails = calculateVIPDetails(referralCount, purchasedVipLevel);

  useEffect(() => {
    if (!driverId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        await initializeVIPFields(driverId);

        const userRef = doc(db, "users", driverId);
        const unsubUser = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            const profileImage = data.profileImage || data.photoURL || "";
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || "Professional Driver";
            const verified = data.verified || false;
            const customersCarried = data.customersCarried || [];

            const referralCount = data.referralCount || 0;
            const purchasedVipLevel = data.purchasedVipLevel || 0;
            const vipLevel = data.vipLevel || 0;
            const prestigeLevel = data.prestigeLevel || 0;

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
              setCommentsCount(commentsList.length);
            }
            
            if (data.contactedDrivers) {
              setContactedDrivers(data.contactedDrivers);
            }

            const oldVipLevel = driverData?.vipLevel || 0;
            if (vipLevel > oldVipLevel && oldVipLevel > 0) {
              const newLevelName = VIP_CONFIG.levels[vipLevel - 1]?.name;
              toast.success(`🎉 Congratulations! You've reached ${newLevelName}!`, {
                duration: 5000,
                icon: '⭐',
              });
            }
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

        const txRef = collection(db, "transactions");
        const qTx = query(txRef, where("driverId", "==", driverId), where("status", "==", "completed"), where("serviceCompleted", "==", true));
        const unsubTx = onSnapshot(qTx, snapshot => {
          const txList: any[] = [];
          snapshot.forEach(docSnap => {
            txList.push({ id: docSnap.id, ...docSnap.data() });
          });
          setCompletedJobs(txList.length);
        });

        setLoading(false);
        return () => {
          unsubUser();
          unsubVehicles();
          unsubTx();
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

  async function uploadFile(file: File, path: string) {
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    return new Promise<string>((resolve, reject) => {
      task.on("state_changed", ()=>{}, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
    });
  }

  const submitVehicle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingVehicle(true);

    if (!carName || !carModel || !plateNumber || !exteriorColor || !interiorColor || !carType) { 
      toast.error("Please fill all required fields"); 
      setSavingVehicle(false); 
      return; 
    }
    if (!editingVehicle && (!frontFile || !sideFile || !backFile || !interiorFile)) { 
      toast.error("All 4 vehicle photos are required"); 
      setSavingVehicle(false); 
      return; 
    }

    try {
      const timestamp = Date.now();
      const frontUrl = frontFile ? await uploadFile(frontFile, `vehicleLog/${driverId}/${timestamp}_front_${frontFile.name}`) : editingVehicle?.images.front;
      const sideUrl = sideFile ? await uploadFile(sideFile, `vehicleLog/${driverId}/${timestamp}_side_${sideFile.name}`) : editingVehicle?.images.side;
      const backUrl = backFile ? await uploadFile(backFile, `vehicleLog/${driverId}/${timestamp}_back_${backFile.name}`) : editingVehicle?.images.back;
      const interiorUrl = interiorFile ? await uploadFile(interiorFile, `vehicleLog/${driverId}/${timestamp}_interior_${interiorFile.name}`) : editingVehicle?.images.interior;

      const vehicleDoc = {
        driverId,
        carName,
        carModel,
        carType,
        passengers,
        ac,
        plateNumber,
        exteriorColor,
        interiorColor,
        status: vehicleStatus,
        images: { front: frontUrl!, side: sideUrl!, back: backUrl!, interior: interiorUrl! },
        description,
        createdAt: editingVehicle?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingVehicle?.id) {
        await updateDoc(doc(db, "vehicleLog", editingVehicle.id), vehicleDoc);
        toast.success("Vehicle updated successfully");
      } else {
        const newDocRef = await addDoc(collection(db, "vehicleLog"), vehicleDoc);
        try {
          const userRef = doc(db, "users", driverId);
          await updateDoc(userRef, { vehicleLog: arrayUnion(newDocRef.id), updatedAt: Timestamp.now() });
        } catch (uErr) {
          console.error("Failed to update user's vehicleLog array:", uErr);
          toast.error("Vehicle added but user record couldn't be updated (contact admin).");
        }
        toast.success("Vehicle added successfully");
      }

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
      setShowVehicleForm(false);
      setEditingVehicle(null);
    } catch (err) {
      console.error("Failed to save vehicle:", err);
      toast.error("Failed to save vehicle");
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
    if (vipLevel === 0 && vehicles.length >= 2) {
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
      const userRef = doc(db, "users", driverId);
      const vipDetails = VIP_CONFIG.levels[level - 1];
      
      if (purchasedVipLevel >= level) {
        toast.error(`You already have VIP Level ${purchasedVipLevel}`);
        return;
      }
      
      const paymentSuccess = await simulatePayment(vipDetails.price);
      
      if (!paymentSuccess) {
        toast.error("Payment failed. Please try again.");
        return;
      }
      
      await updateDoc(userRef, {
        purchasedVipLevel: level,
        vipPurchaseHistory: arrayUnion({
          level: level,
          price: vipDetails.price,
          purchaseDate: Timestamp.now(),
          paymentId: `PAY-${Date.now()}`
        }),
        updatedAt: Timestamp.now()
      });
      
      const newVipDetails = calculateVIPDetails(referralCount, level);
      await updateDoc(userRef, {
        vipLevel: newVipDetails.vipLevel,
        prestigeLevel: newVipDetails.prestigeLevel
      });
      
      toast.success(`🎉 Successfully upgraded to ${vipDetails.name}!`, {
        duration: 5000,
        icon: '⭐',
      });
      
      setShowVIPUpgradeModal(false);
      
    } catch (err) {
      console.error("Error purchasing VIP:", err);
      toast.error("Failed to purchase VIP");
    }
  };

  const simulatePayment = async (amount: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  };

  const handleNewReferral = async () => {
    try {
      const userRef = doc(db, "users", driverId);
      const newReferralCount = referralCount + 1;
      
      await updateDoc(userRef, {
        referralCount: newReferralCount,
        updatedAt: Timestamp.now()
      });
      
      const newVipDetails = calculateVIPDetails(newReferralCount, purchasedVipLevel);
      await updateDoc(userRef, {
        vipLevel: newVipDetails.vipLevel,
        prestigeLevel: newVipDetails.prestigeLevel
      });
      
      if (newVipDetails.vipLevel > vipLevel) {
        const levelName = VIP_CONFIG.levels[newVipDetails.vipLevel - 1]?.name;
        toast.success(`🎉 New referral earned! You've reached ${levelName}!`, {
          duration: 5000,
          icon: '⭐',
        });
      } else {
        toast.success("Referral counted! Keep going!", {
          icon: '👍',
        });
      }
      
    } catch (error) {
      console.error("Error updating referral:", error);
      toast.error("Failed to update referral");
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
    <div className="p-3 lg:p-4 lg:p-6 max-w-6xl mx-auto">
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
                <VIPStar level={1} size="lg" showLabel={false} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Upgrade to VIP Driver</h3>
              <p className="text-gray-600 mb-4">
                You can only add 2 vehicles as a regular driver. Upgrade to VIP to add unlimited vehicles!
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-green-800 mb-2">VIP Benefits:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Add unlimited vehicles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Priority in search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Special VIP badge</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Higher booking priority</span>
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
              
              {vipLevel > 0 && vipLevel < VIP_CONFIG.maxLevel && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress to {vipDetails.nextLevelName}</span>
                    <span>{referralCount}/{vipDetails.referralsForNext}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600" 
                      style={{ width: `${vipDetails.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
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
                    className={`border rounded-xl p-4 transition-all duration-300 ${
                      isCurrentLevel 
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
                        <span className={`font-medium ${
                          isCurrentLevel ? 'text-green-600' :
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
                        className={`w-full py-2 rounded-lg font-medium transition-all ${
                          !canPurchase
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

            {/* VIP Info Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-purple-800 mb-2">How VIP Works:</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>Two Ways to Level Up:</strong> Get referrals OR purchase directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>Referral Requirements:</strong> 15, 20, 25, 30, 35 referrals for levels 1-5</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>After Level 5:</strong> Earn Prestige Levels (LV1, LV2, etc.) for extra referrals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span><strong>Search Priority:</strong> Higher VIP levels appear first in search results</span>
                </li>
              </ul>
            </div>

            {/* Referral Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-amber-800 mb-2">Earn VIP Through Referrals</h4>
              <p className="text-sm text-gray-700 mb-3">
                {vipLevel > 0 
                  ? "Share your link to get referrals and upgrade to your next VIP level!"
                  : "Share your link to get referrals and earn VIP status!"
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

                {/* VIP Progress Bar */}
                {vipLevel > 0 && vipLevel < VIP_CONFIG.maxLevel && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        Progress to {vipDetails.nextLevelName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {referralCount}/{vipDetails.referralsForNext} referrals
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600" 
                        style={{ width: `${vipDetails.progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {vipDetails.nextReferralsNeeded} more referrals for next level
                    </div>
                  </div>
                )}
                
                {/* Prestige Progress */}
                {vipLevel >= VIP_CONFIG.maxLevel && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        Prestige Level {prestigeLevel}
                      </span>
                      <span className="text-xs text-gray-500">
                        {referralCount} total referrals
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-gray-800 to-black" 
                        style={{ width: `${vipDetails.progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Next Prestige Level in {vipDetails.nextReferralsNeeded} more referrals
                    </div>
                  </div>
                )}
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

            {/* Bonus Progress - UPDATED TEXT */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Job Bonus Progress</span>
                <span className="text-xs text-gray-500">{completedJobs % 15}/15 jobs</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-emerald-600" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs lg:text-sm text-gray-700">
                  <span className="font-semibold">Referrals:</span> {referralCount}
                </span>
                <span className="text-xs lg:text-sm text-gray-600">
                  {vipLevel > 0 ? `${vipDetails.nextReferralsNeeded} to next VIP level` : '15 for VIP status'}
                </span>
              </div>
            </div>
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
                  style={{ width: `${vipDetails.progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {vipLevel > 0 ? `VIP Level ${vipLevel}` : 'No VIP yet'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Vehicles</p>
              <p className="text-xl lg:text-2xl font-bold">{vehicles.length}</p>
              {vipLevel === 0 && vehicles.length >= 2 && (
                <p className="text-[10px] text-amber-600 mt-1">VIP for more</p>
              )}
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
            
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button
                onClick={handleAddVehicleClick}
                className="flex-1 lg:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Add Vehicle {vipLevel === 0 && vehicles.length > 0 && `(${vehicles.length}/2)`}
              </button>
              
              <button
                onClick={() => setShowVIPUpgradeModal(true)}
                className="flex-1 lg:flex-none bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors text-sm font-medium"
              >
                {vipLevel > 0 ? 'Upgrade VIP Level' : 'Become VIP'}
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

        {/* Profile Image Update */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-full overflow-hidden">
                {driverData?.profileImage ? (
                  <img 
                    src={driverData.profileImage} 
                    alt="Current Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="text-lg">👤</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Update Profile Image</h3>
              <p className="text-xs text-gray-500 mb-2">A professional photo helps build trust with passengers</p>
              <input 
                type="file" 
                accept="image/*"
                className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && driverId) {
                    try {
                      const timestamp = Date.now();
                      const url = await uploadFile(file, `driverProfiles/${driverId}/${timestamp}_profile.jpg`);
                      
                      const userRef = doc(db, "users", driverId);
                      await updateDoc(userRef, {
                        profileImage: url,
                        updatedAt: Timestamp.now()
                      });
                      
                      toast.success("Profile image updated successfully!");
                    } catch (err) {
                      console.error("Error uploading profile image:", err);
                      toast.error("Failed to upload profile image");
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Word guessing game section */}
      {game && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto relative">
            <button
              onClick={() => setGame(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
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
          <h2 className="text-lg lg:text-xl font-semibold">Your Vehicles</h2>
          {vipLevel === 0 && vehicles.length > 0 && (
            <div className="text-xs text-gray-500">
              {vehicles.length}/2 vehicles added
              {vehicles.length >= 2 && (
                <span className="ml-2 text-amber-600 font-semibold">• VIP required for more</span>
              )}
            </div>
          )}
        </div>

        {vehicles.length === 0 ? (
          <p className="text-gray-500 text-center py-6 lg:py-8">No vehicles yet. Click "Add Vehicle" to create one.</p>
        ) : (
        <div className="w-full overflow-x-auto">
          <div className="max-h-[90rem] p-2 overflow-y-auto flex flex-col lg:flex-row gap-6 mt-4 pb-4">
            {vehicles.map((v) => (
              <div 
                key={v.id} 
                className="w-full lg:min-w-[20rem] lg:w-[20rem] bg-gray-900 shadow rounded-xl p-2 hover:shadow-lg transition-shadow"
              >
                
                <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                  <img 
                    src={selectedMainImage[v.id!] || v.images.front}
                    className="w-full h-full object-cover"
                    alt={v.carName}
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      v.status === 'available' ? 'bg-green-100 text-green-800' :
                      v.status === 'unavailable' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {v.status ? `${v.status.charAt(0).toUpperCase()}${v.status.slice(1)}` : 'Available'}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() =>
                      document.getElementById(`scroll-${v.id}`)?.scrollBy({
                        left: -120,
                        behavior: "smooth",
                      })
                    }
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded-full shadow"
                  >
                    ‹
                  </button>

                  <button
                    onClick={() =>
                      document.getElementById(`scroll-${v.id}`)?.scrollBy({
                        left: 120,
                        behavior: "smooth",
                      })
                    }
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded-full shadow"
                  >
                    ›
                  </button>

                  <div
                    id={`scroll-${v.id}`}
                    className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-6"
                  >
                    <img
                      src={v.images.front}
                      className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${
                        selectedMainImage[v.id!] === v.images.front
                          ? "border-blue-500 border-2"
                          : "border-gray-300"
                      }`}
                      onClick={() => handleThumbnailClick(v.id!, v.images.front)}
                      alt="Front view"
                    />
                    <img
                      src={v.images.side}
                      className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${
                        selectedMainImage[v.id!] === v.images.side
                          ? "border-blue-500 border-2"
                          : "border-gray-300"
                      }`}
                      onClick={() => handleThumbnailClick(v.id!, v.images.side)}
                      alt="Side view"
                    />
                    <img
                      src={v.images.back}
                      className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${
                        selectedMainImage[v.id!] === v.images.back
                          ? "border-blue-500 border-2"
                          : "border-gray-300"
                      }`}
                      onClick={() => handleThumbnailClick(v.id!, v.images.back)}
                      alt="Back view"
                    />
                    <img
                      src={v.images.interior}
                      className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${
                        selectedMainImage[v.id!] === v.images.interior
                          ? "border-blue-500 border-2"
                          : "border-gray-300"
                      }`}
                      onClick={() => handleThumbnailClick(v.id!, v.images.interior)}
                      alt="Interior view"
                    />
                  </div>
                </div>

                <div className="mt-3 bg-white rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-semibold text-lg">
                        {capitalizeFullName(v.carName)}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {v.carModel.toUpperCase()}
                      </p>
                    </div>

                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium capitalize">
                      {v.carType || "Not specified"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">👤</span>
                      <span className="text-xs">{v.passengers} passengers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">❄️</span>
                      <span className="text-xs">{v.ac ? "AC Available" : "No AC"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">🎨</span>
                      <span className="text-xs">
                        {capitalizeFullName(v.exteriorColor)} Exterior
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">🛋️</span>
                      <span className="text-xs">
                        {capitalizeFullName(v.interiorColor)} Interior
                      </span>
                    </div>
                  </div>

                  {v.description && (
                    <p className="bg-green-100 rounded-lg p-2 text-xs text-green-800 mt-2 line-clamp-2">
                      {v.description}
                    </p>
                  )}
                </div>

                <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => startEdit(v)}
                    className="text-blue-500 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => confirmDeleteVehicle(v.id)}
                    className="bg-white p-1 rounded-lg text-red-600 hover:text-red-800 text-sm font-semibold flex items-center gap-1"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
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

      {/* Promotion Cards Section - UPDATED SHARE BUTTON TEXT */}
      <section className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4">Grow Your Driver Business</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Share to Earn Card - UPDATED BUTTON TEXT */}
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

          {/* VIP Upgrade Card */}
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
        <div className="max-h-[45rem] lg:max-h-80 overflow-y-auto p-2">
          <TransportNewsPageUi />
        </div>
      </div>
    </div>
  );
}