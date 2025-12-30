"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {collection, query, where, getDocs, doc, updateDoc, arrayUnion,
  arrayRemove,Timestamp, getDoc, writeBatch, serverTimestamp, addDoc} from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { getAuth } from "firebase/auth"
import { FaStar, FaStarHalfAlt, FaRegStar, FaCheckCircle, FaTimesCircle, FaPhone, FaMapMarkerAlt, 
  FaUsers, FaPalette, FaSnowflake, FaFlag, FaEye, FaTrash, FaCar, FaSearch, FaWhatsapp, FaEnvelope, 
  FaClock, FaUserCheck, FaExclamationTriangle, FaUser, FaComment, FaCalendarAlt, FaShieldAlt} from 'react-icons/fa'

import { useRouter ,useSearchParams } from 'next/navigation'

// NEW: Imports From components 
import PreChat from "@/components/PreChat"
import BookingRequest from "@/components/BookingRequest"
import EnhancedWhatsApp from "@/components/EnhancedWhatsApp"
import NotificationBadge from "@/components/BookingRequest/NotificationBadge"
import SimpleBookingMap from "@/components/map/SimpleBookingMap"
import TripTracker from "@/components/map/TripTracker"
import ShareLocation from "@/components/map/ShareLocation"
import CustomerLocationToggle from "@/components/map/CustomerLocationToggle"

// Interfaces matching your Firebase data structure
interface VehicleLog {
  id: string;
  carName: string;
  carModel: string;
  carType: string;
  exteriorColor: string;
  passengers: number;
  ac: boolean;
  description: string;
  status: string;
  driverId: string;
  images?: {
    front?: string;
    back?: string;
    side?: string;
    interior?: string;
  };
}

interface Comment {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  firstName?: string;
  lastName?: string;
  comment: string;
  rating?: number;
  createdAt: any;
  updatedAt?: any;
}

interface Driver {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  city: string;
  state: string;
  country: string;
  verified: boolean;
  whatsappPreferred: boolean;
  profileImage?: string;
  vehicleLog: string[];
  comments?: Comment[];
  ratings?: number[];
  averageRating?: number;
  totalRatings?: number;
  customersCarried?: string[];
  // VIP FIELDS BASED ON YOUR SYSTEM
  isVip?: boolean;
  vipLevel?: number; // Calculated level (0-5)
  purchasedVipLevel?: number; // Purchased level (0-5)
  prestigeLevel?: number; // For level 5+
  referralCount?: number;
  vipBadge?: string; // This might not exist, we'll calculate it
}

interface DriverWithVehicle extends Driver {
  vehicles: VehicleLog[];
}

interface TripHistory {
  id?: string;
  tripId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverImage?: string;
  vehicleId: string;
  vehicleName: string;
  vehicleModel: string;
  vehicleType: string;
  vehicleImage?: string;
  // Trip details
  pickupLocation: string;
  destination: string;
  fare: number;
  status: 'active' | 'completed' | 'cancelled';
  startTime: any;
  endTime?: any;
  // Additional info
  rating?: number;
  review?: string;
  createdAt: any;
  updatedAt: any;
}

interface ContactedDriver {
  id?: string;
  driverId: string;
  driverName: string;
  phoneNumber: string;
  vehicleId: string;
  vehicleName: string;
  vehicleModel: string;
  contactDate: any;
  lastContacted: any;
  timestamp?: any;
}

interface HiredCar {
  id?: string;
  driverId: string;
  vehicleId: string;
  driverName: string;
  vehicleName: string;
  vehicleModel: string;
  hireDate: any;
  lastHired: any;
  timestamp?: any;
}

interface Trip {
  id: string;
  driverId: string;
  vehicleId: string;
  customerId: string;
  customerName: string;
  pickupLocation: string;
  destination: string;
  fare: number;
  status: string;
  startTime: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  endTime?: Timestamp;
  // NEW: For real-time tracking
  driverLocation?: {
    lat: number;
    lng: number;
    address?: string;
    timestamp: Timestamp;
  };
  routePolyline?: string; // For showing route on map
  currentLocation?: {
    lat: number;
    lng: number;
    address?: string;
    timestamp: Timestamp;
  };
}

///////////////////////////////////////////////////////////////////////
// VIP Configuration - Same as in driver profile
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

// Helper to get VIP name and color from level
const getVIPDetails = (vipLevel: number, prestigeLevel: number = 0) => {
    if (vipLevel <= 0) return { name: "", color: "", stars: 0 };
    
    const vipInfo = VIP_CONFIG.levels.find(level => level.level === vipLevel);
    if (!vipInfo) return { name: "", color: "", stars: 0 };
    
    return {
        name: vipInfo.name,
        color: vipInfo.color,
        stars: vipInfo.stars,
        level: vipLevel,
        prestigeLevel,
        displayName: prestigeLevel > 0 
        ? `${vipInfo.name} LV${prestigeLevel}`
        : vipInfo.name
    };
};

// Helper to check if driver is VIP
const isDriverVIP = (driver: Driver): boolean => {
    return (driver.vipLevel || 0) > 0 || (driver.purchasedVipLevel || 0) > 0;
};


