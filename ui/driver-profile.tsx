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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState(false); // New state for location edit

  // Location state
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
  const [isVIP, setIsVIP] = useState<boolean>(false);
  const [customersCarried, setCustomersCarried] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  
  const [contactedDrivers, setContactedDrivers] = useState<any[]>([]);

  const [selectedMainImage, setSelectedMainImage] = useState<{ [key: string]: string }>({});

  const BONUS_PER_15 = 5000;
  const completedBonuses = Math.floor(completedJobs / 15) * BONUS_PER_15;
  const toNextBonus = 15 - (completedJobs % 15);
  const progressPercentage = ((completedJobs % 15) / 15) * 100;

  const REFERRAL_TARGET = 20;
  const referralProgress = Math.min((referralCount / REFERRAL_TARGET) * 100, 100);

  useEffect(() => {
    if (!driverId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        // Get driver data including ratings and comments from users collection
        const userRef = doc(db, "users", driverId);
        const unsubUser = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            const profileImage = data.profileImage || data.photoURL || "";
            const fullName = data.fullName || data.displayName || "Professional Driver";
            const verified = data.verified || false;
            const customersCarried = data.customersCarried || [];

            setDriverData({ ...data, profileImage, fullName });
            setIsVIP(data.driverVip || data.isVIP || false);
            setReferralCount(data.referralCount || 0);
            setIsVerified(verified);
            setCustomersCarried(customersCarried.length || 0);
            
            // Set location data
            setCity(data.city || "");
            setState(data.state || "");
            setWhatsappPreferred(data.whatsappPreferred || false);
            
            // Load ratings from "ratings" field - this is an array of numbers
            if (data.ratings && Array.isArray(data.ratings)) {
              // Handle both number array and object array formats
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
            
            // Load comments from "comments" field (array in users collection)
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
            
            // Load driver's contact history
            if (data.contactedDrivers) {
              setContactedDrivers(data.contactedDrivers);
            }
          }
        });

        // Vehicles (collection)
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

        // Transactions
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

  // Calculate average rating from ratings array (which contains numbers)
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : "0.0";

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

  // Submit vehicle
  const submitVehicle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingVehicle(true);

    if (!carName || !carModel || !plateNumber || !exteriorColor || !interiorColor || !carType) { 
      toast.error("Fill required fields"); 
      setSavingVehicle(false); 
      return; 
    }
    if (!editingVehicle && (!frontFile || !sideFile || !backFile || !interiorFile)) { 
      toast.error("All 4 photos required"); 
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
        toast.success("Vehicle updated");
      } else {
        const newDocRef = await addDoc(collection(db, "vehicleLog"), vehicleDoc);
        try {
          const userRef = doc(db, "users", driverId);
          await updateDoc(userRef, { vehicleLog: arrayUnion(newDocRef.id), updatedAt: Timestamp.now() });
        } catch (uErr) {
          console.error("Failed to update user's vehicleLog array:", uErr);
          toast.error("Vehicle added but user record couldn't be updated (contact admin).");
        }
        toast.success("Vehicle added");
      }

      // Reset form
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

      toast.success("Vehicle deleted");
    } catch (err) {
      console.error("Could not delete vehicle:", err);
      toast.error("Could not delete vehicle");
    } finally {
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    }
  };

  // Start editing location
  const startEditLocation = () => {
    setEditingLocation(true);
    // Initialize with current data
    setCity(driverData?.city || "");
    setState(driverData?.state || "");
  };

  // Update location
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

  // Cancel location editing
  const cancelLocationEdit = () => {
    setEditingLocation(false);
    setCity(driverData?.city || "");
    setState(driverData?.state || "");
  };

  // Toggle WhatsApp preference
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
    if (!isVIP && vehicles.length >= 2) {
      setShowVIPModal(true);
      return;
    }
    setShowVehicleForm(true);
  };

  // Format date
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

            <div className="flex flex-col lg:flex-row gap-3">
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
                      {driverData?.fullName?.charAt(0).toUpperCase() || "D"}
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
                    {driverData?.fullName ? capitalizeFullName(driverData.fullName) : "Professional Driver"}
                  </h1>
                  {isVIP && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-200 px-2 py-1 rounded-full text-xs font-semibold">
                      ⭐ VIP Driver
                    </span>
                  )}
                </div>
                
                {/* Location Display with Edit Icon */}
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
                
                {/* Location Edit Form (Only shown when editing) */}
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
                  <span className="text-gray-500">🚗 {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</span>
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

            {/* Bonus Progress */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Bonus Progress</span>
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
                  <span className="font-semibold">Earned:</span> ₦{completedBonuses.toLocaleString()}
                </span>
                <span className="text-xs lg:text-sm text-gray-600">
                  {toNextBonus} to next ₦{BONUS_PER_15.toLocaleString()}
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
              <p className="text-xs font-semibold text-green-700 mb-1">Customers Carried</p>
              <p className="text-xl lg:text-2xl font-bold">{customersCarried}</p>
              <p className="text-xs text-gray-500 mt-1">Unique passengers</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-purple-700 mb-1">Referrals</p>
              <p className="text-xl lg:text-2xl font-bold">{referralCount}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  className="h-1.5 rounded-full bg-green-500" 
                  style={{ width: `${referralProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-3 lg:p-4 text-center">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Vehicles</p>
              <p className="text-xl lg:text-2xl font-bold">{vehicles.length}</p>
              {!isVIP && vehicles.length >= 2 && (
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
                Add Vehicle {!isVIP && vehicles.length > 0 && `(${vehicles.length}/2)`}
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
          {!isVIP && vehicles.length > 0 && (
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
                
                {/* MAIN IMAGE */}
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

                {/* THUMBNAIL SCROLL */}
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

                  {/* Thumbnails */}
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

                {/* CAR DETAILS */}
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

                  {/* DETAILS GRID */}
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

                  {/* DESCRIPTION */}
                  {v.description && (
                    <p className="bg-green-100 rounded-lg p-2 text-xs text-green-800 mt-2 line-clamp-2">
                      {v.description}
                    </p>
                  )}
                </div>

                {/* ACTION BUTTONS */}
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
      <section className="bg-black border border-gray-800 shadow-lg rounded-xl p-4 lg:p-6 mb-6">
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
              <div key={c.id || index} className="bg-gray-900 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 gap-1">
                  <p className="font-semibold text-gray-200 text-sm lg:text-base">
                    {c.passengerName || 'Anonymous'}
                  </p>
                </div>
                <p className="text-xs lg:text-sm text-gray-200 line-clamp-2">{c.text}</p>
                {c.createdAt && (
                  <p className="text-xs text-gray-200 mt-2">
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

      {/* Vehicle Form Modal/card */}
      {showVehicleForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 lg:p-6 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-3 lg:p-6 relative my-2 lg:my-8 mx-2 lg:mx-0">
            <button 
              onClick={() => { 
                setShowVehicleForm(false); 
                setEditingVehicle(null); 
                setPreviews({});
              }} 
              className="absolute right-3 top-3 lg:right-4 lg:top-4 text-gray-600 text-xl lg:text-2xl hover:text-gray-800"
            >
              ×
            </button>
            
            <h3 className="text-lg lg:text-xl font-semibold mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
            </h3>

            <form onSubmit={submitVehicle} className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-3 lg:space-y-4">
                <div>
                  <label className="text-xs lg:text-sm font-medium text-gray-700">Car Name *</label>
                  <input 
                    value={carName} 
                    onChange={(e) => setCarName(e.target.value)} 
                    required 
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., Toyota Camry"
                  />
                </div>

                <div>
                  <label className="text-xs lg:text-sm font-medium text-gray-700">Car Model *</label>
                  <input 
                    value={carModel} 
                    onChange={(e) => setCarModel(e.target.value)} 
                    required 
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="e.g., 2023 LE"
                  />
                </div>

                {/* Car Type Selection */}
                <div>
                  <label className="text-xs lg:text-sm font-medium text-gray-700">Car Type *</label>
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

                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="text-xs lg:text-sm font-medium text-gray-700">Passengers *</label>
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
                    <label className="text-xs lg:text-sm font-medium text-gray-700">Car Color *</label>
                    <input 
                      value={exteriorColor} 
                      onChange={(e) => setExteriorColor(e.target.value)} 
                      required
                      className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., Black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className="text-xs lg:text-sm font-medium text-gray-700">Interior Color *</label>
                    <input 
                      value={interiorColor} 
                      onChange={(e) => setInteriorColor(e.target.value)} 
                      required
                      className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g., Beige"
                    />
                  </div>

                  <div>
                    <label className="text-xs lg:text-sm font-medium text-gray-700">Status</label>
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
                  <label htmlFor="acAvailable" className="ml-2 text-xs lg:text-sm text-gray-700">
                    Air Conditioning Available
                  </label>
                </div>

                <div>
                  <label className="text-xs lg:text-sm font-medium text-gray-700">
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
                  <label className="text-xs lg:text-sm font-medium text-gray-700">Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={2}
                    className="w-full border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <p className="text-xs lg:text-sm font-medium text-gray-700">
                  Upload required photos (front, side, back, interior) *
                </p>
                
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
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
                        className="block w-full text-xs lg:text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 lg:file:py-1.5 lg:file:px-3 file:rounded file:border-0 file:text-xs lg:file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {previews[key as keyof typeof previews] && (
                        <div className="relative mt-1">
                          <img 
                            src={previews[key as keyof typeof previews]} 
                            className="w-full h-24 lg:h-32 object-cover rounded border"
                            alt={label}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFile(null);
                              setPreviews(prev => ({ ...prev, [key]: undefined }));
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 lg:w-6 lg:h-6 rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 lg:p-3 mt-3 lg:mt-4">
                  <p className="text-xs lg:text-sm text-blue-700 font-medium">Preview</p>
                  <div className="grid grid-cols-2 gap-1 lg:gap-2 mt-1 lg:mt-2">
                    {Object.entries(previews).map(([key, url]) => (
                      url && (
                        <div key={key} className="text-center">
                          <p className="text-xs text-gray-500 capitalize">{key}</p>
                          <img 
                            src={url} 
                            alt={key} 
                            className="w-full h-16 lg:h-20 object-cover rounded mt-1"
                          />
                        </div>
                      )
                    ))}
                  </div>
                </div>

                <div className="mt-3 lg:mt-4 flex flex-col lg:flex-row justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { 
                      setShowVehicleForm(false); 
                      setEditingVehicle(null); 
                      setPreviews({});
                    }} 
                    className="px-3 lg:px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm w-full lg:w-auto order-2 lg:order-1"
                    disabled={savingVehicle}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm w-full lg:w-auto order-1 lg:order-2"
                    disabled={savingVehicle}
                  >
                    {savingVehicle ? (
                      <>
                        <LoadingRound />
                        <span className="text-xs lg:text-sm">Saving...</span>
                      </>
                    ) : editingVehicle ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotion Cards Section */}
      <section className="bg-white shadow-lg rounded-xl p-4 mb-6">
        <h2 className="text-lg lg:text-xl font-semibold mb-4">Grow Your Driver Business</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Share to Earn Card with Image */}
          <div id="share-link" className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl overflow-hidden">
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
                <h3 className="font-semibold text-blue-800 text-sm lg:text-base">Share & Earn Points</h3>
              </div>
              <p className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3">
                Share your driver profile! Earn points for every successful referral. More points = higher visibility in search results & earn ₦5000 in cash!
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  Progress: {referralCount}/{REFERRAL_TARGET}
                </span>
              </div>
             
              <div
                  className="mt-9 w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all text-center text-xs lg:text-sm"
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
                <h3 className="font-semibold text-yellow-800 text-sm lg:text-base">VIP Driver Benefits</h3>
              </div>
              <ul className="text-xs lg:text-sm text-gray-600 space-y-1 mb-2 lg:mb-3">
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
                className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all text-center text-xs lg:text-sm"
              >
                Upgrade to VIP
              </a>
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
        <h2 className="text-lg lg:text-2xl font-bold mb-3">Latest Transport, Pricing & Shipping News</h2>
        <div className="max-h-[45rem] lg:max-h-80 overflow-y-auto p-2">
          <TransportNewsPageUi />
        </div>
      </div>
    </div>
  );
}