"use client";

import { useEffect, useState, useRef } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useParams } from "next/navigation";
import TransportNewsPageUi from "./news";
import WordGuessGame from "./game";
import ShareButton from "@/ui/sharebutton";
import LoadingRound from "@/ui/re-useable-loading";
import { toast, Toaster } from "react-hot-toast";

// Capitalize full name
const capitalizeFullName = (name: string) =>
  name?.split(" ").filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") || "Professional Driver";

interface Vehicle {
  id?: string;
  driverId: string;
  carName: string;
  carModel: string;
  carType: string; // Added carType field
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
  passengerName: string;
  passengerId: string;
  driverId: string;
  rating: number;
  text: string;
  createdAt: Timestamp;
  tripId: string;
  isVisible: boolean;
}
interface Transaction {
  id: string;
  driverId: string;
  passengerId: string;
  passengerName: string;
  amount: number;
  date: Timestamp;
  status: "completed" | "pending" | "cancelled";
  vehicleId: string;
  tripId: string;
  serviceCompleted: boolean;
}

export default function DriverProfilePage() {
  const params = useParams();
  const driverId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState<any>(null);
  const [game, setGame] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showVIPModal, setShowVIPModal] = useState(false);

  const [carName, setCarName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("sedan"); // Added carType state
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [isVIP, setIsVIP] = useState<boolean>(false);
  const [uniqueCustomers, setUniqueCustomers] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState<boolean>(false); // Added verification state

  const [selectedMainImage, setSelectedMainImage] = useState<{ [key: string]: string }>({});

  const BONUS_PER_15 = 5000;
  const completedBonuses = Math.floor(completedJobs / 15) * BONUS_PER_15;
  const toNextBonus = 15 - (completedJobs % 15);
  const progressPercentage = ((completedJobs % 15) / 15) * 100;

  const REFERRAL_TARGET = 20;
  const referralProgress = Math.min((referralCount / REFERRAL_TARGET) * 100, 100);
  const referralsToTarget = Math.max(0, REFERRAL_TARGET - referralCount);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!driverId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        // Get driver
        const userRef = doc(db, "users", driverId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          // Handle Google users: fetch displayName / photoURL if profileImage is missing
          const profileImage = data.profileImage || data.photoURL || "";
          const fullName = data.fullName || data.displayName || "Professional Driver";
          const verified = data.verified || false; // Get verification status

          setDriverData({ ...data, profileImage, fullName });
          setIsVIP(data.driverVip || data.isVIP || false);
          setReferralCount(data.referralCount || 0);
          setIsVerified(verified); // Set verification status
        }

        // Vehicles (collection)
        const vehiclesRef = collection(db, "vehicleLog");        
        const qVehicles = query(vehiclesRef,where("driverId", "==", driverId)); //get Cars
        const unsubVehicles = onSnapshot(qVehicles, snapshot => {
          const list: Vehicle[] = [];
          snapshot.forEach(docSnap => {
            const vehicleData = { id: docSnap.id, ...(docSnap.data() as any) };
            list.push(vehicleData);
            // Initialize selected main image for each vehicle
            if (vehicleData.id && !selectedMainImage[vehicleData.id]) {
              setSelectedMainImage(prev => ({
                ...prev,
                [vehicleData.id]: vehicleData.images.front
              }));
            }
          });
          setVehicles(list);
        });

        // Transactions
        const txRef = collection(db, "transactions");
        const qTx = query(txRef, where("driverId", "==", driverId), where("status", "==", "completed"), where("serviceCompleted", "==", true));
        const unsubTx = onSnapshot(qTx, snapshot => {
          const txList: Transaction[] = [];
          const customerIds = new Set<string>();
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            txList.push({ id: docSnap.id, ...data } as Transaction);
            if (data.passengerId) customerIds.add(data.passengerId);
          });
          setTransactions(txList);
          setCompletedJobs(txList.length);
          setUniqueCustomers(Array.from(customerIds));
        });

        // Comments
        const commentsRef = collection(db, "comments");
        const qComments = query(commentsRef, where("driverId", "==", driverId), where("isVisible", "==", true));
        const unsubComments = onSnapshot(qComments, snapshot => {
          const list: Comment[] = [];
          snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...(docSnap.data() as any) }));
          setComments(list);
          setCommentsCount(list.length);
        });

        setLoading(false);
        return () => {
          unsubVehicles();
          unsubTx();
          unsubComments();
        };
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile");
        setLoading(false);
      }
    };

    fetchData();
  }, [driverId]);

  // Average rating
  const averageRating = comments.length ? (comments.reduce((a, c) => a + c.rating, 0) / comments.length).toFixed(1) : "0.0";

  // File previews
  useEffect(() => {
    const newPreviews: any = {};
    if (frontFile) newPreviews.front = URL.createObjectURL(frontFile);
    if (sideFile) newPreviews.side = URL.createObjectURL(sideFile);
    if (backFile) newPreviews.back = URL.createObjectURL(backFile);
    if (interiorFile) newPreviews.interior = URL.createObjectURL(interiorFile);
    setPreviews(newPreviews);

    return () => { Object.values(newPreviews).forEach((url: any) => url && URL.revokeObjectURL(url)); };
  }, [frontFile, sideFile, backFile, interiorFile]);

  // Upload helper
  async function uploadFile(file: File, path: string) {
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    return new Promise<string>((resolve, reject) => {
      task.on("state_changed", ()=>{}, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
    });
  }

  // Submit vehicle (create or update) - now updates users/{driverId}.vehicleLog on create and removes on delete
  const submitVehicle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingVehicle(true);

    if (!carName || !carModel || !plateNumber || !exteriorColor || !interiorColor || !carType) { toast.error("Fill required fields"); setSavingVehicle(false); return; }
    if (!editingVehicle && (!frontFile || !sideFile || !backFile || !interiorFile)) { toast.error("All 4 photos required"); setSavingVehicle(false); return; }

    try {
      const timestamp = Date.now();

      // Upload images only if file provided; keep existing URLs when editing and no new file
      const frontUrl = frontFile ? await uploadFile(frontFile, `vehicleLog/${driverId}/${timestamp}_front_${frontFile.name}`) : editingVehicle?.images.front;
      const sideUrl = sideFile ? await uploadFile(sideFile, `vehicleLog/${driverId}/${timestamp}_side_${sideFile.name}`) : editingVehicle?.images.side;
      const backUrl = backFile ? await uploadFile(backFile, `vehicleLog/${driverId}/${timestamp}_back_${backFile.name}`) : editingVehicle?.images.back;
      const interiorUrl = interiorFile ? await uploadFile(interiorFile, `vehicleLog/${driverId}/${timestamp}_interior_${interiorFile.name}`) : editingVehicle?.images.interior;

      const vehicleDoc = {
        driverId,
        carName,
        carModel,
        carType, // Added carType to the document
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
        // update existing vehicle doc
        await updateDoc(doc(db, "vehicleLog", editingVehicle.id), vehicleDoc);
        toast.success("Vehicle updated");
      } else {
        // add new vehicle doc and push its id to user's vehicleLog array
        const newDocRef = await addDoc(collection(db, "vehicleLog"), vehicleDoc);
        try {
          // Add the new vehicle's id to the user's vehicleLog array (string IDs)
          const userRef = doc(db, "users", driverId);
          await updateDoc(userRef, { vehicleLog: arrayUnion(newDocRef.id), updatedAt: Timestamp.now() });
        } catch (uErr) {
          // If updating the user doc fails, log it but don't break the flow — the vehicle is in vehicleLog collection
          console.error("Failed to update user's vehicleLog array:", uErr);
          toast.error("Vehicle added but user record couldn't be updated (contact admin).");
        }
        toast.success("Vehicle added");
      }

      // Reset form state
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

  // Remove vehicle: delete doc from vehicleLog collection AND remove ID from users/{driverId}.vehicleLog array
  const removeVehicle = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this vehicle? This action cannot be undone.")) return;

    try {
      // delete vehicle doc
      await deleteDoc(doc(db, "vehicleLog", id));

      // remove id from user's vehicleLog array (if exists)
      try {
        const userRef = doc(db, "users", driverId);
        await updateDoc(userRef, { vehicleLog: arrayRemove(id), updatedAt: Timestamp.now() });
      } catch (uErr) {
        console.error("Failed to remove vehicle id from user's vehicleLog:", uErr);
        // not fatal; vehicle doc removed though
      }

      // Remove from selectedMainImage state
      setSelectedMainImage(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });

      toast.success("Vehicle deleted");
    } catch (err) {
      console.error("Could not delete vehicle:", err);
      toast.error("Could not delete vehicle");
    }
  };

  // Function to handle thumbnail click
  const handleThumbnailClick = (vehicleId: string, imageUrl: string) => {
    setSelectedMainImage(prev => ({
      ...prev,
      [vehicleId]: imageUrl
    }));
  };

  // Function to handle Add Vehicle button click with VIP check
  const handleAddVehicleClick = () => {
    // Check if driver is NOT VIP and already has 2 or more vehicles
    if (!isVIP && vehicles.length >= 2) {
      setShowVIPModal(true);
      return;
    }
    
    // Allow editing existing vehicles regardless of VIP status
    // Only check for adding NEW vehicles
    if (editingVehicle) {
      setShowVehicleForm(true);
    } else {
      setShowVehicleForm(true);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen"><LoadingRound /></div>
  );
  if (!driverId) return (
    <div className="flex justify-center items-center h-screen"><div className="text-xl font-semibold text-red-600">Driver ID not found</div></div>
  );

  return (
    <div className="p-3 sm:p-4 max-w-6xl mx-auto overflow-x-hidden">
      <Toaster position="top-right" />
      
      {/* VIP Upgrade Modal */}
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
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Upgrade to VIP Driver</h3>
              <p className="text-gray-600 mb-4">
                {vehicles.length >= 2 ? (
                  `You have reached the limit of ${vehicles.length} vehicles. Upgrade to VIP to add more vehicles and unlock premium features!`
                ) : (
                  "Upgrade to VIP to unlock the ability to add multiple vehicles and other premium features!"
                )}
              </p>
            </div>

            {/* VIP upgrade benefits card for dirver VIP upgrade */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2">VIP Benefits:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">✓</span>
                  <span>Add unlimited vehicles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">✓</span>
                  <span>Priority in search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">✓</span>
                  <span>More customer requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">✓</span>
                  <span>Exclusive bonus rewards</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowVIPModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Maybe Later
              </button>
              <a
                href="/purchase"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-amber-700 transition-all text-center"
              >
                Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header / Summary Card */}
      <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="w-full lg:w-1/2">
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Driver Profile</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {driverData?.fullName ? capitalizeFullName(driverData.fullName) : "Professional Driver"}
                </p>
              </div>
              
              {/* Verification Status Badge */}
              <div className={`absolute left-50 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${isVerified 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                {isVerified ? (
                  <>
                    <span className="text-green-600">✓</span>
                    Verified Driver
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">○</span>
                    Unverified
                  </>
                )}
              </div>
            </div>

            {isVIP && (
              <div className="mt-2 inline-flex items-center gap-1 bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
                <span className="text-yellow-600">⭐</span>
                <span className="text-yellow-800 text-xs sm:text-sm font-semibold">VIP Driver</span>
              </div>
            )}
            
            <div className="mt-3">
              <p className="text-xs text-gray-600">
                Completed jobs: <span className="font-semibold">{completedJobs}</span>
              </p>

              {/* Progress bar to next bonus */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-xs">
                <div 
                  className="h-2 rounded-full bg-emerald-600" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              <div className="mt-2 text-xs sm:text-sm text-gray-700">
                <span className="font-semibold">Bonus earned:</span> ₦{completedBonuses.toLocaleString()}
                <span className="mx-1 sm:mx-2">•</span>
                <span className="text-gray-500 block sm:inline">
                  {toNextBonus} jobs to next ₦{BONUS_PER_15.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Stats cards: comments and referrals */}
          <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-xs sm:text-sm text-yellow-700">Customer Comments</p>
              <p className="text-xl sm:text-2xl font-bold">{commentsCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                Rating: {averageRating} ⭐
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-sky-200 rounded-xl p-3 sm:p-4 text-center">
              <a href="#share-link" className="text-xs sm:text-sm text-sky-700">Share to Earn</a>
              <p className="text-base sm:text-lg font-bold">
                {referralCount}/{REFERRAL_TARGET}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                  className="h-1.5 rounded-full bg-green-500" 
                  style={{ width: `${referralProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {referralsToTarget > 0 
                  ? `${referralsToTarget} more`
                  : "🎉 Unlocked!"
                }
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 text-center">
              <p className="text-xs sm:text-sm text-emerald-700">Customers Carried</p>
              <p className="text-xl sm:text-2xl font-bold">{uniqueCustomers.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                Unique passengers
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="w-full sm:w-auto">
            <ShareButton 
              userId={driverId}
              title="Book a Professional Driver on Nomopoventures!"
              text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleAddVehicleClick}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
            >
              Add Vehicle {!isVIP && vehicles.length > 0 && `(${vehicles.length}/2)`}
            </button>
            
            <button
              onClick={() => setGame(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
            >
              🎮 Play Game
            </button>
          </div>
        </div>

        {/* Image upload under Share Profile */}
        <div className="text-center sm:text-left mt-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Driver Profile Image</h3>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
              {driverData?.profileImage ? (
                <img 
                  src={driverData.profileImage} 
                  alt="Driver Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                  {driverData?.fullName?.charAt(0).toUpperCase() || "D"}
                </div>
              )}
            </div>
            <div className="w-full">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">Upload a professional photo to build trust with passengers</p>
              <input 
                type="file" 
                accept="image/*"
                className="w-full text-xs sm:text-sm text-gray-500 file:mr-2 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
        <div className="p-10 bg-black rounded-md absolute top-36 right-[-8px] sm:right-1 lg:right-65 z-20">
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

      {/* Vehicle manager */}
      <section className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Your Vehicles</h2>
          {!isVIP && vehicles.length > 0 && (
            <div className="text-xs text-gray-500">
              {vehicles.length}/2 vehicles added
              {vehicles.length >= 2 && (
                <span className="ml-2 text-amber-600 font-semibold">• VIP required for more</span>
              )}
            </div>
          )}
        </div>

        {/* Car Image and Thumbnail */}
        {vehicles.length === 0 ? (
          <p className="text-gray-500 text-center py-6 sm:py-8">No vehicles yet. Click "Add Vehicle" to create one.</p>
        ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {vehicles.map((v) => (
                    <div key={v.id} className="bg-gray-900 shadow rounded-xl p-3 hover:shadow-lg transition-shadow">

                      {/* MAIN IMAGE - Now clickable from thumbnails */}
                      <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                          <img 
                          src={selectedMainImage[v.id!] || v.images.front}
                          className="w-full h-full object-cover"
                          />
                      </div>

                      {/* THUMBNAILS SCROLL - Now clickable */}
                      <div className="relative">
                          {/* Scroll Buttons */}
                          <button
                          onClick={() => document.getElementById(`scroll-${v.id}`)?.scrollBy({ left: -120, behavior: "smooth" })}
                          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded-full shadow"
                          >‹</button>

                          <button
                          onClick={() => document.getElementById(`scroll-${v.id}`)?.scrollBy({ left: 120, behavior: "smooth" })}
                          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded-full shadow"
                          >›</button>

                          {/* Thumbnails - Now clickable */}
                          <div
                          id={`scroll-${v.id}`}
                          className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-6"
                          >
                          <img 
                            src={v.images.front} 
                            className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.front ? 'border-blue-500 border-2' : 'border-gray-300'}`}
                            onClick={() => handleThumbnailClick(v.id!, v.images.front)}
                            alt="Front view"
                          />
                          <img 
                            src={v.images.side} 
                            className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.side ? 'border-blue-500 border-2' : 'border-gray-300'}`}
                            onClick={() => handleThumbnailClick(v.id!, v.images.side)}
                            alt="Side view"
                          />
                          <img 
                            src={v.images.back} 
                            className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.back ? 'border-blue-500 border-2' : 'border-gray-300'}`}
                            onClick={() => handleThumbnailClick(v.id!, v.images.back)}
                            alt="Back view"
                          />
                          <img 
                            src={v.images.interior} 
                            className={`w-16 h-16 rounded-md object-cover border cursor-pointer transition-all ${selectedMainImage[v.id!] === v.images.interior ? 'border-blue-500 border-2' : 'border-gray-300'}`}
                            onClick={() => handleThumbnailClick(v.id!, v.images.interior)}
                            alt="Interior view"
                          />
                          </div>
                      </div>

                      {/*CAR DETAILS */}
                      <div className="mt-3 bg-white rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="font-semibold text-lg">{capitalizeFullName(v.carName)}</h2>
                            <p className="text-sm text-gray-500">{(v.carModel).toUpperCase()}</p>
                          </div>
                          {/* Car Type Badge */}
                          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium capitalize">
                            {v.carType || "Not specified"}
                          </span>
                        </div>
                        
                        {/* Vehicle Details Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">👤</span>
                            <span className="text-xs">{v.passengers} passengers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">❄️</span>
                            <span className="text-xs">{v.ac ? 'AC Available' : 'No AC'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">🎨</span>
                            <span className="text-xs">{capitalizeFullName(v.exteriorColor)} Exterior</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">🛋️</span>
                            <span className="text-xs">{capitalizeFullName(v.interiorColor)} Interior</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            !v.status || v.status === 'available' 
                              ? 'bg-blue-100 text-blue-800' 
                              : v.status === 'unavailable' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : 'Available'}
                          </span>
                        </div>

                        {/* Description if available */}
                        {v.description && (
                          <p className="bg-green-100 rounded-lg p-2 text-xs text-green-800 mt-2 line-clamp-2">{v.description}</p>
                        )}
                      </div>

                      <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
                          <button
                          onClick={() => startEdit(v)}
                          className="text-blue-500 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                          >
                            <span>✏️</span> Edit
                          </button>
                          <button
                          onClick={() => removeVehicle(v.id)}
                          className="bg-white p-1 rounded-lg text-red-600 hover:text-red-800 text-sm font-semibold flex items-center gap-1"
                          >
                            <span>🗑️</span> Delete
                          </button>
                      </div>
                    </div>
                ))}
            </div>

        )}
      </section>

      {/* Vehicle form modal/card */}
      {showVehicleForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-3 sm:p-6 relative my-2 sm:my-8 mx-2 sm:mx-0">
            <button 
              onClick={() => { 
                setShowVehicleForm(false); 
                setEditingVehicle(null); 
                setPreviews({});
              }} 
              className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-600 text-xl sm:text-2xl hover:text-gray-800"
            >
              ×
            </button>
            
            <h3 className="text-lg sm:text-xl font-semibold mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
            </h3>

            <form onSubmit={submitVehicle} className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Car Name *</label>
                  <input 
                    value={carName} 
                    onChange={(e) => setCarName(e.target.value)} 
                    required 
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., Toyota Camry"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Car Model *</label>
                  <input 
                    value={carModel} 
                    onChange={(e) => setCarModel(e.target.value)} 
                    required 
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., 2023 LE"
                  />
                </div>

                {/* Car Type Selection - Added */}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Car Type *</label>
                  <select
                    value={carType}
                    onChange={(e) => setCarType(e.target.value)}
                    required
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="keke">Keke</option>
                    <option value="bus">Bus</option>
                    <option value="carrier">Carrier</option>
                    <option value="truck">Truck</option>
                    <option value="minivan">Minivan</option>
                    <option value="pickup">Pickup Truck</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Passengers *</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={20}
                      value={passengers} 
                      onChange={(e) => setPassengers(parseInt(e.target.value || "1"))} 
                      required 
                      className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Car Color *</label>
                    <input 
                      value={exteriorColor} 
                      onChange={(e) => setExteriorColor(e.target.value)} 
                      required
                      className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., Black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Interior Color *</label>
                    <input 
                      value={interiorColor} 
                      onChange={(e) => setInteriorColor(e.target.value)} 
                      required
                      className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., Beige"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={vehicleStatus}
                      onChange={(e) => setVehicleStatus(e.target.value as any)}
                      className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    id="acAvailable"
                    checked={ac} 
                    onChange={(e) => setAc(e.target.checked)} 
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="acAvailable" className="ml-2 text-xs sm:text-sm text-gray-700">
                    Air Conditioning Available
                  </label>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Plate Number * (hidden)
                  </label>
                  <input 
                    value={plateNumber} 
                    onChange={(e) => setPlateNumber(e.target.value)} 
                    required 
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., ABC123"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Stored but not shown publicly
                  </p>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={2}
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm font-medium text-gray-700">
                  Upload required photos (front, side, back, interior) *
                </p>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { label: "Front View", key: "front", file: frontFile, setFile: setFrontFile },
                    { label: "Side View", key: "side", file: sideFile, setFile: setSideFile },
                    { label: "Back View", key: "back", file: backFile, setFile: setBackFile },
                    { label: "Interior", key: "interior", file: interiorFile, setFile: setInteriorFile },
                  ].map(({ label, key, file, setFile }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">{label}</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)} 
                        required={!editingVehicle}
                        className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 sm:file:py-1.5 sm:file:px-3 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {previews[key as keyof typeof previews] && (
                        <div className="relative mt-1">
                          <img 
                            src={previews[key as keyof typeof previews]} 
                            className="w-full h-24 sm:h-32 object-cover rounded border"
                            alt={label}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFile(null);
                              setPreviews(prev => ({ ...prev, [key]: undefined }));
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm text-blue-700 font-medium">Preview</p>
                  <div className="grid grid-cols-2 gap-1 sm:gap-2 mt-1 sm:mt-2">
                    {Object.entries(previews).map(([key, url]) => (
                      url && (
                        <div key={key} className="text-center">
                          <p className="text-xs text-gray-500 capitalize">{key}</p>
                          <img 
                            src={url} 
                            alt={key} 
                            className="w-full h-16 sm:h-20 object-cover rounded mt-1"
                          />
                        </div>
                      )
                    ))}
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { 
                      setShowVehicleForm(false); 
                      setEditingVehicle(null); 
                      setPreviews({});
                    }} 
                    className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto order-2 sm:order-1"
                    disabled={savingVehicle}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm w-full sm:w-auto order-1 sm:order-2"
                    disabled={savingVehicle}
                  >
                    {savingVehicle ? (
                      <>
                        <LoadingRound />
                        <span className="text-xs sm:text-sm">Saving...</span>
                      </>
                    ) : editingVehicle ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comments / Reviews section */}
      <section className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
          <h2 className="text-lg sm:text-xl font-semibold">Customer Reviews</h2>
          {comments.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm font-semibold">{averageRating}</span>
              </div>
              <span className="text-xs sm:text-sm text-gray-500">({commentsCount} reviews)</span>
            </div>
          )}
        </div>
        
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet.</p>
        ) : (
          <div className="grid gap-2 sm:gap-3">
            {comments.slice(0, 3).map((c) => (
              <div key={c.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">
                    {c.passengerName || 'Anonymous'}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-xs sm:text-sm text-gray-600">{c.rating || 'N/A'}</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{c.text}</p>
                {c.createdAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    {c.createdAt.toDate().toLocaleDateString()}
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
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Grow Your Driver Business</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Share to Earn Card with Image */}
          <div id="share-link" className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl overflow-hidden">
            <div className="h-32 sm:h-40 bg-blue-100 overflow-hidden">
              <img 
                src="/driverShareProfile.jpeg" 
                alt="Driver Sharing Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm sm:text-base">
                  🔗
                </div>
                <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Share & Earn Points</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                Share your driver profile! Earn points for every successful referral. More points = higher visibility in search results & earn ₦5000 in cash!
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  Progress: {referralCount}/{REFERRAL_TARGET}
                </span>
              </div>
             
              <div
                  className="mt-9 w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all text-center text-xs sm:text-sm"
              >
                  <ShareButton 
                      userId={driverId}
                      title="Book a Professional Driver on Nomopoventures!"
                      text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
                  />
              </div>
            </div>
          </div>

          {/* VIP Upgrade Card with Image */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl overflow-hidden">
            <div className="h-32 sm:h-40 bg-yellow-100 overflow-hidden">
              <img 
                src="/vipcard.avif" 
                alt="VIP Driver Benefits"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-sm sm:text-base">
                  ⭐
                </div>
                <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">VIP Driver Benefits</h3>
              </div>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1 mb-2 sm:mb-3">
                <li className="flex items-start gap-1">
                  <span>•</span>
                  <span>Priority in search results</span>
                </li>
                <li className="flex items-start gap-1">
                  <span>•</span>
                  <span>Higher rates per ride</span>
                </li>
                <li className="flex items-start gap-1">
                  <span>•</span>
                  <span>Exclusive bonus rewards</span>
                </li>
                <li className="flex items-start gap-1">
                  <span>•</span>
                  <span>Premium customer support</span>
                </li>
              </ul>
              <a
                href="/purchase"
                className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all text-center text-xs sm:text-sm"
              >
                Upgrade to VIP
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <div className="my-10 bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 sm:p-6 lg:p-8 text-center shadow-xl border border-gray-700">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">
          We're Here to Help
        </h2>

        <p className="text-xs sm:text-sm lg:text-base text-gray-300 mb-4 leading-relaxed">
          For complaints, enquiries, reports and much more — our team is available 
          <span className="text-white font-semibold"> 24/7</span>.
        </p>

        <a
          href="mailto:nomopoventures@yahoo.com"
          className="inline-block bg-red-700 hover:bg-red-600 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-white font-semibold text-xs sm:text-sm lg:text-base transition-all"
        >
          Contact Us Today!
        </a>
      </div>

      {/* Transport News */}
      <div className="bg-white mt-6 p-3 sm:p-4 rounded-xl shadow">
        <h2 className="text-lg sm:text-2xl font-bold mb-3">Latest Transport, Pricing & Shipping News</h2>
        <div className="max-h-[45rem] sm:max-h-80 overflow-y-auto p-2">
          <TransportNewsPageUi />
        </div>
      </div>
    </div>
  );
}