// VIP Star Component (add this in your component file)
const VIPStar = ({ 
    vipLevel, 
    prestigeLevel = 0, 
    size = "sm" 
    }: { 
    vipLevel: number, 
    prestigeLevel?: number, 
    size?: "sm" | "md" | "lg" 
    }) => {
    if (vipLevel <= 0) return null;
    
    const vipDetails = getVIPDetails(vipLevel, prestigeLevel);
    if (!vipDetails.name) return null;
    
    const sizeClasses = {
        sm: "w-3 h-3",
        md: "w-4 h-4",
        lg: "w-5 h-5"
    };
    
    const getColorClass = (color: string) => {
        const colors: Record<string, string> = {
        green: "text-green-500 bg-green-100",
        yellow: "text-yellow-500 bg-yellow-100",
        purple: "text-purple-500 bg-purple-100",
        gold: "text-yellow-600 bg-yellow-100",
        black: "text-gray-900 bg-gray-100"
        };
        return colors[color] || colors.green;
    };
    
    const getBorderClass = (color: string) => {
        const colors: Record<string, string> = {
        green: "border-green-300",
        yellow: "border-yellow-300",
        purple: "border-purple-300",
        gold: "border-yellow-400",
        black: "border-gray-300"
        };
        return colors[color] || colors.green;
    };
    
    const getTextClass = (color: string) => {
        const colors: Record<string, string> = {
        green: "text-green-800",
        yellow: "text-yellow-800",
        purple: "text-purple-800",
        gold: "text-yellow-900",
        black: "text-gray-900"
        };
        return colors[color] || colors.green;
    };
    
    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getColorClass(vipDetails.color)} ${getBorderClass(vipDetails.color)} border`}>
        <div className="flex items-center gap-0.5">
            {Array.from({ length: vipDetails.stars }).map((_, i) => (
            <svg 
                key={i}
                className={`${sizeClasses[size]} fill-current`}
                viewBox="0 0 24 24"
            >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            ))}
        </div>
        {prestigeLevel > 0 && (
            <span className="text-xs font-bold px-1 py-0.5 rounded bg-gray-800 text-white">
            LV{prestigeLevel}
            </span>
        )}
        <span className={`text-xs font-semibold ${getTextClass(vipDetails.color)}`}>
            {vipDetails.name}
        </span>
        </div>
    );
};

export default function CarHireUi() {
    // activate for parameters
    const router = useRouter();
    const searchParams = useSearchParams()
    const search = searchParams.get('search');

    // State for contacted drivers and hired cars from Firebase
    const [tripHistory, setTripHistory] = useState<TripHistory[]>([]) // Trip history state
    const [contactedDrivers, setContactedDrivers] = useState<ContactedDriver[]>([])
    const [hiredCars, setHiredCars] = useState<HiredCar[]>([])

    // Pop up driver name before booking
    const [selectDriver, setSelectDriver] = useState("")

    // Close driver's information page
    const [driverInfo, setDriverInfo] = useState(false)

    // Trip management states
    // Trip management states
    const [tripInfo, setTripInfo] = useState<{
        pickupLocation: string;
        destination: string;
        fare: number;
        status: string;
        startTime: Timestamp | null;
        endTime: Timestamp | null;
        showForm?: boolean; 
    }>({
        pickupLocation: '',
        destination: '',
        fare: 0,
        status: 'pending',
        startTime: null,
        endTime: null,
        showForm: false,
    })

    const [activeTrip, setActiveTrip] = useState<Trip | null>(null)

    // Selected driver and vehicle state
    const [selectedDriver, setSelectedDriver] = useState<DriverWithVehicle | null>(null)
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleLog | null>(null)

    // Search Car by location and category
    const [searchLocation, setSearchLocation] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")

    // New filter states
    const [showACOnly, setShowACOnly] = useState(false)
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)

    // New state to handle review form inputs
    const [reviewForm, setReviewForm] = useState({ 
        comment: "", 
        rating: 0 
    })
    const [reviewMessage, setReviewMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" })
    const [hoverRating, setHoverRating] = useState(0)

    // State for loading and error
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // State for drivers with vehicles
    const [driversWithVehicles, setDriversWithVehicles] = useState<DriverWithVehicle[]>([])

    // Car hero image setter and thumbnail images
    const [mainImage, setMainImage] = useState<string>("/car_select.jpg")

    // Current user state
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [currentUserId, setCurrentUserId] = useState<string>("")

    // State for quick view history
    const [quickViewHistory, setQuickViewHistory] = useState<ContactedDriver | null>(null)

    // State for save button cooldown
    const [saveCooldown, setSaveCooldown] = useState<{ [key: string]: number }>({})
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error" | "info" | ""; text: string }>({ type: "", text: "" })

    // Toggle Booking Request
    const [showRequestBox, setShowRequestBox] = useState(false);
   
    // State for loading history
    const [loadingHistory, setLoadingHistory] = useState(false)

    // State for delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, comment: Comment | null}>({show: false, comment: null})

    // ✅ NEW: State for Pre-Chat Modal
    const [showPreChat, setShowPreChat] = useState(false)

    // ✅ NEW: State for Enhanced WhatsApp Modal
    const [showEnhancedWhatsApp, setShowEnhancedWhatsApp] = useState(false)

    // Check if user has already reviewed
    const hasUserReviewed = selectedDriver?.comments?.some(comment => comment.userId === currentUserId)

    // Notifications
    const [notificationCount, setNotificationCount] = useState(0);
    const [notificationType, setNotificationType] = useState<"driver" | "customer">("customer");
    const [isDriver, setIsDriver] = useState(false);

    //location settings Panel
    const [showLocationPanel, setShowLocationPanel] = useState(false);


   // Initialize auth and load history from Firebase
    useEffect(() => {
        const auth = getAuth()
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUser(user)
                setCurrentUserId(user.uid)
                loadUserHistory(user.uid)
                
                // ✅ Clean way: Call notification function
                loadNotificationData(user.uid)
            } else {
                setCurrentUser(null)
                setCurrentUserId("")
                setContactedDrivers([])
                setHiredCars([])
                
                // Clear notification data for logged out users
                setNotificationCount(0)
                setNotificationType("customer")
                setIsDriver(false)
            }
        })

        // Load quick view history from localStorage
        const savedHistory = localStorage.getItem('carHireQuickView')
        if (savedHistory) {
            setQuickViewHistory(JSON.parse(savedHistory))
        }

        return () => unsubscribe()
    }, [])

    // New function to load notification data
    const loadNotificationData = async (userId: string) => {
        try {
            // Check if user is driver
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const driverStatus = userData.isDriver || false;
                setIsDriver(driverStatus);
                setNotificationType(driverStatus ? "driver" : "customer");

                if (driverStatus) {
                    // For drivers: Count unoffered requests
                    const requestsRef = collection(db, "bookingRequests");
                    const querySnapshot = await getDocs(query(
                        requestsRef,
                        where("status", "==", "active")
                    ));
                    
                    let unofferedCount = 0;
                    querySnapshot.forEach((docSnap) => {
                        const request = docSnap.data();
                        const hasMadeOffer = request.offers?.some((offer: any) => offer.driverId === userId);
                        if (!hasMadeOffer && request.userId !== userId) {
                            unofferedCount++;
                        }
                    });
                    setNotificationCount(Math.min(unofferedCount, 99));
                } else {
                    // For customers: Count received offers
                    const requestsRef = collection(db, "bookingRequests");
                    const querySnapshot = await getDocs(query(
                        requestsRef,
                        where("userId", "==", userId),
                        where("status", "==", "active")
                    ));
                    
                    let totalOffers = 0;
                    querySnapshot.forEach((docSnap) => {
                        const request = docSnap.data();
                        totalOffers += (request.offers?.length || 0);
                    });
                    setNotificationCount(Math.min(totalOffers, 99));
                }
            }
        } catch (error) {
            console.error("Error fetching notification data:", error);
        }
    };

    // Save to localStorage when quickViewHistory changes
    useEffect(() => {
        if (quickViewHistory) {
            localStorage.setItem('carHireQuickView', JSON.stringify(quickViewHistory))
        } else {
            localStorage.removeItem('carHireQuickView')
        }
    }, [quickViewHistory])

    // Load user trip history from Firebase with 5-item limit
    const loadUserHistory = async (userId: string) => {
        try {
            setLoadingHistory(true);
            
            // Fetch trips where user is the customer
            const tripsRef = collection(db, "trips");
            const q = query(
            tripsRef,
            where("customerId", "==", userId),
            where("status", "in", ["completed", "cancelled"]) // Only completed/cancelled trips
            );
            
            const tripsSnapshot = await getDocs(q);
            
            const tripsList: TripHistory[] = [];
            
            for (const tripDoc of tripsSnapshot.docs) {
            const tripData = tripDoc.data();
            
            // Get driver details
            const driverDoc = await getDoc(doc(db, "users", tripData.driverId));
            const driverData = driverDoc.data();
            
            // Get vehicle details
            const vehicleDoc = await getDoc(doc(db, "vehicleLog", tripData.vehicleId));
            const vehicleData = vehicleDoc.data();
            
            // Get user's review for this trip if exists
            let userRating: number | undefined;
            let userReview: string | undefined;
            
            if (driverData?.comments) {
                const userComment = driverData.comments.find(
                (comment: Comment) => comment.userId === userId
                );
                if (userComment) {
                userRating = userComment.rating;
                userReview = userComment.comment;
                }
            }
            
            const tripHistoryItem: TripHistory = {
                id: tripDoc.id,
                tripId: tripDoc.id,
                driverId: tripData.driverId,
                driverName: driverData?.fullName || `${driverData?.firstName} ${driverData?.lastName}`,
                driverPhone: driverData?.phoneNumber || "",
                driverImage: driverData?.profileImage,
                vehicleId: tripData.vehicleId,
                vehicleName: vehicleData?.carName || "",
                vehicleModel: vehicleData?.carModel || "",
                vehicleType: vehicleData?.carType || "",
                vehicleImage: vehicleData?.images?.front || getDefaultVehicleImage(vehicleData?.carType),
                // Trip details
                pickupLocation: tripData.pickupLocation || "",
                destination: tripData.destination || "",
                fare: tripData.fare || 0,
                status: tripData.status,
                startTime: tripData.startTime,
                endTime: tripData.endTime,
                // Review info
                rating: userRating,
                review: userReview,
                createdAt: tripData.createdAt,
                updatedAt: tripData.updatedAt
            };
            
            tripsList.push(tripHistoryItem);
            }
            
            // Sort by endTime (most recent first) and limit to 5
            const sortedTrips = tripsList.sort((a, b) => {
            const timeA = a.endTime?.toMillis?.() || a.endTime?.seconds * 1000 || new Date(a.endTime).getTime() || 0;
            const timeB = b.endTime?.toMillis?.() || b.endTime?.seconds * 1000 || new Date(b.endTime).getTime() || 0;
            return timeB - timeA; // Descending (newest first)
            }).slice(0, 5); // Keep only 5 most recent
            
            setTripHistory(sortedTrips);
            
            // For backward compatibility, also load old history format
            const userDocRef = doc(db, "users", userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
            const userData = userDoc.data();
            
            const contactedDriversData: ContactedDriver[] = (userData.contactedDrivers || [])
                .map((item: ContactedDriver) => ({
                ...item,
                timestamp: item.lastContacted || item.contactDate || serverTimestamp()
                }))
                .sort((a: ContactedDriver, b: ContactedDriver) => {
                const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || new Date(a.timestamp).getTime() || 0;
                const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || new Date(b.timestamp).getTime() || 0;
                return timeB - timeA;
                })
                .slice(0, 5);
            
            const hiredCarsData: HiredCar[] = (userData.hiredCars || [])
                .map((item: HiredCar) => ({
                ...item,
                timestamp: item.lastHired || item.hireDate || serverTimestamp()
                }))
                .sort((a: HiredCar, b: HiredCar) => {
                const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || new Date(a.timestamp).getTime() || 0;
                const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || new Date(b.timestamp).getTime() || 0;
                return timeB - timeA;
                })
                .slice(0, 5);
            
            setContactedDrivers(contactedDriversData);
            setHiredCars(hiredCarsData);
            }
            
        } catch (error) {
            console.error("Error loading user history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Fetch drivers and vehicle data from Firebase
    useEffect(() => {
        fetchDriversAndVehicles()
    }, [currentUserId]) // Re-fetch when currentUserId changes

    // new useEffect to handle query parameters
    useEffect(() => {
        // Only check query params after drivers are loaded
        if (driversWithVehicles.length > 0) {
            const driverId = searchParams.get('driver')
            const vehicleId = searchParams.get('vehicle')
            const searchQuery = searchParams.get('search')
            
            // Handle search query from homepage
            if (searchQuery) {
                setSearchLocation(searchQuery)
                
                // Optional: Also set a message showing what was searched
                console.log(`Searching for: ${searchQuery}`)
                
                // Optional: Auto-scroll to search results
                setTimeout(() => {
                    const element = document.getElementById('search-results')
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' })
                    }
                }, 500)
            }
            
            if (driverId) {
                // Find the driver in the loaded drivers
                const driver = driversWithVehicles.find(d => d.uid === driverId || d.id === driverId)
                
                if (driver) {
                    let vehicle: VehicleLog | null = null
                    
                    // Find the specific vehicle if vehicleId is provided
                    if (vehicleId) {
                        vehicle = driver.vehicles.find(v => v.id === vehicleId) || null
                    }
                    
                    // If no specific vehicle found, use the first available vehicle
                    if (!vehicle && driver.vehicles.length > 0) {
                        vehicle = driver.vehicles[0]
                    }
                    
                    if (vehicle) {
                        // Open the driver modal
                        setSelectedDriver(driver)
                        setSelectedVehicle(vehicle)
                        setDriverInfo(true)
                        
                        // Set the main image
                        const firstImage = vehicle.images?.front || 
                                        vehicle.images?.side || 
                                        vehicle.images?.back || 
                                        vehicle.images?.interior || 
                                        getDefaultVehicleImage(vehicle.carType)
                        setMainImage(firstImage)
                        
                        // Scroll to the modal after a short delay
                        setTimeout(() => {
                            const element = document.getElementById('contact-driver')
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth' })
                            }
                        }, 300)
                    }
                }
            }
        }
    }, [driversWithVehicles, searchParams])

    // Fetch Drivers and Vehicles
    const fetchDriversAndVehicles = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch drivers
            const driversQuery = query(
            collection(db, "users"),
            where("isDriver", "==", true)
            );
            const driversSnapshot = await getDocs(driversQuery);
            
            // Fetch all vehicles
            const vehiclesQuery = collection(db, "vehicleLog");
            const vehiclesSnapshot = await getDocs(vehiclesQuery);
            
            // Create vehicle map - ONLY include available vehicles (not on trip)
            const vehicleMap = new Map<string, VehicleLog>();
            vehiclesSnapshot.forEach((doc) => {
            const data = doc.data();
            // Only include available vehicles (not on trip)
            if (data.status === 'available') {
                const vehicle: VehicleLog = {
                id: doc.id,
                carName: data.carName || "",
                carModel: data.carModel || "",
                carType: data.carType || "",
                exteriorColor: data.exteriorColor || "",
                passengers: data.passengers || 0,
                ac: data.ac || false,
                description: data.description || "",
                status: data.status || "available",
                driverId: data.driverId || "",
                images: data.images || {},
                };
                vehicleMap.set(doc.id, vehicle);
            }
            });

            // Combine drivers with available vehicles
            const driversWithVehiclesList: DriverWithVehicle[] = [];
            
            driversSnapshot.forEach(doc => {
            const data = doc.data();
            const driver: Driver = {
                id: doc.id,
                uid: data.uid || doc.id,
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                fullName: data.fullName || `${data.firstName} ${data.lastName}`,
                phoneNumber: data.phoneNumber || "",
                email: data.email || "",
                city: data.city || "",
                state: data.state || "",
                country: data.country || "",
                verified: data.verified || false,
                whatsappPreferred: data.whatsappPreferred || false,
                profileImage: data.profileImage || "",
                vehicleLog: data.vehicleLog || [],
                comments: data.comments || [],
                ratings: data.ratings || [],
                averageRating: data.averageRating || 0,
                totalRatings: data.totalRatings || 0,
                customersCarried: data.customersCarried || [],
                vipLevel: data.vipLevel || 0,
                purchasedVipLevel: data.purchasedVipLevel || 0,
                prestigeLevel: data.prestigeLevel || 0,
                referralCount: data.referralCount || 0,
                isVip: (data.vipLevel || 0) > 0 || (data.purchasedVipLevel || 0) > 0,
            };

            // Skip if this driver is the current user (prevent self-booking)
            if (driver.uid === currentUserId) {
                return;
            }

            // Get available vehicles for this driver
            const driverVehicles: VehicleLog[] = [];
            
            driver.vehicleLog.forEach(vehicleId => {
                const vehicle = vehicleMap.get(vehicleId);
                if (vehicle) {
                driverVehicles.push(vehicle);
                }
            });

            // Also check vehicles by driverId (in case vehicleLog IDs don't match)
            vehiclesSnapshot.forEach((vehicleDoc) => {
                const vehicleData = vehicleDoc.data();
                if (
                vehicleData.driverId === driver.uid && 
                vehicleData.status === 'available' &&
                !driverVehicles.some(v => v.id === vehicleDoc.id)
                ) {
                const vehicle: VehicleLog = {
                    id: vehicleDoc.id,
                    carName: vehicleData.carName || "",
                    carModel: vehicleData.carModel || "",
                    carType: vehicleData.carType || "",
                    exteriorColor: vehicleData.exteriorColor || "",
                    passengers: vehicleData.passengers || 0,
                    ac: vehicleData.ac || false,
                    description: vehicleData.description || "",
                    status: vehicleData.status || "available",
                    driverId: vehicleData.driverId || "",
                    images: vehicleData.images || {},
                };
                driverVehicles.push(vehicle);
                }
            });

            if (driverVehicles.length > 0) {
                driversWithVehiclesList.push({
                ...driver,
                vehicles: driverVehicles
                });
            }
            });

            // SORT DRIVERS BY PRIORITY (EXACT ORDER YOU REQUESTED):
            driversWithVehiclesList.sort((a, b) => {
            // Get VIP level (use the higher of vipLevel or purchasedVipLevel)
            const getEffectiveVipLevel = (driver: DriverWithVehicle): number => {
                return Math.max(driver.vipLevel || 0, driver.purchasedVipLevel || 0);
            };
            
            const aVipLevel = getEffectiveVipLevel(a);
            const bVipLevel = getEffectiveVipLevel(b);
            const aIsVIP = aVipLevel > 0;
            const bIsVIP = bVipLevel > 0;
            const aVerified = a.verified;
            const bVerified = b.verified;
            
            // 1. VIP with Verified
            if (aIsVIP && aVerified && !(bIsVIP && bVerified)) return -1;
            if (bIsVIP && bVerified && !(aIsVIP && aVerified)) return 1;
            
            // 2. VIP without Verified
            if (aIsVIP && !aVerified && !(bIsVIP && bVerified) && !(bIsVIP && bVerified)) {
                // Both are VIP without verified, compare VIP levels
                if (aVipLevel !== bVipLevel) return bVipLevel - aVipLevel;
                // Same VIP level, compare ratings
                return (b.averageRating || 0) - (a.averageRating || 0);
            }
            if (bIsVIP && !bVerified && !(aIsVIP && aVerified) && !(aIsVIP && aVerified)) {
                // Both are VIP without verified, compare VIP levels
                if (aVipLevel !== bVipLevel) return bVipLevel - aVipLevel;
                // Same VIP level, compare ratings
                return (b.averageRating || 0) - (a.averageRating || 0);
            }
            
            // 3. Verified without VIP
            if (aVerified && !aIsVIP && !bIsVIP && !bVerified) return -1;
            if (bVerified && !bIsVIP && !aIsVIP && !aVerified) return 1;
            
            // 4. Others (neither VIP nor verified)
            // Sort by rating for non-VIP, non-verified drivers
            return (b.averageRating || 0) - (a.averageRating || 0);
            
            // If all criteria are equal, maintain original order
            });

            setDriversWithVehicles(driversWithVehiclesList);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load drivers and vehicles. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Filter drivers by location, category, AC, and verification
    const filteredDrivers = driversWithVehicles.flatMap((driver) => {
        return driver.vehicles
        .filter((vehicle) => {
            const locationMatch = driver.city?.toLowerCase().includes(searchLocation.toLowerCase()) ||
                                driver.state?.toLowerCase().includes(searchLocation.toLowerCase()) ||
                                searchLocation === ""
            
            // If AC filter is on, remove keke even if driver has AC true
            let categoryMatch = true
            if (selectedCategory === "all") {
                // If AC filter is on and category is all, exclude keke
                if (showACOnly && vehicle.carType.toLowerCase() === "keke") {
                    categoryMatch = false
                }
            } else {
                categoryMatch = vehicle.carType?.toLowerCase() === selectedCategory.toLowerCase()
                // If AC filter is on and category is keke, exclude it
                if (showACOnly && vehicle.carType.toLowerCase() === "keke") {
                    categoryMatch = false
                }
            }
            
            const acMatch = !showACOnly || (vehicle.ac && vehicle.carType.toLowerCase() !== "keke")
            const verifiedMatch = !showVerifiedOnly || driver.verified
            
            return locationMatch && categoryMatch && acMatch && verifiedMatch
        })
        .map(vehicle => ({ driver, vehicle }))
    })

    // Handle driver selection
    const handleDriverSelect = (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        setSelectedDriver(driver)
        setSelectedVehicle(vehicle)
        setDriverInfo(true)
        setReviewForm({
            comment: "",
            rating: 0
        })
        setHoverRating(0)
        setSaveMessage({ type: "", text: "" }) // Clear any previous save messages
        setShowDeleteConfirm({show: false, comment: null}) // Clear delete confirmation
        const firstImage = vehicle.images?.front || 
                        vehicle.images?.side || 
                        vehicle.images?.back || 
                        vehicle.images?.interior || 
                        "/car_select.jpg"
        setMainImage(firstImage)
        window.scrollTo({top: 0, behavior: "smooth"})
    }

    // ✅ NEW: Handle Pre-Chat button click
    const handlePreChatClick = (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        setSelectedDriver(driver)
        setSelectedVehicle(vehicle)
        setShowPreChat(true)
    }

    // ✅ NEW: Handle Enhanced WhatsApp button click
    const handleEnhancedWhatsAppClick = (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        setSelectedDriver(driver)
        setSelectedVehicle(vehicle)
        setShowEnhancedWhatsApp(true)
    }

    // Check if user can save (10-minute cooldown)
    const canSaveDriver = (driverId: string, vehicleId: string) => {
        if (!currentUser) return { canSave: false, message: "Please sign in first" }
        
        const key = `${driverId}_${vehicleId}`
        const lastSaveTime = saveCooldown[key]
        
        if (lastSaveTime) {
            const tenMinutes = 10 * 60 * 1000 // 10 minutes in milliseconds
            const timeSinceLastSave = Date.now() - lastSaveTime
            
            if (timeSinceLastSave < tenMinutes) {
                const minutesLeft = Math.ceil((tenMinutes - timeSinceLastSave) / 60000)
                return { 
                    canSave: false, 
                    message: `Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} before saving again` 
                }
            }
        }
        
        return { canSave: true, message: "" }
    }

    // Handle saving driver to user's contactedDrivers and hiredCars
    const handleSaveDriver = async () => {
        if (!currentUser) {
            setSaveMessage({ 
                type: "error", 
                text: "Please sign in to save drivers to your history" 
            })
            return
        }

        if (!selectedDriver || !selectedVehicle) {
            setSaveMessage({ 
                type: "error", 
                text: "No driver or vehicle selected" 
            })
            return
        }

        // Check cooldown
        const cooldownCheck = canSaveDriver(selectedDriver.uid, selectedVehicle.id)
        if (!cooldownCheck.canSave) {
            setSaveMessage({ 
                type: "info", 
                text: cooldownCheck.message 
            })
            return
        }

        try {
            setSaveMessage({ type: "", text: "" })
            
            const userDocRef = doc(db, "users", currentUser.uid)
            const driverDocRef = doc(db, "users", selectedDriver.id)
            const now = Timestamp.now()

            // Create the new history items
            const newContactedDriver: ContactedDriver = {
                driverId: selectedDriver.uid,
                driverName: `${selectedDriver.firstName} ${selectedDriver.lastName}`,
                phoneNumber: selectedDriver.phoneNumber,
                vehicleId: selectedVehicle.id,
                vehicleName: selectedVehicle.carName,
                vehicleModel: selectedVehicle.carModel,
                contactDate: now,
                lastContacted: now,
                timestamp: now
            }

            const newHiredCar: HiredCar = {
                driverId: selectedDriver.uid,
                vehicleId: selectedVehicle.id,
               driverName: `${selectedDriver.firstName} ${selectedDriver.lastName}`,
                vehicleName: selectedVehicle.carName,
                vehicleModel: selectedVehicle.carModel,
                hireDate: now,
                lastHired: now,
                timestamp: now
            }

            // Get current user data
            const userDoc = await getDoc(userDocRef)
            const userData = userDoc.data()
            
            let currentContactedDrivers: ContactedDriver[] = userData?.contactedDrivers || []
            let currentHiredCars: HiredCar[] = userData?.hiredCars || []

            // Check if already exists
            const existingContactIndex = currentContactedDrivers.findIndex(
                (cd: ContactedDriver) => cd.driverId === selectedDriver.uid && cd.vehicleId === selectedVehicle.id
            )
            
            const existingHireIndex = currentHiredCars.findIndex(
                (hc: HiredCar) => hc.driverId === selectedDriver.uid && hc.vehicleId === selectedVehicle.id
            )

            // If exists, remove old entries first
            if (existingContactIndex !== -1) {
                currentContactedDrivers.splice(existingContactIndex, 1)
            }
            
            if (existingHireIndex !== -1) {
                currentHiredCars.splice(existingHireIndex, 1)
            }

            // Add new entries at the beginning
            currentContactedDrivers.unshift(newContactedDriver)
            currentHiredCars.unshift(newHiredCar)

            // Keep only 5 most recent items
            if (currentContactedDrivers.length > 5) {
                currentContactedDrivers = currentContactedDrivers.slice(0, 5)
            }
            
            if (currentHiredCars.length > 5) {
                currentHiredCars = currentHiredCars.slice(0, 5)
            }

            // Update both user and driver documents in a batch
            const batch = writeBatch(db)
            
            // Update user document with limited history
            batch.update(userDocRef, {
                contactedDrivers: currentContactedDrivers,
                hiredCars: currentHiredCars,
                updatedAt: now
            })

            // Add user to driver's customersCarried (if not already there)
            if (!selectedDriver.customersCarried?.includes(currentUser.uid)) {
                batch.update(driverDocRef, {
                    customersCarried: arrayUnion(currentUser.uid),
                    updatedAt: now
                })
            }

            await batch.commit()

            // Update local state
            setContactedDrivers(currentContactedDrivers)
            setHiredCars(currentHiredCars)

            // Update selected driver's customersCarried in local state
            if (selectedDriver && !selectedDriver.customersCarried?.includes(currentUser.uid)) {
                setSelectedDriver({
                    ...selectedDriver,
                    customersCarried: [...(selectedDriver.customersCarried || []), currentUser.uid]
                })
            }

            // Update cooldown state
            const key = `${selectedDriver.uid}_${selectedVehicle.id}`
            setSaveCooldown(prev => ({ ...prev, [key]: Date.now() }))

            // Save to quick view history
            setQuickViewHistory(newContactedDriver)
            
            // Show success message
            setSaveMessage({ 
                type: "success", 
                text: "✓ Driver and vehicle saved to your history!" 
            })

            // Clear message after 5 seconds
            setTimeout(() => {
                setSaveMessage({ type: "", text: "" })
            }, 5000)

        } catch (error) {
            console.error("Error saving driver:", error)
            setSaveMessage({ 
                type: "error", 
                text: "Failed to save driver. Please try again." 
            })
            
            // Clear error message after 5 seconds
            setTimeout(() => {
                setSaveMessage({ type: "", text: "" })
            }, 5000)
        }
    }

    // Handle closing driver info and showing quick view if saved
    const handleCloseDriverInfo = () => {
        setDriverInfo(false)
        setSaveMessage({ type: "", text: "" }) // Clear save message
        setShowDeleteConfirm({show: false, comment: null}) // Clear delete confirmation
    }

    // Handle review input change
    const handleReviewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setReviewForm(prev => ({ ...prev, [name]: value }))
    }

    // Handle rating click
    const handleRatingClick = (rating: number) => {
        setReviewForm(prev => ({ ...prev, rating }))
    }

    // Handle complain button
    const handleComplain = (driverName: string, vehicle: VehicleLog) => {
        setSelectDriver(`${driverName} - ${vehicle.carName} ${vehicle.carModel}`)
        
        // Scroll to the div with id="complains"
        const complainsDiv = document.getElementById('complain');
        if (complainsDiv) {
            complainsDiv.scrollIntoView({ 
                behavior: "smooth", 
                block: "start" // or "center", "end", "nearest"
            });
        }
    }

    // Handle delete comment
    const handleDeleteComment = async (commentToDelete: Comment) => {
        if (!currentUser || !selectedDriver) return
        
        // Check if the comment belongs to the current user
        if (commentToDelete.userId !== currentUser.uid) {
            setReviewMessage({ 
                type: "error", 
                text: "You can only delete your own comments." 
            })
            setTimeout(() => {
                setReviewMessage({ type: "", text: "" })
            }, 5000)
            return
        }

        // Show confirmation message instead of window.confirm
        setShowDeleteConfirm({show: true, comment: commentToDelete})
    }

    // Confirm delete comment
    const confirmDeleteComment = async () => {
        if (!showDeleteConfirm.comment || !selectedDriver || !currentUser) return

        try {
            const commentToDelete = showDeleteConfirm.comment
            const driverDocRef = doc(db, "users", selectedDriver.id)
            
            // Remove the comment from the array
            await updateDoc(driverDocRef, {
                comments: arrayRemove(commentToDelete),
                ratings: arrayRemove(commentToDelete.rating)
            })

            // Update average rating
            const remainingComments = selectedDriver.comments?.filter(c => 
                c.userId !== currentUser.uid || c.createdAt !== commentToDelete.createdAt
            ) || []
            
            const remainingRatings = selectedDriver.ratings?.filter(r => 
                r !== commentToDelete.rating
            ) || []
            
            const newAverageRating = remainingRatings.length > 0 
                ? remainingRatings.reduce((a, b) => a + b, 0) / remainingRatings.length 
                : 0

            await updateDoc(driverDocRef, {
                averageRating: newAverageRating,
                totalRatings: remainingRatings.length
            })

            // Update local state
            setSelectedDriver(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    comments: remainingComments,
                    ratings: remainingRatings,
                    averageRating: newAverageRating,
                    totalRatings: remainingRatings.length
                }
            })

            // Update driversWithVehicles state
            setDriversWithVehicles(prev => prev.map(driver => {
                if (driver.id === selectedDriver.id) {
                    return {
                        ...driver,
                        comments: remainingComments,
                        ratings: remainingRatings,
                        averageRating: newAverageRating,
                        totalRatings: remainingRatings.length
                    }
                }
                return driver
            }))

            // Close confirmation
            setShowDeleteConfirm({show: false, comment: null})
            
            setReviewMessage({ 
                type: "success", 
                text: "✓ Review deleted successfully!" 
            })

            // Clear message after 5 seconds
            setTimeout(() => {
                setReviewMessage({ type: "", text: "" })
            }, 5000)

        } catch (error) {
            console.error("Error deleting review:", error)
            setShowDeleteConfirm({show: false, comment: null})
            setReviewMessage({ 
                type: "error", 
                text: "Failed to delete review. Please try again." 
            })
            
            // Clear error message after 5 seconds
            setTimeout(() => {
                setReviewMessage({ type: "", text: "" })
            }, 5000)
        }
    }

    // Cancel delete
    const cancelDeleteComment = () => {
        setShowDeleteConfirm({show: false, comment: null})
        setReviewMessage({ type: "", text: "" })
    }

    // Handle review submission 
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedDriver || !currentUser) {
            setReviewMessage({ 
                type: "error", 
                text: "Please sign in to post a review." 
            })
            return
        }

        if (hasUserReviewed) {
            setReviewMessage({ 
                type: "error", 
                text: "You have already reviewed this driver. You can delete your existing review to submit a new one." 
            })
            return
        }

        if (!reviewForm.rating) {
            setReviewMessage({ 
                type: "error", 
                text: "Please select a rating." 
            })
            return
        }

        try {
            const driverDocRef = doc(db, "users", selectedDriver.id)
            
            // Get user's fullName from Firestore
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let userName = "User";
            let firstName = "User";
            let lastName = "";
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Use fullName from Firestore (main source)
                if (userData.fullName) {
                    userName = userData.fullName;
                    const nameParts = userName.split(' ');
                    firstName = nameParts[0] || "User";
                    lastName = nameParts.slice(1).join(' ') || "";
                }
            }

            const newComment: Comment = {
                userId: currentUser.uid,
                userName: userName,
                userEmail: currentUser.email || "",
                firstName: firstName,
                lastName: lastName,
                comment: reviewForm.comment,
                rating: reviewForm.rating,
                createdAt: Timestamp.now()
            }

            await updateDoc(driverDocRef, {
                comments: arrayUnion(newComment),
                ratings: arrayUnion(reviewForm.rating)
            })

            const updatedRatings = [...(selectedDriver.ratings || []), reviewForm.rating]
            const newAverageRating = updatedRatings.reduce((a, b) => a + b, 0) / updatedRatings.length
            
            await updateDoc(driverDocRef, {
                averageRating: newAverageRating,
                totalRatings: updatedRatings.length
            })

            setSelectedDriver(prev => {
                if (!prev) return null
                return {
                    ...prev,
                    comments: [...(prev.comments || []), newComment],
                    ratings: updatedRatings,
                    averageRating: newAverageRating,
                    totalRatings: updatedRatings.length
                }
            })

            setDriversWithVehicles(prev => prev.map(driver => {
                if (driver.id === selectedDriver.id) {
                    return {
                        ...driver,
                        comments: [...(driver.comments || []), newComment],
                        ratings: updatedRatings,
                        averageRating: newAverageRating,
                        totalRatings: updatedRatings.length
                    }
                }
                return driver
            }))

            setReviewForm({ 
                comment: "", 
                rating: 0 
            })
            setHoverRating(0)
            
            setReviewMessage({ 
                type: "success", 
                text: "✓ Review posted successfully!" 
            })

            setTimeout(() => {
                setReviewMessage({ type: "", text: "" })
            }, 5000)

        } catch (error) {
            console.error("Error posting review:", error)
            setReviewMessage({ 
                type: "error", 
                text: "Failed to post review. Please try again." 
            })
            
            setTimeout(() => {
                setReviewMessage({ type: "", text: "" })
            }, 5000)
        }
    }

    // Get default image for a vehicle
    const getDefaultVehicleImage = (carType: string) => {
        const images: Record<string, string> = {
            "sedan": "/carr.jpg",
            "suv": "/car.jpg",
            "truck": "/carz.jpg",
            "van": "/car.jpg",
            "keke": "/carz.jpg",
            "luxury": "/carr.jpg",
            "bus": "/carz.jpg",
        }
        return images[carType?.toLowerCase()] || "/car_select.jpg"
    }

    // Get all images for a vehicle
    const getVehicleImages = (vehicle: VehicleLog) => {
        const images: string[] = []
        if (vehicle.images?.front) images.push(vehicle.images.front)
        if (vehicle.images?.side) images.push(vehicle.images.side)
        if (vehicle.images?.back) images.push(vehicle.images.back)
        if (vehicle.images?.interior) images.push(vehicle.images.interior)
        
        if (images.length === 0) {
            images.push(getDefaultVehicleImage(vehicle.carType))
            images.push("/car.jpg")
            images.push("/carz.jpg")
        }
        
        return images
    }

    // Get driver's location string
    const getDriverLocation = (driver: DriverWithVehicle) => {
        const parts = []
        if (driver.city) parts.push(driver.city)
        if (driver.state) parts.push(driver.state)
        return parts.join(", ") || "Location not specified"
    }

    // Format timestamp to readable date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return "Recently"
        
        try {
            if (timestamp.toDate) {
                return timestamp.toDate().toLocaleDateString("en-GB")
            } else if (timestamp.seconds) {
                return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB")
            }
            return new Date(timestamp).toLocaleDateString("en-GB")
        } catch (error) {
            return "Recently"
        }
    }

    // Render star rating with react-icons
    const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md", showNumber: boolean = true) => {
        const sizeClasses = {
            sm: "w-3 h-3",
            md: "w-4 h-4",
            lg: "w-5 h-5"
        }
        
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-yellow-400">
                        {star <= rating ? (
                            <FaStar className={`${sizeClasses[size]}`} />
                        ) : star - 0.5 <= rating ? (
                            <FaStarHalfAlt className={`${sizeClasses[size]}`} />
                        ) : (
                            <FaRegStar className={`${sizeClasses[size]}`} />
                        )}
                    </span>
                ))}
                {showNumber && (
                    <span className="ml-1 text-sm text-gray-600">
                        ({rating.toFixed(1)})
                    </span>
                )}
            </div>
        )
    }

    // Function to re-open driver details from quick view
    const handleQuickViewClick = () => {
        if (quickViewHistory) {
            // Find the driver and vehicle from the history
            const driver = driversWithVehicles.find(d => d.uid === quickViewHistory.driverId)
            const vehicle = driver?.vehicles.find(v => v.id === quickViewHistory.vehicleId)
            
            if (driver && vehicle) {
                handleDriverSelect(driver, vehicle)
            }
        }
    }

    // Function to clear quick view history
    const handleClearQuickView = () => {
        setQuickViewHistory(null)
    }

    // WhatsApp handler with country code
    const handleWhatsAppMessage = (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        if (!driver.whatsappPreferred) {
            alert("This driver does not prefer WhatsApp communication. Please call instead.")
            return
        }

        // Get phone number
        let phoneNumber = driver.phoneNumber.trim()
        
        // Remove all non-numeric characters
        phoneNumber = phoneNumber.replace(/\D/g, '')
        
        // If phone number starts with 0 (Nigerian format), convert to +234
        if (phoneNumber.startsWith('0') && phoneNumber.length === 11) {
            phoneNumber = '+234' + phoneNumber.substring(1)
        }
        // If phone number is 10 digits (without 0), add +234
        else if (phoneNumber.length === 10) {
            phoneNumber = '+234' + phoneNumber
        }
        // If it doesn't start with +, add it
        else if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+' + phoneNumber
        }
        
        // Validate phone number
        if (!phoneNumber.match(/^\+\d{10,15}$/)) {
            alert("Invalid phone number format. Please use the call button instead.")
            return
        }

        const message = `Hello ${driver.fullName}, I'm interested in hiring your ${vehicle.carName} ${vehicle.carModel} (${vehicle.carType}). Could you please provide more information about availability and pricing?`
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
        
        window.open(whatsappUrl, '_blank')
    }

    // Start a new trip
    const startTrip = async (driverId: string, vehicleId: string, pickupLocation: string, destination: string) => {
        if (!currentUser) {
            alert('Please sign in to start a trip');
            return null;
        }

        if (!pickupLocation || !destination) {
            alert('Please enter both pickup location and destination');
            return null;
        }

        try {
            // Generate a simple fare based on distance (you can use actual calculation later)
            const estimatedFare = Math.floor(Math.random() * 5000) + 2000; // 2000-7000 NGN

            const tripData = {
                driverId,
                vehicleId,
                customerId: currentUser.uid,
                customerName: currentUser.displayName || 'Customer',
                pickupLocation,
                destination,
                fare: estimatedFare,
                status: 'active',
                startTime: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                // NEW: Initial location (you can get from driver's profile or ask driver to share)
                driverLocation: {
                    lat: 9.0765, // Default Nigeria coordinates (Lagos)
                    lng: 7.3986, // Default Nigeria coordinates (Abuja)
                    address: 'Starting point',
                    timestamp: Timestamp.now()
                }
            };

            // Add trip to trips collection
            const tripsRef = collection(db, 'trips');
            const tripDoc = await addDoc(tripsRef, tripData);
            
            // Update vehicle status to 'on-trip'
            const vehicleRef = doc(db, 'vehicleLog', vehicleId);
            await updateDoc(vehicleRef, {
            status: 'on-trip',
            currentTripId: tripDoc.id
            });

            // Update driver's customersCarried (add customer ID immediately)
            const driverRef = doc(db, 'users', driverId);
            const driverDoc = await getDoc(driverRef);
            const currentCustomers = driverDoc.data()?.customersCarried || [];
            
            if (!currentCustomers.includes(currentUser.uid)) {
            await updateDoc(driverRef, {
                customersCarried: [...currentCustomers, currentUser.uid]
            });
            }

            // Set active trip locally
            setActiveTrip({
                ...tripData,
                id: tripDoc.id
            } as Trip);

            // Update the selected driver in local state
            setSelectedDriver(prev => prev ? {
            ...prev,
            customersCarried: [...(prev.customersCarried || []), currentUser.uid]
            } : null);

            // Refresh drivers list to hide the unavailable vehicle
            fetchDriversAndVehicles();

            // Show success message
            alert(`Trip started successfully! Estimated fare: ₦${estimatedFare.toLocaleString()}`);
            
            // Update trip info state
            setTripInfo({
            pickupLocation,
            destination,
            fare: estimatedFare,
            status: 'active',
            startTime: Timestamp.now(),
            endTime: null
            });

            return tripDoc.id;

        } catch (error) {
            console.error('Error starting trip:', error);
            alert('Failed to start trip. Please try again.');
            return null;
        }
    };

    // Complete or cancel trip
    const updateTripStatus = async (tripId: string, status: 'completed' | 'cancelled') => {
        if (!tripId || !currentUser) return;

        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripDoc = await getDoc(tripRef);
            
            if (!tripDoc.exists()) {
            alert('Trip not found');
            return;
            }

            const tripData = tripDoc.data() as Trip;
            
            // Check if user is authorized to update this trip
            if (tripData.customerId !== currentUser.uid && tripData.driverId !== currentUser.uid) {
            alert('You are not authorized to update this trip');
            return;
            }

            const updates: { 
            status: 'completed' | 'cancelled', 
            updatedAt: Timestamp,
            endTime?: Timestamp 
            } = {
            status,
            updatedAt: Timestamp.now()
            };

            if (status === 'completed') {
                updates.endTime = Timestamp.now();
                
                // Update vehicle status back to available
                const vehicleRef = doc(db, 'vehicleLog', tripData.vehicleId);
                await updateDoc(vehicleRef, {
                    status: 'available',
                    currentTripId: null
                });
                
                // Refresh drivers list to show the vehicle again
                fetchDriversAndVehicles();
                
                // Refresh trip history
                if (currentUser) {
                    loadUserHistory(currentUser.uid);
                }
            }

            if (status === 'cancelled') {
            // Update vehicle status back to available
            const vehicleRef = doc(db, 'vehicleLog', tripData.vehicleId);
            await updateDoc(vehicleRef, {
                status: 'available',
                currentTripId: null
            });
            
            // Refresh drivers list
            fetchDriversAndVehicles();
            }

            await updateDoc(tripRef, updates);
            
            // Clear active trip if completed or cancelled
            if (status === 'completed' || status === 'cancelled') {
            setActiveTrip(null);
            setTripInfo({
                pickupLocation: '',
                destination: '',
                fare: 0,
                status: 'pending',
                startTime: null,
                endTime: null
            });
            }

            alert(`Trip ${status} successfully!`);
            
        } catch (error) {
            console.error('Error updating trip:', error);
            alert('Failed to update trip status');
        }
    };

    // Check for active trips on component mount
    useEffect(() => {
        const checkActiveTrips = async () => {
            if (!currentUser) return;

            try {
            const tripsRef = collection(db, 'trips');
            const q = query(
                tripsRef,
                where('customerId', '==', currentUser.uid),
                where('status', '==', 'active')
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const tripDoc = snapshot.docs[0];
                const tripData = tripDoc.data() as Trip;
                
                setActiveTrip({
                ...tripData,
                id: tripDoc.id
                });
                
                // Set trip info from active trip
                setTripInfo({
                pickupLocation: tripData.pickupLocation || '',
                destination: tripData.destination || '',
                fare: tripData.fare || 0,
                status: 'active',
                startTime: tripData.startTime,
                endTime: tripData.endTime || null
                });
            }
            } catch (error) {
            console.error('Error checking active trips:', error);
            }
        };

        if (currentUser) {
            checkActiveTrips();
        }
    }, [currentUser]);


    // Handle regular call
    const handlePhoneCall = (phoneNumber: string) => {
        window.location.href = `tel:${phoneNumber}`
    }

    if (loading) {
        return (
            <div className="p-5 bg-[#F9FAF9] min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading available cars...</p>
                </div>
            </div>
        )
    }

    // MAIN RETURN PAGE
    return (
        <div className="p-2 px-1 md:p-5 md:pt-0 relative bg-[#F9FAF9]">
            {/* Select Car Page */}
            <div className="p-2 md:p-8 mx-auto max-w-6xl bg-white rounded-lg shadow-md">
                {/* Book Page Header section */}
                <div className="pt-4 left-0 top-0 text-center w-full">
                    <h1 className="mb-2 text-2xl md:text-3xl text-gray-600 font-extrabold">Book a Car</h1>
                    <div className="m-2 p-2 sm:p-2 rounded bg-gray-200 font-semibold text-red-800">
                        <small><span className="font-black">Important Notice:</span> Please make sure you contact drivers, book appointments properly, negotiate on or before services.</small>
                    </div>

                    <div className="py-8 px-2 relative">
                        <button
                            onClick={() => setShowLocationPanel(!showLocationPanel)}
                            className="w-full md:w-50 md:left-2 left-0 top-0 absolute mt-6 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            {showLocationPanel ? 'Hide Location Settings' : 'Show Location Settings'}
                        </button>

                        {showLocationPanel && (
                            <div>
                                {currentUser && (
                                    <div className="my-8">
                                        <CustomerLocationToggle 
                                            userId={currentUser.uid}
                                            tripId={activeTrip?.id}
                                        />
                                    </div>
                                )}

                                {/* Active Trip Banner with Tracker */}
                                {activeTrip && (
                                    <div className="m-2 mb-4 rounded-xl overflow-hidden shadow-xl border border-blue-200">
                                        {/* Banner Header with Gradient */}
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-white/20 p-2 rounded-full">
                                                        <FaCar className="text-white text-lg" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">🚗 Active Trip</h3>
                                                        <p className="text-blue-100 text-sm">Real-time tracking enabled</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                                                    🟢 LIVE
                                                </span>
                                            </div>
                                            
                                            {/* Route Info */}
                                            <div className="flex justify-center md:justify-start items-center gap-4 space-y-1 text-white">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                                    <span className="truncate">{activeTrip.pickupLocation}</span>
                                                </div>
                                                <div><p className="font-bold">to</p></div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                    <span className="truncate">{activeTrip.destination}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* LIVE TRIP TRACKER WIDGET - ADD THIS */}
                                        <div className="p-3 bg-white">
                                            <TripTracker 
                                                tripId={activeTrip.id}
                                                driverId={selectedDriver?.id || activeTrip.driverId}
                                                customerId={currentUser?.uid}
                                            />
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="p-3 bg-white border-t border-gray-100">
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => updateTripStatus(activeTrip.id, 'completed')}
                                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <FaCheckCircle />
                                                    Mark Completed
                                                </button>
                                                <button
                                                    onClick={() => updateTripStatus(activeTrip.id, 'cancelled')}
                                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <FaTimesCircle />
                                                    Cancel Trip
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Safety Section */}
                                        <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200">
                                            <div className="flex flex-col md:flex-row items-center justify-between mb-2">
                                                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                                                    <FaShieldAlt className="text-blue-600" />
                                                    Safety Features
                                                </h4>
                                                <ShareLocation
                                                    tripId={activeTrip.id}
                                                    driverId={selectedDriver?.id || activeTrip.driverId}
                                                    driverName={selectedDriver?.fullName || 'Driver'}
                                                    vehicleDetails={`${selectedVehicle?.carName} ${selectedVehicle?.carModel}`}
                                                    pickup={activeTrip.pickupLocation}
                                                    destination={activeTrip.destination}
                                                    currentUserId={currentUser?.uid}
                                                />
                                            </div>
                                            
                                            <p className="text-blue-700 text-xs">
                                                ✅ Your trip is being tracked for safety. Share location with loved ones.
                                            </p>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-red-700 text-center">{error}</p>
                    </div>
                )}

                {/* Save Message on Main Page (only show when modal is closed) */}
                {saveMessage.text && !driverInfo && (
                    <div className={`mt-4 p-3 rounded-lg ${
                        saveMessage.type === "success" ? "bg-green-100 border border-green-300 text-green-700" :
                        saveMessage.type === "error" ? "bg-red-100 border border-red-300 text-red-700" :
                        "bg-blue-100 border border-blue-300 text-blue-700"
                    }`}>
                        <div className="flex items-center">
                            {saveMessage.type === "success" && <FaCheckCircle className="mr-2" />}
                            {saveMessage.type === "error" && <FaTimesCircle className="mr-2" />}
                            {saveMessage.type === "info" && <FaClock className="mr-2" />}
                            <p className="text-center flex-1">{saveMessage.text}</p>
                        </div>
                    </div>
                )}

                {/* Quick View History (Persistent) - Show only if there's history AND we're not viewing a driver */}
                {quickViewHistory && !driverInfo && (
                    <div className="mt-6 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start sm:items-center">
                            <div 
                                onClick={handleQuickViewClick}
                                className="cursor-pointer hover:bg-blue-100 p-2 rounded-lg flex-1"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-blue-800 text-lg">Recent Driver</h3>
                                    <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                                        Click to view details
                                    </span>
                                </div>
                                <p className="text-gray-700">{quickViewHistory.driverName} - {quickViewHistory.vehicleName} {quickViewHistory.vehicleModel}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <small className="text-blue-600">Contact: {quickViewHistory.phoneNumber}</small>
                                </div>
                                <small className="text-gray-500 text-sm">
                                    Last contacted: {formatDate(quickViewHistory.lastContacted)}
                                </small>
                            </div>
                            <button
                                onClick={handleClearQuickView}
                                className="text-red-500 hover:text-red-700 ml-2"
                                title="Remove from history"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                )}

                {/* ✅ NEW: Booking Request Section */}
                <section id="book-now" className="mt-8 mb-8">
                    {/* The Top Box */}
                    <div className="max-h-[300rem] overflow-y-auto bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 px-1 md:p-4 border border-blue-200 mb-6">
                        <div className="px-2 flex flex-col md:flex-row items-center justify-between">
                        
                            {/* Left */}
                            <div className="text-center md:text-left">
                                <h2 className="flex justify-center md:justify-start text-center text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FaCalendarAlt className="text-blue-600" />
                                Don't See What You Need?
                                </h2>

                                <p className="text-gray-600 mt-1">
                                Post your specific car requirements. Drivers will contact you directly!
                                </p>
                            </div>

                            {/* Right */}
                            <div className="text-center md:text-left mt-4 md:mt-0 flex md:items-center gap-2 text-sm text-blue-700">
                                <FaCheckCircle className="text-green-600" />
                                <span>100% Free • Get Multiple Offers • Negotiate Best Price</span>
                            </div>

                        </div>

                        {/* Toggle Button */}
                        <div className="relative w-full mt-5 px-2">
                            <button
                                onClick={() => setShowRequestBox(!showRequestBox)}
                                className="w-full p-3 rounded-lg bg-gray-800 text-white text-sm 
                                        hover:bg-gray-700 transition flex items-center gap-2 justify-center relative"
                            >
                                {showRequestBox ? "🙈 Hide Request Box" : "👀 Show Request Box"}
                                
                                {/* Notification Badge - Shows for both drivers and customers */}
                                {notificationCount > 0 && (
                                <div className="absolute top-4 right-6">
                                    {/* You'll need to import NotificationBadge component */}
                                    <NotificationBadge
                                        count={notificationCount}
                                        type={notificationType}
                                        position="top-right"
                                        size="md"
                                    />
                                </div>
                                )}
                            </button>
                        </div>


                        {/* SHOW BOOKING REQUEST (WITH ANIMATION) */}
                        {showRequestBox && (
                            <div className="mt-4 animate-fadeSlide">
                            <BookingRequest
                                userId={currentUser?.uid}
                                userCity={currentUser?.city || ""}
                            />
                            </div>
                        )}
                    </div>  
                </section>

                {/* Search and Filter Section - Now with AC and Verified filters */}
                <div className="mt-8 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 lg:grid-cols-4 md:items-center gap-4">
                        {/* Search Location */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by city, state, or location..."
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder:text-gray-400 placeholder:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                            <FaSearch className="absolute top-5 left-3 text-gray-400" />
                        </div>

                        {/* Select Car category */}
                        <div>
                            <select  
                                className="text-gray-700 outline-blue-600 w-full p-3 border-2 border-gray-300 rounded-lg"
                                name="category" 
                                id="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                <option value="sedan">Sedan</option>
                                <option value="bus">Bus</option>
                                <option value="suv">SUV</option>
                                <option value="truck">Truck</option>
                                <option value="van">Van</option>
                                <option value="keke">Keke</option>
                                <option value="luxury">Luxury</option>
                            </select>
                        </div>

                        {/* Filter Checkboxes */}
                        <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showACOnly}
                                    onChange={(e) => setShowACOnly(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-700 font-medium flex items-center">
                                    <FaSnowflake className="mr-2 text-blue-500" />
                                    AC Cars Only
                                </span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showVerifiedOnly}
                                    onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <span className="text-gray-700 font-medium flex items-center">
                                    <FaCheckCircle className="mr-2 text-green-500" />
                                    Verified Drivers Only
                                </span>
                            </label>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-center justify-end">
                            <span className="text-gray-600 font-semibold">
                                {filteredDrivers.length} {filteredDrivers.length === 1 ? 'car' : 'cars'} available
                            </span>
                        </div>
                    </div>
                </div>

                {/* Cars Grid - Display all cars directly */}
                <h1 className="border-b border-gray-300 px-4 py-2 mb-0 mt-8 md:mt-12 text-xl font-bold ">Available Cars</h1>
                <div id="search-results" className="p-3 px-1 pt-0 max-h-[65rem] overflow-y-auto">
                    {filteredDrivers.length === 0 ? (
                        <div className="text-center py-12">
                            <FaCar className="text-5xl text-gray-300 mb-4 mx-auto" />
                            <h3 className="text-xl text-gray-600 mb-2">No Cars Found</h3>
                            <p className="text-gray-500">Try adjusting your search filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {filteredDrivers.map(({ driver, vehicle }, index) => {
                                const vehicleImages = getVehicleImages(vehicle)
                                return (
                                    <div
                                        key={`${driver.id}-${vehicle.id}-${index}`}
                                        className="bg-gray-50 rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300"
                                    >
                                        {/* Car Image */}
                                        <div className="relative h-48 w-full">
                                            <Image
                                                src={vehicleImages[0]}
                                                alt={`${vehicle.carName} ${vehicle.carModel}`}
                                                fill
                                                className="object-cover"
                                            />
                                            {/* VIP and Verified Badges */}
                                            <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                                                {driver.verified && (
                                                    <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                                        <FaCheckCircle className="mr-1" /> Verified
                                                    </div>
                                                )}
                                               {driver.vipLevel && driver.vipLevel > 0 ? (
                                                    <div className="mt-1">
                                                        <VIPStar
                                                        vipLevel={driver.vipLevel}
                                                        prestigeLevel={driver.prestigeLevel}
                                                        size="sm"
                                                        />
                                                    </div>
                                                    ) : null
                                                }
                                            </div>
                                        </div>

                                        {/* Car Info */}
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {vehicle.carName} {vehicle.carModel}
                                                    </h3>
                                                    <p className="text-gray-600 text-sm capitalize">{vehicle.carType}</p>
                                                </div>
                                                {/* Only show rating if it exists and is greater than 0 */}
                                                {driver.averageRating !== undefined && driver.averageRating !== null && driver.averageRating > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <FaStar className="text-yellow-500" />
                                                        <span className="font-bold">
                                                            {driver.averageRating.toFixed(1)}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <hr className="text-gray-400 mb-1"/>

                                            <div className="bg-white p-2 rounded-lg space-y-2 mb-4 text-xs sm:text-sm">
                                                <div className="flex items-center text-gray-700">
                                                    <FaMapMarkerAlt className="mr-2 text-gray-400" />
                                                    <span>{getDriverLocation(driver)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center text-gray-700">
                                                        <FaUsers className="mr-2 text-gray-400" />
                                                        <span>{vehicle.passengers} seats</span>
                                                    </div>
                                                    <div className="flex items-center text-gray-700">
                                                        <FaPalette className="mr-2 text-gray-400" />
                                                        <span>{vehicle.exteriorColor}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center text-gray-700">
                                                        <FaSnowflake className="mr-2 text-gray-400" />
                                                        <span className={vehicle.ac ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                                                            {vehicle.ac ? "AC Available" : "No AC"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-gray-700">
                                                        <FaPhone className="mr-2 text-gray-400" />
                                                        <span className="font-medium">{driver.phoneNumber}</span>
                                                        {driver.whatsappPreferred && (
                                                            <span className="ml-2 text-green-500">
                                                                <FaWhatsapp />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons with Pre-Chat */}
                                            <div className="flex flex-col gap-2 mt-4">
                                                {/* View Details Button */}
                                                <button
                                                    onClick={() => handleDriverSelect(driver, vehicle)}
                                                    className="w-full text-center text-white rounded-lg font-semibold py-3 bg-blue-600 hover:bg-blue-700 transition-all duration-300"
                                                >
                                                    View Details
                                                </button>
                                                
                                                {/* Contact Options Row */}
                                                <div className="grid grid-cols-3 gap-2">                                    
                                                    
                                                    {/* Enhanced WhatsApp */}
                                                    {driver.whatsappPreferred ? (
                                                        <button
                                                            onClick={() => handleEnhancedWhatsAppClick(driver, vehicle)}
                                                            className="flex items-center justify-center gap-1 bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                                        >
                                                            <FaWhatsapp className="text-sm" />
                                                            <span>WhatsApp</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePhoneCall(driver.phoneNumber)}
                                                            className="flex items-center justify-center gap-1 bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                                                        >
                                                            <FaPhone className="text-sm" />
                                                            <span>Call</span>
                                                        </button>
                                                    )}

                                                    {/* Pre-Chat Button */}
                                                    <button
                                                        onClick={() => handlePreChatClick(driver, vehicle)}
                                                        className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                                    >
                                                        <FaComment className="text-sm" />
                                                        <span>Chat</span>
                                                    </button>
                                                    
                                                    {/* Complain Button */}
                                                    <button
                                                        onClick={() => handleComplain(driver.fullName, vehicle)}
                                                        className="flex items-center justify-center gap-1 bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                                                        title="Complain about driver"
                                                    >
                                                        <FaFlag className="text-sm" />
                                                        <span>Flag</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Complain about selected driver */}
                <div id="complain" className="mt-8 mb-6 w-full">
                    {selectDriver && (
                        <div className="relative flex flex-col mb-3 w-full rounded-lg py-3 px-4 bg-red-100 border border-red-200">
                            <button 
                                onClick={() => setSelectDriver("")} 
                                className="absolute top-3 right-3 text-red-900 text-lg cursor-pointer hover:text-red-700"
                            >
                                ✖️
                            </button>
                            <p className="font-bold text-red-800 text-lg mb-2">Complain about this driver:</p>
                            <small className="text-red-700 font-semibold">
                                Driver & Vehicle: <span className="text-gray-800 font-black">{selectDriver}</span>
                            </small>
                            {selectedDriver && (
                                <small className="text-red-700 font-semibold">
                                    Contact: <span className="text-gray-800 font-black">{selectedDriver.phoneNumber}</span>
                                </small>
                            )}
                        </div>
                    )}
                    {selectDriver && (
                        <a 
                            href="mailto:nomopoventures@yahoo.com" 
                            className="text-center block w-full rounded-lg py-3 bg-[#3688EE] hover:bg-blue-700 transition-all duration-300 text-white font-semibold"
                        >
                            Lodge Complain!
                        </a>
                    )}
                </div>
            </div>

            {/* Driver's Information Display - Modal */}
            {driverInfo && selectedDriver && selectedVehicle && (
                <div id="contact-driver" className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-8 z-50 overflow-y-auto">
                    <div className="bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        
                        {/* Header */}
                        <div className="sticky top-0 bg-gray-900 z-10 p-4 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Driver & Vehicle Details</h2>
                            <button
                                onClick={handleCloseDriverInfo}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ✖
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-6">
                            {/* Save Message Inside Modal - This will be visible when user clicks save */}
                            {saveMessage.text && (
                                <div className={`mb-4 p-3 rounded-lg ${
                                    saveMessage.type === "success" ? "bg-green-900 border border-green-700 text-green-300" :
                                    saveMessage.type === "error" ? "bg-red-900 border border-red-700 text-red-300" :
                                    "bg-blue-900 border border-blue-700 text-blue-300"
                                }`}>
                                    <div className="flex items-center">
                                        {saveMessage.type === "success" && <FaCheckCircle className="mr-2" />}
                                        {saveMessage.type === "error" && <FaExclamationTriangle className="mr-2" />}
                                        {saveMessage.type === "info" && <FaClock className="mr-2" />}
                                        <p className="flex-1">{saveMessage.text}</p>
                                    </div>
                                </div>
                            )}

                            {/* Delete Confirmation Modal for reviews */}
                            {showDeleteConfirm.show && (
                                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                                        <h3 className="text-xl font-bold text-white mb-4">Delete Review</h3>
                                        <p className="text-gray-300 mb-6">Are you sure you want to delete your review? This action cannot be undone.</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={cancelDeleteComment}
                                                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDeleteComment}
                                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-300"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Driver Profile */}
                            <div className="flex flex-col md:flex-row gap-6 mb-8">
                                {/* Driver Image */}
                                <div className="flex-shrink-0">
                                    <Image 
                                        src={selectedDriver.profileImage || "/per.png"} 
                                        alt="Driver's profile picture"
                                        width={150}
                                        height={150}
                                        className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-700"
                                    />
                                </div>

                                {/* Driver Info */}
                                <div className="relative flex-1">
                                    <h1 className="text-2xl font-bold text-white mb-2">{selectedDriver.firstName} {selectedDriver.lastName}</h1>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center text-gray-300">
                                            <FaMapMarkerAlt className="mr-3 text-gray-400" />
                                            <span>{getDriverLocation(selectedDriver)}</span>
                                        </div>
                                        <div className="flex items-center text-gray-300">
                                            <FaPhone className="mr-3 text-gray-400" />
                                            <span className="font-medium">{selectedDriver.phoneNumber}</span>
                                            {selectedDriver.whatsappPreferred && (
                                                <span className="ml-2 text-xs text-green-400 flex items-center">
                                                    <FaWhatsapp className="mr-1" /> WhatsApp Available
                                                </span>
                                            )}
                                        </div>
                                        {selectedDriver.email && (
                                            <div className="flex items-center text-gray-300">
                                                <FaEnvelope className="mr-3 text-gray-400" />
                                                <span>{selectedDriver.email}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedDriver.verified ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                                                {selectedDriver.verified ? (
                                                    <>
                                                        <FaCheckCircle className="mr-2 inline" />
                                                        Verified Driver
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaTimesCircle className="mr-2 inline" />
                                                        Not Verified
                                                    </>
                                                )}
                                            </span>
                                            
                                            {selectedDriver.vipLevel && selectedDriver.vipLevel > 0 && (
                                                <VIPStar 
                                                    vipLevel={selectedDriver.vipLevel} 
                                                    prestigeLevel={selectedDriver.prestigeLevel || 0} 
                                                    size="md" 
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Enhanced Contact Buttons */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                        {/* Pre-Chat Button */}
                                        <button
                                            onClick={() => {
                                                setDriverInfo(false)
                                                setTimeout(() => setShowPreChat(true), 300)
                                            }}
                                            className="py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                        >
                                            <FaComment className="mr-2" />
                                            Chat with Driver
                                        </button>

                                        {/* Enhanced WhatsApp Button (only if whatsappPreferred is true) */}
                                        {selectedDriver.whatsappPreferred ? (
                                            <button
                                                onClick={() => {
                                                    setDriverInfo(false)
                                                    setTimeout(() => setShowEnhancedWhatsApp(true), 300)
                                                }}
                                                className="py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                            >
                                                <FaWhatsapp className="mr-2" />
                                                Enhanced WhatsApp
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handlePhoneCall(selectedDriver.phoneNumber)}
                                                className="py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                                            >
                                                <FaPhone className="mr-2" />
                                                Call Driver
                                            </button>
                                        )}

                                        {/* Direct WhatsApp */}
                                        {selectedDriver.whatsappPreferred && (
                                            <div className="absolute top-0 right-1 md:static">
                                                <button
                                                    onClick={() => handleWhatsAppMessage(selectedDriver, selectedVehicle)}
                                                    className="w-12 h-12 md:w-full  text-white font-semibold rounded-full md:rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
                                                >
                                                    <FaWhatsapp className="text-4xl md:text-sm md:mr-2" /> <span className="hidden md:block">WhatsApp</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Save to History Button with Cooldown Check */}
                                    <div className="mb-4">
                                        {activeTrip && activeTrip.driverId === selectedDriver.uid && activeTrip.vehicleId === selectedVehicle.id ? (
                                            <div className="space-y-3">
                                            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                                                <h4 className="font-bold text-white mb-2">🚗 Active Trip</h4>
                                                <div className="space-y-1">
                                                <p className="text-gray-300 text-sm">
                                                    <span className="font-medium">Pickup:</span> {activeTrip.pickupLocation}
                                                </p>
                                                <p className="text-gray-300 text-sm">
                                                    <span className="font-medium">Destination:</span> {activeTrip.destination}
                                                </p>
                                                <p className="text-gray-300 text-sm">
                                                    <span className="font-medium">Fare:</span> <span className="text-yellow-300">₦{activeTrip.fare?.toLocaleString()}</span>
                                                </p>
                                                <p className="text-gray-300 text-xs mt-2">
                                                    Trip started: {activeTrip.startTime?.toDate?.()?.toLocaleString() || 'Recently'}
                                                </p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                onClick={() => updateTripStatus(activeTrip.id, 'completed')}
                                                className="py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300"
                                                >
                                                ✅ Complete Trip
                                                </button>
                                                <button
                                                onClick={() => updateTripStatus(activeTrip.id, 'cancelled')}
                                                className="py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-300"
                                                >
                                                ❌ Cancel Trip
                                                </button>
                                            </div>
                                            <p className="text-gray-400 text-xs text-center">
                                                Complete trip when you reach your destination. Cancel if plans change.
                                            </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Trip Safety Info Section */}
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-bold text-white mb-3 flex justify-center md:justify-start items-center gap-2">
                                                        <span className="text-blue-400">🛡️</span> Trip Safety Information
                                                    </h3>
                                                    
                                                    {/* Fill Info Link - Only shown when location/destination not set */}
                                                    {(!tripInfo.pickupLocation || !tripInfo.destination) && (
                                                        <div className="text-center md:text-left mb-4">
                                                            <p className="text-gray-400 text-sm mb-2">
                                                                For your safety and trip tracking, please provide:
                                                            </p>
                                                            <button
                                                                onClick={() => {
                                                                    // Toggle the form visibility
                                                                    setTripInfo(prev => ({ 
                                                                        ...prev, 
                                                                        showForm: !prev.showForm 
                                                                    }));
                                                                }}
                                                                className="text-blue-400 hover:text-blue-300 underline decoration-2 underline-offset-2 text-sm font-medium transition-colors duration-200"
                                                            >
                                                                📝 Fill Info for Safety Travel
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Simple map for trip planning - Only shown when form is active */}
                                                    {(tripInfo.showForm || (tripInfo.pickupLocation && tripInfo.destination)) && (
                                                        <SimpleBookingMap
                                                            pickupLocation={tripInfo.pickupLocation}
                                                            destination={tripInfo.destination}
                                                            driverLocation={getDriverLocation(selectedDriver)}
                                                            onLocationSelect={(type: 'pickup' | 'destination', value: string) => {
                                                                setTripInfo(prev => ({ 
                                                                    ...prev, 
                                                                    [type === 'pickup' ? 'pickupLocation' : 'destination']: value 
                                                                }));
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                
                                                {/* Start Trip Button - Only enabled when both locations are set */}
                                                {(tripInfo.pickupLocation && tripInfo.destination) && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                if (!tripInfo.pickupLocation || !tripInfo.destination) {
                                                                    alert('Please enter both pickup location and destination');
                                                                    return;
                                                                }
                                                                
                                                                const tripId = await startTrip(
                                                                    selectedDriver.uid,
                                                                    selectedVehicle.id,
                                                                    tripInfo.pickupLocation,
                                                                    tripInfo.destination
                                                                );
                                                                
                                                                if (tripId) {
                                                                    // Close the modal after starting trip
                                                                    setTimeout(() => {
                                                                        setDriverInfo(false);
                                                                    }, 1500);
                                                                }
                                                            }}
                                                            className={`w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 mb-2 ${
                                                                tripInfo.pickupLocation && tripInfo.destination
                                                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                                                                    : 'bg-gray-700 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            🚀 Start Trip for Safety Tracking
                                                        </button>
                                                        
                                                        <p className="text-gray-400 text-xs text-center mb-3">
                                                            Click "Start Trip" to enable real-time tracking for your safety
                                                        </p>
                                                    </>
                                                )}

                                                {/* Original Save Button (optional - keep if you still want it) */}
                                                {currentUser && (
                                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                                    <button
                                                        onClick={handleSaveDriver}
                                                        disabled={!canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave}
                                                        className={`w-full py-2 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center ${
                                                        canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave
                                                        ? "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                                                        : "bg-gray-800 cursor-not-allowed"
                                                        }`}
                                                    >
                                                        <FaEye className="mr-2" />
                                                        {canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave
                                                        ? "Mark as Contacted"
                                                        : "Save (Cooldown)"}
                                                    </button>
                                                    <p className="text-gray-400 text-xs mt-1 text-center">
                                                        Save driver to your history for future reference
                                                    </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Real-time Trip Tracker - Only show if this is the active trip */}
                                    {activeTrip && activeTrip.driverId === selectedDriver.uid && activeTrip.vehicleId === selectedVehicle.id && (
                                        <div className="mt-6">
                                            <TripTracker 
                                                tripId={activeTrip.id}
                                                driverId={selectedDriver.uid}
                                                customerId={currentUser?.uid}
                                            />
                                        </div>
                                    )}

                                    {/* Rating Summary - Only show if driver has ratings */}
                                    {selectedDriver.averageRating !== undefined && selectedDriver.averageRating !== null && selectedDriver.averageRating > 0 ? (
                                        <div className="bg-gray-800 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-3xl font-bold text-white">
                                                        {selectedDriver.averageRating.toFixed(1)}
                                                    </div>
                                                    <div>
                                                        {renderStars(selectedDriver.averageRating, "lg", false)}
                                                        <div className="text-gray-400 text-sm mt-1">
                                                            {selectedDriver.totalRatings || 0} {selectedDriver.totalRatings === 1 ? 'review' : 'reviews'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedDriver.customersCarried && selectedDriver.customersCarried.length > 0 && (
                                                    <div className="text-sm text-gray-300">
                                                        <FaUserCheck className="inline mr-1" />
                                                        {selectedDriver.customersCarried.length} customer{selectedDriver.customersCarried.length === 1 ? '' : 's'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Vehicle Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Vehicle Images */}
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-white mb-3">Vehicle Gallery</h3>
                                        <div className="relative h-76 bg-gray-800 rounded-lg overflow-hidden mb-4">
                                            <Image
                                                src={mainImage}
                                                alt="Car Image"
                                                fill
                                                className="object-contain w-full h-full"
                                            />
                                        </div>
                                        <div className="flex justify-center items-center gap-2 overflow-x-auto pb-2">
                                            {getVehicleImages(selectedVehicle).map((img, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setMainImage(img)} 
                                                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                                                        mainImage === img ? "border-blue-500" : "border-gray-700"
                                                    }`}
                                                >
                                                    <Image 
                                                        src={img}
                                                        alt="car thumbnail"
                                                        width={80}
                                                        height={80}
                                                        className="object-cover w-full h-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Info */}
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4">Vehicle Information</h3>
                                    <div className="bg-gray-800 rounded-lg p-5">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-gray-400 text-sm">Car Name</p>
                                                <p className="font-bold text-white">{selectedVehicle.carName}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Model</p>
                                                <p className="font-bold text-white">{selectedVehicle.carModel}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Type</p>
                                                <p className="font-bold text-white capitalize">{selectedVehicle.carType}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Seats</p>
                                                <p className="font-bold text-white">{selectedVehicle.passengers}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">Color</p>
                                                <p className="font-bold text-white">{selectedVehicle.exteriorColor}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm">AC</p>
                                                <p className={`font-bold ${selectedVehicle.ac ? "text-green-400" : "text-red-400"}`}>
                                                    {selectedVehicle.ac ? "Available" : "Not Available"}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Description */}
                                        <div className="mt-4">
                                            <p className="text-gray-400 text-sm mb-2">Description</p>
                                            <p className="text-gray-300">{selectedVehicle.description}</p>
                                        </div>

                                        {/* Other Vehicles from this driver */}
                                        {selectedDriver.vehicles.length > 1 && (
                                            <div className="mt-6 pt-4 border-t border-gray-700">
                                                <p className="text-gray-400 text-sm mb-2">Other vehicles from this driver:</p>
                                                <div className="flex gap-2 overflow-x-auto">
                                                    {selectedDriver.vehicles
                                                        .filter(v => v.id !== selectedVehicle.id)
                                                        .map((vehicle, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                setSelectedVehicle(vehicle)
                                                                const vehicleImages = getVehicleImages(vehicle)
                                                                setMainImage(vehicleImages[0])
                                                            }}
                                                            className="flex-shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                                                        >
                                                            {vehicle.carName} ({vehicle.carType})
                                                        </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Reviews Section */}
                            <div id="reviews-section" className="bg-gray-800 rounded-lg md:px-26 p-2 sm:p-4">
                                <h3 className="text-lg font-bold text-white mb-4">Reviews & Ratings</h3>
                                
                                {/* Review Form */}
                                {currentUser && (
                                    <div className="mb-6 sm:p-4 p-2 bg-gray-900 rounded-lg">
                                        {hasUserReviewed ? (
                                            <div className="text-center p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                                                <FaUser className="mx-auto text-3xl text-blue-400 mb-2" />
                                                <p className="text-white font-medium">You have already reviewed this driver</p>
                                                <p className="text-gray-300 text-sm mt-1">You can delete your existing review to submit a new one</p>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleReviewSubmit}>
                                                {/* Rating Stars */}
                                                <div className="mb-4">
                                                    <p className="text-white mb-2">Rate this driver:</p>
                                                    <div className="flex items-center gap-1 mb-4">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                type="button"
                                                                onClick={() => handleRatingClick(star)}
                                                                onMouseEnter={() => setHoverRating(star)}
                                                                onMouseLeave={() => setHoverRating(0)}
                                                                className="text-2xl focus:outline-none"
                                                            >
                                                                <FaStar className={`${star <= (hoverRating || reviewForm.rating) ? "text-yellow-400" : "text-gray-400"}`} />
                                                            </button>
                                                        ))}
                                                        <span className="ml-3 text-white">
                                                            {reviewForm.rating > 0 ? `${reviewForm.rating} star${reviewForm.rating === 1 ? '' : 's'}` : "Click to rate"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <textarea 
                                                    className="w-full outline-none rounded bg-gray-700 text-white p-3 sm:mb-3" 
                                                    name="comment" 
                                                    rows={3} 
                                                    maxLength={500} 
                                                    placeholder="Write your review here..." 
                                                    value={reviewForm.comment}
                                                    onChange={handleReviewChange}
                                                    required
                                                    disabled={hasUserReviewed}
                                                ></textarea>
                                                
                                                <div className="flex flex-col sm:flex-row justify-between items-center">
                                                    <span className="my-1 text-sm text-gray-400">
                                                        {reviewForm.comment.length}/500 characters
                                                    </span>
                                                    <button 
                                                        type="submit" 
                                                        className={`w-full sm:w-50 px-6 py-2 text-white font-semibold rounded ${hasUserReviewed ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                        disabled={hasUserReviewed}
                                                    >
                                                        {hasUserReviewed ? 'Already Reviewed' : 'Submit Review'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                        
                                        {/* Review Message */}
                                        {reviewMessage.text && (
                                            <div className={`mt-3 p-2 text-center rounded ${
                                                reviewMessage.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                                            }`}>
                                                {reviewMessage.text}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reviews List */}
                                <div className="mt-6 sm:mt-12 max-h-96 overflow-y-auto pr-2">
                                    {selectedDriver.comments && selectedDriver.comments.length > 0 ? (
                                        [...selectedDriver.comments]
                                        .sort((a, b) => {
                                            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
                                            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
                                            return dateB.getTime() - dateA.getTime()
                                        })
                                        .map((comment, idx) => {
                                            const isCurrentUserComment = comment.userId === currentUserId
                                            const userInitial = comment.firstName ? comment.firstName.charAt(0).toUpperCase() : 
                                                            comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'
                                            
                                            return (
                                                <div key={idx} className="mb-4 p-3 sm:p-4 bg-gray-900 rounded-lg border border-gray-700">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-white font-bold text-sm sm:text-base">{userInitial}</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-white text-sm sm:text-base truncate">
                                                                    {comment.firstName || comment.userName.split(' ')[0] || 'User'} 
                                                                    {comment.lastName ? ` ${comment.lastName}` : ''}
                                                                    {isCurrentUserComment && (
                                                                        <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">You</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-gray-400 text-xs sm:text-sm truncate">{comment.userEmail}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-start sm:items-end gap-2">
                                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                <div className="flex text-yellow-400 text-xs sm:text-sm">
                                                                    {comment.rating && renderStars(comment.rating, "sm", false)}
                                                                </div>
                                                                <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                                                                    {formatDate(comment.createdAt)}
                                                                </span>
                                                            </div>
                                                            {isCurrentUserComment && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment)}
                                                                    className="text-red-400 hover:text-red-300 text-xs sm:text-sm flex items-center gap-1 mt-1"
                                                                    title="Delete your review"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                    <span>Delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="p-2 sm:p-3 rounded-lg bg-gray-800/50 text-gray-300 text-sm sm:text-base border-l-2 sm:border-l-4 border-blue-600">
                                                        {comment.comment}
                                                    </p>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <div className="text-3xl mb-3">💬</div>
                                            <p>No reviews yet. Be the first to review this driver!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ NEW: Pre-Chat Modal */}
            {showPreChat && selectedDriver && selectedVehicle && (
                <div className="fixed inset-0 bg-[rgba(0,0,0,0.8)] bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <PreChat 
                            car={{
                                id: selectedVehicle.id,
                                title: `${selectedVehicle.carName} ${selectedVehicle.carModel}`,
                                price: 0,
                                description: selectedVehicle.description,
                            }}
                            driver={{
                                id: selectedDriver.id,
                                name: selectedDriver.firstName,
                                phone: selectedDriver.phoneNumber,
                            }}
                            onClose={() => setShowPreChat(false)}
                        />
                    </div>
                </div>
            )}

            {/* ✅ NEW: Enhanced WhatsApp Modal */}
            {showEnhancedWhatsApp && selectedDriver && selectedVehicle && (
                <div className="fixed inset-0 bg-[rgba(0,0,0,0.75)] bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-[50rem] w-full max-h-[90vh] overflow-y-auto">
                        <EnhancedWhatsApp
                            car={{
                                id: selectedVehicle.id,
                                title: `${selectedVehicle.carName} ${selectedVehicle.carModel}`,
                                price: 0, // You can add price field if available
                                model: selectedVehicle.carModel,
                                year: "", // Add year if available
                            }}
                            driver={{
                                id: selectedDriver.id,
                                name: selectedDriver.firstName,
                                phone: selectedDriver.phoneNumber,
                                rating: selectedDriver.averageRating || 0,
                                trips: selectedDriver.customersCarried?.length || 0,
                            }}
                            onClose={() => setShowEnhancedWhatsApp(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}