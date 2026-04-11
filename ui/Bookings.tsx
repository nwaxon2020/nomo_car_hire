"use client"

import { useState, useEffect } from "react"
import {
    collection, query, where, getDocs, doc, updateDoc, arrayUnion,
    arrayRemove, Timestamp, getDoc, writeBatch, serverTimestamp, addDoc, onSnapshot,
    orderBy
} from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { getAuth } from "firebase/auth"
import {
    FaTimesCircle, FaCar, FaSearch, FaExclamationTriangle, FaTimes,
} from 'react-icons/fa'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from "react-hot-toast"
import { triggerNotification } from "@/lib/notifications"

// NEW: Imports From components 
import PreChat from "@/components/PreChat"
import FlagOverlay from "@/components/mobility/FlagOverlay"
import BookingTrackingMap from "@/components/map/BookingTrackingMap";


// Interfaces matching your Firebase data structure
import {
    VehicleLog, Comment, Driver, DriverWithVehicle, TripHistory,
    ContactedDriver, HiredCar, Trip, DirectOffer
} from "@/components/mobilityBookings/types"
import {
    getDriverLocation,
    getDriverAddress, formatDate, getDefaultVehicleImage
} from "@/components/mobilityBookings/utils"

// NEW: Refactored Components
import QuickViewHistory from "@/components/mobilityBookings/QuickViewHistory"
import SearchFilters from "@/components/mobilityBookings/SearchFilters"
import BookingGrid from "@/components/mobilityBookings/BookingGrid"
import DriverDetailsModal from "@/components/mobilityBookings/DriverDetailsModal"
import MyVehiclesSelector from "@/components/mobilityBookings/MyVehiclesSelector"
import { div } from "framer-motion/client"

const SubtleDriverNotice = () => (
    <div className="mb-2 p-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center gap-3">
        <div className="bg-emerald-600 p-1.5 rounded-lg text-white shadow-lg">
            <FaCar size={12} />
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Fleet Active</p>
            <p className="text-[10px] font-medium text-gray-400">Tap a vehicle below to set your active booking car.</p>
        </div>
    </div>
);



///////////////////////////////////////////////////////////////////////
// VIP Configuration - Same as in driver profile


export default function BookingUi() {
    // activate for parameters
    const searchParams = useSearchParams()

    // State for contacted drivers and hired cars from Firebase
    const [tripHistory, setTripHistory] = useState<TripHistory[]>([]) // Trip history state
    const [contactedDrivers, setContactedDrivers] = useState<ContactedDriver[]>([])
    const [hiredCars, setHiredCars] = useState<HiredCar[]>([])



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

    // States for reviewing
    const [reviewMessage, setReviewMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" })
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)

    // Trip success messages
    const [showTripSuccess, setShowTripSuccess] = useState(false);
    const [tripSuccessMessage, setTripSuccessMessage] = useState('');

    // State for loading history
    const [loadingHistory, setLoadingHistory] = useState(false)

    // State for delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean, comment: Comment | null }>({ show: false, comment: null })

    // ✅ NEW: State for Pre-Chat Modal
    const [showPreChat, setShowPreChat] = useState(false)

    // Flag driver state
    const [flagDriverOverlay, setFlagDriverOverlay] = useState<{
        show: boolean;
        driver: DriverWithVehicle | null;
        vehicle: VehicleLog | null;
    }>({ show: false, driver: null, vehicle: null });


    // Customer geolocation
    const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Check if user has already reviewed
    const hasUserReviewed = selectedDriver?.comments?.some(comment =>
        comment.userId === currentUserId ||
        comment.userEmail === currentUser?.email
    ) ?? false

    //location settings Panel
    const [showLocationPanel, setShowLocationPanel] = useState(false);

    // ✅ NEW: Direct Booking & View Mode States
    const [viewMode, setViewMode] = useState<"customer" | "driver">("customer");
    const [pendingOffer, setPendingOffer] = useState<DirectOffer | null>(null);
    const [incomingOffer, setIncomingOffer] = useState<DirectOffer | null>(null);
    const [showCancelWarning, setShowCancelWarning] = useState(false);
    const [acceptanceMap, setAcceptanceMap] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [driverResponse, setDriverResponse] = useState<"none" | "cancelled" | "busy">("none");

    // Notifications
    const [notificationCount, setNotificationCount] = useState(0);
    const [notificationType, setNotificationType] = useState<"driver" | "customer">("customer");
    const [isDriver, setIsDriver] = useState(false);

    // OWN VEHICLE SELECTOR STATE
    const [ownVehicles, setOwnVehicles] = useState<VehicleLog[]>([])
    const [activeOwnVehicleId, setActiveOwnVehicleId] = useState<string>("")


    // Initialize auth and load history from Firebase
    useEffect(() => {
        const auth = getAuth()
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setCurrentUser(user)
                setCurrentUserId(user.uid)
                loadUserHistory(user.uid)
                loadNotificationData(user.uid)
            } else {
                setCurrentUser(null)
                setCurrentUserId("")
                setContactedDrivers([])
                setHiredCars([])
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

        // Get customer's live GPS — use watchPosition for continuous live updates
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => setCustomerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setCustomerLocation(null),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
            // Clean up the watch when component unmounts
            return () => {
                navigator.geolocation.clearWatch(watchId);
                unsubscribe();
            };
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
                if (driverStatus) {
                    setViewMode("driver"); // Drivers see their Requests page by default
                }
                setNotificationType(driverStatus ? "driver" : "customer");

                // Notification counts for drivers
                if (driverStatus) {
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
                }

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

    // Dedicated effector to fetch driver's own approved/available vehicles
    useEffect(() => {
        if (!currentUserId || !isDriver) {
            setOwnVehicles([]);
            return;
        }

        const fetchOwnVehicles = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", currentUserId));
                if (!userDoc.exists()) return;

                const userData = userDoc.data();
                const vehicleIds = userData.vehicleLog || [];
                const myVehiclesList: VehicleLog[] = [];

                if (vehicleIds.length > 0) {
                    for (const vId of vehicleIds) {
                        const vDoc = await getDoc(doc(db, "vehicleLog", vId));
                        if (vDoc.exists()) {
                            const vData = vDoc.data();
                            // Broaden filter: car should be approved OR simply available (but not rejected/maintenance)
                            const isApproved = vData.status === 'approved' || vData.isApproved === true;
                            const isAvailable = vData.status === 'available';

                            if (isApproved || isAvailable) {
                                myVehiclesList.push({
                                    id: vDoc.id,
                                    carName: vData.carName || "",
                                    carModel: vData.carModel || "",
                                    carType: vData.carType || "",
                                    exteriorColor: vData.exteriorColor || "",
                                    passengers: vData.passengers || 0,
                                    ac: vData.ac || false,
                                    description: vData.description || "",
                                    status: vData.status || "available",
                                    driverId: vData.driverId || "",
                                    images: vData.images || {},
                                });
                            }
                        }
                    }
                }
                setOwnVehicles(myVehiclesList);
            } catch (error) {
                console.error("Error fetching own vehicles:", error);
            }
        };

        fetchOwnVehicles();
    }, [currentUserId, isDriver]);

    // Listen for current user profile changes (especially bookingVehicleId)
    useEffect(() => {
        if (!currentUserId) return;

        const unsubscribe = onSnapshot(doc(db, "users", currentUserId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.bookingVehicleId) {
                    setActiveOwnVehicleId(data.bookingVehicleId);
                }
                setCurrentUser((prev: any) => prev ? { ...prev, ...data } : data);
            }
        });

        return () => unsubscribe();
    }, [currentUserId]);

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
            const category = searchParams.get('category')

            // Handle category filter from external link (e.g., profile page)
            if (category) {
                setSelectedCategory(category)
                setTimeout(() => {
                    const element = document.getElementById('search-results')
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' })
                    }
                }, 500)
            }

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

            // Fetch ALL vehicles (including unavailable ones)
            const vehiclesQuery = collection(db, "vehicleLog");
            const vehiclesSnapshot = await getDocs(vehiclesQuery);

            // Create vehicle map - INCLUDE ALL VEHICLES regardless of status
            const vehicleMap = new Map<string, VehicleLog>();
            vehiclesSnapshot.forEach((doc) => {
                const data = doc.data();
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
                    isApproved: data.isApproved || false, // ← READ isApproved from Firestore
                    driverId: data.driverId || "",
                    images: data.images || {},
                };
                vehicleMap.set(doc.id, vehicle);
            });

            // Combine drivers with ALL their vehicles (including unavailable ones)
            const driversWithVehiclesList: DriverWithVehicle[] = [];

            driversSnapshot.forEach(doc => {
                const data = doc.data();
                // In fetchDrivers
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
                    isVip: (data.vipLevel || 0) > 0 || (data.purchasedVipLevel || 0) > 0,
                    vipLevel: data.vipLevel || 0,
                    purchasedVipLevel: data.purchasedVipLevel || 0,
                    prestigeLevel: data.prestigeLevel || 0,
                    referralCount: data.referralCount || 0,
                    vipBadge: data.vipBadge || "",

                    // LOCATION FIELDS
                    location: data.location || undefined,
                    isLocationActive: data.isLocationActive || false,
                    locationSharedAt: data.locationSharedAt || undefined,
                    lastLocationUpdate: data.lastLocationUpdate || undefined,
                    bookingVehicleId: data.bookingVehicleId || undefined,
                    bookingVehicleLastUpdated: data.bookingVehicleLastUpdated || undefined,
                };


                // Get ALL vehicles for this driver (including unavailable ones)
                const driverVehicles: VehicleLog[] = [];

                // Get vehicles from driver's vehicleLog array
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
                            isApproved: vehicleData.isApproved || false, // ← READ isApproved
                            driverId: vehicleData.driverId || "",
                            images: vehicleData.images || {},
                        };
                        driverVehicles.push(vehicle);
                    }
                });

                // Skip if this driver is the current user (prevent self-booking)
                if (driver.uid === currentUserId) return;

                // Only include driver if they have at least one vehicle
                // NEW LOGIC: Only include their strictly SET active vehicle (or fallback to the first one)
                if (driverVehicles.length > 0) {
                    let activeVehicle = undefined;
                    
                    if (driver.bookingVehicleId) {
                        activeVehicle = driverVehicles.find(v => v.id === driver.bookingVehicleId);
                    }
                    
                    // Critical Fallback: if the driver's target car doesn't exist anymore, default to their 1st APPROVED vehicle
                    if (!activeVehicle) {
                        activeVehicle = driverVehicles.find(v => v.status === 'approved' || (v as any).isApproved) || driverVehicles[0];
                    }

                    if (activeVehicle) {
                        driversWithVehiclesList.push({
                            ...driver,
                            vehicles: [activeVehicle] // Stricly wrap ONLY the single active vehicle
                        });
                    }
                }
            });

            // SORT DRIVERS BY PRIORITY: VIP level → Verified → Distance
            const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };

            const getDriverDistance = (driver: DriverWithVehicle): number => {
                // Driver stores location as {lat, lng} — not {latitude, longitude}
                const dLat = driver.location?.lat ?? driver.location?.latitude;
                const dLng = driver.location?.lng ?? driver.location?.longitude;
                if (!customerLocation || !dLat || !dLng) return 9999;
                return haversineDistance(customerLocation.lat, customerLocation.lng, dLat, dLng);
            };

            // NEW PRIORITY SORTING:
            // 1. Verified + VIP (Ranked by Level)
            // 2. Verified + Star Ratings
            // 3. Verified
            // 4. Non-Verified
            // All buckets sorted by distance within the bucket.

            const getPriorityRank = (driver: DriverWithVehicle): number => {
                const vipLevel = Math.max(driver.vipLevel || 0, driver.purchasedVipLevel || 0);
                if (driver.verified && vipLevel > 0) return 0; // Top Priority
                if (driver.verified && (driver.averageRating || 0) > 0) return 1;
                if (driver.verified) return 2;
                return 3; // Lowest
            };

            driversWithVehiclesList.sort((a, b) => {
                const rankA = getPriorityRank(a);
                const rankB = getPriorityRank(b);

                if (rankA !== rankB) return rankA - rankB;

                // Within same rank, sort by VIP level if applicable
                if (rankA === 0) {
                    const vipA = Math.max(a.vipLevel || 0, a.purchasedVipLevel || 0);
                    const vipB = Math.max(b.vipLevel || 0, b.purchasedVipLevel || 0);
                    if (vipA !== vipB) return vipB - vipA;
                }

                // Finally sort by distance
                return getDriverDistance(a) - getDriverDistance(b);
            });

            setDriversWithVehicles(driversWithVehiclesList);

            // DEBUG: Log summary to help diagnose visibility issues
            console.log(`[Bookings] Fetched ${driversWithVehiclesList.length} drivers with vehicles.`);
            driversWithVehiclesList.forEach(d => {
                d.vehicles.forEach(v => {
                    console.log(`  Driver: ${d.fullName} | Car: ${v.carName} | isApproved: ${v.isApproved} | status: ${v.status}`);
                });
            });

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load drivers and vehicles. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Filter drivers - only approved vehicles, with location/category/AC/verified filters
    const filteredDrivers = driversWithVehicles.flatMap((driver) => {
        return driver.vehicles
            .filter((vehicle) => {
                // ONLY show approved vehicles — gate on isApproved (set by admin)
                if (!vehicle.isApproved) {
                    console.log(`[Filter BLOCKED] ${driver.fullName} - not approved`);
                    return false;
                }

                // Check proximity using LIVE GPS only. Profile city strings are unreliable.
                // isNearby defaults to true — only GPS math can set it to false.
                let isNearby = true;

                // Driver location stored as {lat, lng} by DriverLocationToggle (NOT latitude/longitude)
                const driverLat = driver.location?.lat ?? driver.location?.latitude;
                const driverLng = driver.location?.lng ?? driver.location?.longitude;

                if (customerLocation && driverLat && driverLng) {
                    const R = 6371;
                    const lat1 = customerLocation.lat;
                    const lon1 = customerLocation.lng;
                    const lat2 = driverLat;
                    const lon2 = driverLng;
                    
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a = 
                        Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                        Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const distance = R * c;
                    
                    isNearby = distance <= 50;
                    console.log(`[Filter GPS] ${driver.fullName} | distance: ${distance.toFixed(1)}km | isNearby: ${isNearby}`);
                }
                // No GPS available on either side → default isNearby stays true (show the car)

                let locationMatch = false;
                
                if (searchLocation !== "") {
                    const textMatch = driver.city?.toLowerCase().includes(searchLocation.toLowerCase()) ||
                        driver.state?.toLowerCase().includes(searchLocation.toLowerCase());
                    locationMatch = textMatch;
                    if (!locationMatch && isNearby) locationMatch = true;
                } else {
                    locationMatch = isNearby;
                }

                let categoryMatch = true;
                if (selectedCategory === "all") {
                    if (showACOnly && vehicle.carType.toLowerCase() === "keke") categoryMatch = false;
                } else {
                    categoryMatch = vehicle.carType?.toLowerCase() === selectedCategory.toLowerCase();
                    if (showACOnly && vehicle.carType.toLowerCase() === "keke") categoryMatch = false;
                }

                const acMatch = !showACOnly || (vehicle.ac && vehicle.carType.toLowerCase() !== "keke");
                const verifiedMatch = !showVerifiedOnly || driver.verified;

                const passes = locationMatch && categoryMatch && acMatch && verifiedMatch;
                if (!passes) {
                    console.log(`[Filter REJECTED] ${driver.fullName} | locationMatch:${locationMatch} categoryMatch:${categoryMatch} acMatch:${acMatch} verifiedMatch:${verifiedMatch}`);
                } else {
                    console.log(`[Filter PASSED] ${driver.fullName} | ${vehicle.carName}`);
                }

                return passes;
            })
            .map(vehicle => ({ driver, vehicle }))
    })

    // Handle own vehicle selection (persists to Firestore)
    const handleOwnVehicleSelect = async (vehicle: VehicleLog) => {
        if (!currentUserId || !vehicle.id) return;

        // Check the 24 hour cooldown
        if (currentUser?.bookingVehicleLastUpdated) {
            const lastUpdated = currentUser.bookingVehicleLastUpdated.toDate();
            const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
            if (Date.now() - lastUpdated.getTime() < cooldownPeriod) {
                toast.error("You can only change your active vehicle once every 24 hours.");
                return;
            }
        }

        try {
            await updateDoc(doc(db, "users", currentUserId), {
                bookingVehicleId: vehicle.id,
                bookingVehicleLastUpdated: serverTimestamp()
            });
            // onSnapshot will handle local state update
            toast.success("Active booking car updated.");
        } catch (error) {
            console.error("Error updating booking vehicle:", error);
            toast.error("Failed to update active car.");
        }
    }

    const isVehicleChangeLocked = currentUser?.bookingVehicleLastUpdated 
        ? (Date.now() - currentUser.bookingVehicleLastUpdated.toDate().getTime()) < (24 * 60 * 60 * 1000)
        : false;

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
        setShowDeleteConfirm({ show: false, comment: null }) // Clear delete confirmation
        const firstImage = vehicle.images?.front ||
            vehicle.images?.side ||
            vehicle.images?.back ||
            vehicle.images?.interior ||
            "/car_select.jpg"
        setMainImage(firstImage)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    // ✅ NEW: Handle Pre-Chat button click
    const handlePreChatClick = (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        setSelectedDriver(driver)
        setSelectedVehicle(vehicle)
        setShowPreChat(true)
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

            const userDocRef = doc(db, "users", String(currentUser.uid))
            const driverDocRef = doc(db, "users", String(selectedDriver.id))
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
        setShowDeleteConfirm({ show: false, comment: null }) // Clear delete confirmation
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

    // Handle flag driver - opens overlay
    const handleFlagDriver = (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        setFlagDriverOverlay({ show: true, driver, vehicle });
    };

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
        setShowDeleteConfirm({ show: true, comment: commentToDelete })
    }

    // Confirm delete comment
    const confirmDeleteComment = async () => {
        if (!showDeleteConfirm.comment || !selectedDriver || !currentUser) return

        try {
            const commentToDelete = showDeleteConfirm.comment
            const driverDocRef = doc(db, "users", selectedDriver.uid)

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
            setShowDeleteConfirm({ show: false, comment: null })

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
            setShowDeleteConfirm({ show: false, comment: null })
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
        setShowDeleteConfirm({ show: false, comment: null })
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
                text: "You have already reviewed this driver."
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

        setIsSubmittingReview(true)
        try {
            // CRITICAL FIX: Use the correct driver document ID
            // The driver document in 'users' collection uses the document ID, not necessarily the uid field
            const driverDocId = selectedDriver.id || selectedDriver.uid;

            console.log("Attempting to save review for driver:", {
                driverDocId,
                driverName: selectedDriver.fullName,
                currentUserId: currentUser.uid
            });

            const driverDocRef = doc(db, "users", driverDocId)

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
                } else if (userData.firstName) {
                    firstName = userData.firstName;
                    lastName = userData.lastName || "";
                    userName = `${firstName} ${lastName}`.trim();
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

            // Get current driver data to verify the document exists
            const driverDoc = await getDoc(driverDocRef);
            if (!driverDoc.exists()) {
                throw new Error(`Driver document not found for ID: ${driverDocId}`);
            }

            console.log("Driver document found, current comments:", driverDoc.data().comments);

            // Update the driver document with the new comment
            await updateDoc(driverDocRef, {
                comments: arrayUnion(newComment),
                ratings: arrayUnion(reviewForm.rating)
            })

            // Get updated ratings to calculate new average
            const driverData = driverDoc.data();
            const existingRatings = driverData.ratings || [];
            const updatedRatings = [...existingRatings, reviewForm.rating];
            const newAverageRating = updatedRatings.reduce((a, b) => a + b, 0) / updatedRatings.length;

            // Update average rating and total ratings count
            await updateDoc(driverDocRef, {
                averageRating: newAverageRating,
                totalRatings: updatedRatings.length
            })

            console.log("Review saved successfully. New average rating:", newAverageRating);

            // Update local state for selectedDriver
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

            // Update local state for driversWithVehicles
            setDriversWithVehicles(prev => prev.map(driver => {
                if (driver.id === selectedDriver.id || driver.uid === selectedDriver.uid) {
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

            // Reset review form
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
                text: `Failed to post review: ${error instanceof Error ? error.message : "Please try again."}`
            })
            setTimeout(() => {
                setReviewMessage({ type: "", text: "" })
            }, 5000)
        } finally {
            setIsSubmittingReview(false)
        }
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
            setTripSuccessMessage('Please sign in to start a trip');
            setShowTripSuccess(true);
            setTimeout(() => setShowTripSuccess(false), 3000);
            return null;
        }

        if (!pickupLocation || !destination) {
            setTripSuccessMessage('Please enter both pickup location and destination');
            setShowTripSuccess(true);
            setTimeout(() => setShowTripSuccess(false), 3000);
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
            setTripSuccessMessage(`Trip started successfully! Live tracking activated.`);
            setShowTripSuccess(true);

            // Update trip info state
            setTripInfo({
                pickupLocation,
                destination,
                fare: estimatedFare,
                status: 'active',
                startTime: Timestamp.now(),
                endTime: null
            });

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setShowTripSuccess(false);
            }, 3000);

            return tripDoc.id;

        } catch (error) {
            console.error('Error starting trip:', error);
            setTripSuccessMessage('Failed to start trip. Please try again.');
            setShowTripSuccess(true);
            setTimeout(() => setShowTripSuccess(false), 3000);
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
                setTripSuccessMessage('Trip not found');
                setShowTripSuccess(true);
                setTimeout(() => setShowTripSuccess(false), 3000);
                return;
            }

            const tripData = tripDoc.data() as Trip;

            // Check if user is authorized to update this trip
            if (tripData.customerId !== currentUser.uid && tripData.driverId !== currentUser.uid) {
                setTripSuccessMessage('You are not authorized to update this trip');
                setShowTripSuccess(true);
                setTimeout(() => setShowTripSuccess(false), 3000);
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

            // Show success message with appropriate styling
            setTripSuccessMessage(`Trip ${status} successfully!`);
            setShowTripSuccess(true);
            setTimeout(() => setShowTripSuccess(false), 3000);

        } catch (error) {
            console.error('Error updating trip:', error);
            setTripSuccessMessage('Failed to update trip status');
            setShowTripSuccess(true);
            setTimeout(() => setShowTripSuccess(false), 3000);
        }
    };

    // ✅ NEW: Direct Booking Flow Logic (Customer)
    const handleBookNow = async (driver: DriverWithVehicle, vehicle: VehicleLog) => {
        if (!currentUser) {
            setTripSuccessMessage('Please sign in to book a car');
            setShowTripSuccess(true);
            setTimeout(() => setShowTripSuccess(false), 3000);
            return;
        }

        const getFreshLocation = (): Promise<{ lat: number, lng: number } | null> =>
            new Promise((resolve) => {
                if (!navigator.geolocation) {
                    toast.error("Geolocation is not supported by your browser");
                    resolve(null);
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (error) => {
                        if (error.code === 1) { // Permission Denied
                            window.alert("PERMISSION DENIED: Please enable your system location/GPS to book a car. Look for the location icon in your browser address bar or system settings.");
                        } else {
                            toast.error("Could not retrieve your location. Check your GPS settings.");
                        }
                        resolve(null);
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                );
            });

        const freshLoc = await getFreshLocation();

        if (!freshLoc) {
            console.warn("Booking aborted: Location missing");
            return; // STOP HERE as requested
        }

        setCustomerLocation(freshLoc);
        // Clean start: clear any old booking UI states
        setPendingOffer(null);
        setAcceptanceMap(false);
        setDriverResponse("none");

        try {
            const offerData: any = {
                customerId: currentUser.uid,
                customerName: currentUser.displayName || 'Customer',
                driverId: driver.uid,
                driverName: driver.fullName || `${driver.firstName} ${driver.lastName}`,
                vehicleId: vehicle.id,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                customerLocation: freshLoc || customerLocation,
                driverPhone: driver.phoneNumber,
                pickupLocation: '', // Can be enhanced later
                destination: '',
            };

            const docRef = await addDoc(collection(db, 'directOffers'), offerData);
            setPendingOffer({ ...offerData, id: docRef.id });
            setCountdown(30); // 30 second timeout logic (visual)

            // Trigger Notification for the Driver
            await triggerNotification(
                driver.uid,
                "New Booking Request!",
                `${currentUser.displayName || "A customer"} is requesting a ride right now!`,
                "booking",
                "/user/mobility/bookings"
            );

            toast.success("Booking request sent!");
        } catch (error) {
            console.error('Error creating booking offer:', error);
            toast.error("Failed to send booking request");
        }
    };

    const cancelOffer = async (offerId: string) => {
        try {
            await updateDoc(doc(db, 'directOffers', offerId), {
                status: 'cancelled',
                updatedAt: serverTimestamp()
            });
            setPendingOffer(null);
            setIncomingOffer(null);
            setAcceptanceMap(false);
            setShowCancelWarning(false);
        } catch (error) {
            console.error('Error cancelling offer:', error);
        }
    };

    // ✅ NEW: Direct Booking Flow Logic (Driver)
    const handleAcceptOffer = async (offer: DirectOffer) => {
        const getFreshDriverLocation = () => new Promise<{ lat: number, lng: number } | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });

        const driverLoc = await getFreshDriverLocation();

        try {
            const batch = writeBatch(db);

            // Update offer status
            batch.update(doc(db, 'directOffers', offer.id), {
                status: 'accepted',
                updatedAt: serverTimestamp(),
                driverLocation: driverLoc,
                driverPhone: currentUser.phoneNumber || offer.driverPhone || ""
            });

            // Update driver's global location for fresh customer view
            if (driverLoc && currentUser) {
                batch.update(doc(db, 'users', currentUser.uid), {
                    location: {
                        latitude: driverLoc.lat,
                        longitude: driverLoc.lng,
                        isSharing: true
                    },
                    lastLocationUpdate: serverTimestamp()
                });
            }

            await batch.commit();
            setAcceptanceMap(true);
        } catch (error) {
            console.error('Error accepting offer:', error);
        }
    };

    const handleRejectOffer = async (offer: DirectOffer) => {
        try {
            await updateDoc(doc(db, 'directOffers', offer.id), {
                status: 'rejected',
                updatedAt: serverTimestamp()
            });
            setIncomingOffer(null);
        } catch (error) {
            console.error('Error rejecting offer:', error);
        }
    };

    // Listen for Customer's Pending Offers (Persistence & Status)
    useEffect(() => {
        if (!currentUser) return;

        // Only listen for recent offers (within the last 30 minutes)
        const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);

        const q = query(
            collection(db, 'directOffers'),
            where('customerId', '==', currentUser.uid),
            where('status', 'in', ['pending', 'accepted', 'rejected', 'cancelled', 'timeout']),
            where('createdAt', '>=', Timestamp.fromDate(recentThreshold)),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const offer = { ...change.doc.data(), id: change.doc.id } as DirectOffer;

                if (offer.status === 'pending') {
                    setPendingOffer(offer);
                    setDriverResponse("none");
                } else if (offer.status === 'accepted') {
                    setPendingOffer(offer);
                    setAcceptanceMap(true);
                } else if (offer.status === 'started' || offer.status === 'completed') {
                    setPendingOffer(null);
                    setAcceptanceMap(false);
                } else if (offer.status === 'rejected') {
                    setDriverResponse("busy");
                    // Show "Driver Busy" card before clearing
                    setTimeout(() => {
                        setPendingOffer(null);
                        setAcceptanceMap(false);
                        setDriverResponse("none");
                    }, 4000); // 4 seconds delay
                } else if (offer.status === 'timeout' || offer.status === 'cancelled') {
                    setPendingOffer(null);
                    setAcceptanceMap(false);
                    if (offer.status === 'cancelled') setDriverResponse("cancelled");
                }
            });

            // Initial load for persistence
            if (snapshot.empty) {
                setPendingOffer(null);
                setAcceptanceMap(false);
            } else {
                const activeOffer = snapshot.docs.find(d => d.data().status === 'pending' || d.data().status === 'accepted');
                if (activeOffer) {
                    const data = { ...activeOffer.data(), id: activeOffer.id } as DirectOffer;
                    setPendingOffer(data);
                    if (data.status === 'accepted') setAcceptanceMap(true);
                } else {
                    setPendingOffer(null);
                    setAcceptanceMap(false);
                }
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Listen for Driver's Incoming Offers
    useEffect(() => {
        if (!currentUser || !isDriver) return;

        // Only listen for recent offers (within the last 30 minutes)
        const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);

        const q = query(
            collection(db, 'directOffers'),
            where('driverId', '==', currentUser.uid),
            where('status', 'in', ['pending', 'cancelled', 'accepted']),
            where('createdAt', '>=', Timestamp.fromDate(recentThreshold)),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const offer = { ...change.doc.data(), id: change.doc.id } as DirectOffer;
                if (offer.status === 'pending') {
                    setIncomingOffer(offer);
                    setDriverResponse("none");
                } else if (offer.status === 'cancelled') {
                    setDriverResponse("cancelled");
                    setTimeout(() => {
                        setIncomingOffer(null);
                        setAcceptanceMap(false);
                        setDriverResponse("none");
                    }, 4000);
                } else if (offer.status === 'started' || offer.status === 'completed') {
                    setIncomingOffer(null);
                    setAcceptanceMap(false);
                }
            });

            if (snapshot.empty) {
                setIncomingOffer(null);
                setAcceptanceMap(false);
            } else {
                const active = snapshot.docs.find(d => d.data().status === 'pending' || d.data().status === 'accepted');
                if (active) {
                    const data = { ...active.data(), id: active.id } as DirectOffer;
                    setIncomingOffer(data);
                    if (data.status === 'accepted') setAcceptanceMap(true);
                } else {
                    const cancelledDoc = snapshot.docs.find(d => d.data().status === 'cancelled');
                    if (cancelledDoc) {
                        setIncomingOffer({ ...cancelledDoc.data(), id: cancelledDoc.id } as DirectOffer);
                        setDriverResponse("cancelled");
                    } else {
                        setIncomingOffer(null);
                        setAcceptanceMap(false);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [currentUser, isDriver]);

    // Countdown Timer logic for Customer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (pendingOffer && pendingOffer.status === 'pending' && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown, pendingOffer]);

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
        <>
            {/* ✅ NEW: Full-screen Acceptance Map Overlay */}
            {/* Map Acceptance Overlay */}
            {acceptanceMap && (pendingOffer || incomingOffer) && (
                <div className="fixed inset-0 z-[200] bg-black">
                    {/* Placeholder for the real Map - integrating with existing map tools if possible */}
                    {/* Unified Map Overlay Content */}
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                        <div className="text-center text-white mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
                                {pendingOffer ? "Driver En Route" : "Customer Location"}
                            </h2>
                            <p className="text-gray-400">
                                {pendingOffer
                                    ? `Driver ${pendingOffer.driverName} has accepted your request.`
                                    : `You are tracking ${incomingOffer?.customerName}'s pick-up point.`
                                }
                            </p>
                        </div>

                        <div className="w-full md:w-[80%] h-[60vh] bg-gray-800 rounded-[3rem] overflow-hidden border-8 border-gray-800 shadow-2xl relative">
                            <BookingTrackingMap
                                pickup={pendingOffer?.customerLocation || incomingOffer?.customerLocation || { lat: 0, lng: 0, address: "" }}
                                driver={pendingOffer?.driverLocation || incomingOffer?.driverLocation || { lat: 0, lng: 0, address: "" }}
                            />

                            {/* Visual Pulse for active tracking */}
                            <div className="absolute top-8 left-8 flex items-center gap-3 bg-gray-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-xl">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Live Connection Active</span>
                            </div>
                        </div>

                        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full px-6 max-w-xl">
                            {pendingOffer && (
                                <button
                                    onClick={() => handlePhoneCall(pendingOffer?.driverPhone || "")}
                                    className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:scale-105 transition-all"
                                >
                                    Call Driver
                                </button>
                            )}
                            {incomingOffer && (
                                <>
                                    <button
                                        onClick={() => handlePhoneCall("123")} // Customer phone currently not captured, placeholder
                                        className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all"
                                    >
                                        Call Customer
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await updateDoc(doc(db, "directOffers", incomingOffer.id), { status: "started", updatedAt: serverTimestamp() });
                                                startTrip(currentUser.uid, incomingOffer.vehicleId, incomingOffer.pickupLocation || "Current Location", incomingOffer.destination || "Not Set");
                                                setAcceptanceMap(false);
                                                setIncomingOffer(null);
                                            } catch (err) {
                                                console.error(err);
                                            }
                                        }}
                                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-700 transition-all"
                                    >
                                        Start Trip
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => setShowCancelWarning(true)}
                                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm border border-red-500/20 shadow-xl hover:bg-red-700 transition-all"
                            >
                                Cancel Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ NEW: Waiting for Driver Overlay */}
            {pendingOffer && pendingOffer.status === 'pending' && (
                <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                        <div className="relative w-32 h-32 mx-auto mb-8">
                            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                            <div
                                className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"
                                style={{ animationDuration: '2s' }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white">
                                {countdown > 0 ? countdown : "..."}
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Waiting for Driver</h3>
                        <p className="text-gray-400 text-sm mb-8">Driver is reviewing your booking request. Please stay on this page.</p>
                        <button
                            onClick={() => setShowCancelWarning(true)}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-red-400 font-bold rounded-2xl transition-all border border-red-500/20"
                        >
                            Cancel Request
                        </button>
                    </div>
                </div>
            )}

            {/* ✅ NEW: Driver Busy Overlay (Passenger sees this when driver rejects) */}
            {pendingOffer && driverResponse === 'busy' && (
                <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                        <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaExclamationTriangle className="text-orange-500 text-4xl" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Driver is Busy</h3>
                        <p className="text-gray-400 text-sm mb-8">The driver is currently unavailable or busy. Please try another driver.</p>
                    </div>
                </div>
            )}

            {/* ✅ NEW: Cancel Warning Card Overlay */}
            {showCancelWarning && (
                <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="max-w-sm w-full bg-white rounded-[2rem] p-8 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaExclamationTriangle className="text-red-600 text-3xl" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Cancel booking?</h3>
                        <p className="text-gray-500 text-sm mb-8">Are you sure you want to cancel this booking request? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelWarning(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                            >
                                No, Wait
                            </button>
                            <button
                                onClick={() => pendingOffer && cancelOffer(pendingOffer.id)}
                                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 pt-3 relative bg-[#F9FAF9]">
                {/* ✅ NEW: View Mode Toggles */}
                {isDriver && (
                    <div className="max-w-6xl mx-auto mb-3 flex flex-col md:flex-row gap-2 md:inline-flex w-full md:w-auto">
                        <button
                            onClick={() => setViewMode("customer")}
                            className={`px-8 py-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 border-2 ${viewMode === "customer"
                                ? "bg-gray-900 text-white border-gray-900 shadow-xl"
                                : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                                }`}
                        >
                            <FaSearch size={14} />
                            Book a Ride
                        </button>
                        <button
                            onClick={() => setViewMode("driver")}
                            className={`px-8 py-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 border-2 ${viewMode === "driver"
                                ? "bg-amber-500 text-black border-amber-500 shadow-xl"
                                : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                                }`}
                        >
                            <FaCar size={14} />
                            My Requests
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="pt-0 pb-20 px-0  mx-auto max-w-6xl bg-white shadow-md min-h-[40rem]">

                    {viewMode === 'customer' ? (
                        <>
                            <QuickViewHistory
                                quickViewHistory={quickViewHistory}
                                driverInfo={driverInfo}
                                handleQuickViewClick={handleQuickViewClick}
                                handleClearQuickView={handleClearQuickView}
                                formatDate={formatDate}
                            />


                            <SearchFilters
                                searchLocation={searchLocation}
                                setSearchLocation={setSearchLocation}
                                selectedCategory={selectedCategory}
                                setSelectedCategory={setSelectedCategory}
                                showACOnly={showACOnly}
                                setShowACOnly={setShowACOnly}
                                showVerifiedOnly={showVerifiedOnly}
                                setShowVerifiedOnly={setShowVerifiedOnly}
                                filteredDriversCount={filteredDrivers.length}
                            />

                            <div className="px-3">
                                <BookingGrid
                                    filteredDrivers={filteredDrivers}
                                    currentUser={currentUser}
                                    customerLocation={customerLocation}
                                    onBook={handleBookNow}
                                    onSelect={handleDriverSelect}
                                    onPreChat={handlePreChatClick}
                                    onWhatsApp={(d, v) => handleWhatsAppMessage(d, v)}
                                    onCall={handlePhoneCall}
                                    onFlag={(d, v) => setFlagDriverOverlay({ show: true, driver: d, vehicle: v })}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="relative">
                            {/* Incoming Offer Switch Logic */}
                            {incomingOffer ? (
                                <div className="px-4 py-5 flex justify-center items-center animate-in fade-in zoom-in duration-500">
                                    {driverResponse === 'cancelled' ? (
                                        <div className="py-20">
                                            <div className="max-w-2xl mx-auto bg-red-50 border border-red-100 rounded-[2.5rem] p-12 text-center relative overflow-hidden">
                                                <button
                                                    onClick={() => setIncomingOffer(null)}
                                                    className="absolute top-6 right-6 p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-all"
                                                >
                                                    <FaTimes />
                                                </button>
                                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <FaTimesCircle className="text-red-500 text-3xl" />
                                                </div>
                                                <h3 className="text-2xl font-black text-red-900 uppercase">Request Cancelled</h3>
                                                <p className="text-red-700/70 mt-2">The customer cancelled this request at the last minute.</p>
                                            </div>
                                        </div>
                                    ) : incomingOffer.status === 'accepted' ? (
                                        <div className="max-w-2xl mx-auto w-full px-4">
                                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
                                                <div className="bg-emerald-500 py-3 text-center">
                                                    <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Active Trip Signal Connected</p>
                                                </div>
                                                <div className="p-10 text-center">
                                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <FaCar className="text-emerald-500 text-2xl" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Trip with {incomingOffer.customerName}</h3>
                                                    <p className="text-gray-500 text-sm mb-8 font-medium">Map tracking is active. You can minimize this view to see your other requests.</p>
                                                    
                                                    <div className="flex flex-col gap-3">
                                                        <button
                                                            onClick={() => setAcceptanceMap(true)}
                                                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg transition-all"
                                                        >
                                                            Open Live Map
                                                        </button>
                                                        <button
                                                            onClick={() => setShowCancelWarning(true)} // Used as Cancel here
                                                            className="w-full py-4 bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                                                        >
                                                            Terminate Trip
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-2 sm:p-3 rounded-[3rem] bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-2xl animate-pulse min-h-[300px] flex items-center justify-center max-w-4xl mx-auto">
                                            <div className="bg-white rounded-[2.8rem] p-10 sm:p-16 text-center w-full">
                                                <p className="text-xs font-black uppercase tracking-[0.4em] text-amber-600 mb-6 drop-shadow-sm">New Booking Offer</p>
                                                <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 leading-tight tracking-tighter">
                                                    {incomingOffer.customerName} <span className="text-amber-500">wants to book you!</span>
                                                </h3>
                                                <p className="text-gray-500 text-lg mb-6 font-medium">Review and accept the request below to see the location.</p>

                                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId) && (
                                                    <div className="bg-amber-50 rounded-2xl p-4 mb-8 border border-amber-200 shadow-inner flex items-center justify-center gap-4 max-w-sm mx-auto">
                                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                            <FaCar className="text-amber-500 text-xl" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Target Vehicle</p>
                                                            <p className="font-bold text-gray-900 text-sm">
                                                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId)?.carName}{" "}
                                                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId)?.carModel}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                                                    <button
                                                        onClick={() => handleRejectOffer(incomingOffer)}
                                                        className="flex-1 py-6 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 font-black tracking-widest uppercase rounded-[2rem] transition-all text-sm"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAcceptOffer(incomingOffer)}
                                                        className="flex-1 py-6 bg-gray-900 hover:bg-black text-white font-black tracking-widest uppercase rounded-[2rem] transition-all shadow-2xl text-sm"
                                                    >
                                                        Accept Offer
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {ownVehicles.length > 0 ? (
                                        <div className="p-3 md:p-5 space-y-6">
                                            <div className="flex gap-2 items-center justify-between px-2">
                                                <h2 className="text-lg md:text-xl font-black text-emerald-700 uppercase tracking-tight">Your Active Fleet</h2>
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{ownVehicles.length} Vehicles</span>
                                            </div>
                                            <MyVehiclesSelector
                                                vehicles={ownVehicles}
                                                selectedVehicleId={activeOwnVehicleId}
                                                onSelect={handleOwnVehicleSelect}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                                            <FaCar className="text-5xl text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-medium">No vehicles registered to your account.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DriverDetailsModal
                    show={driverInfo}
                    driver={selectedDriver as DriverWithVehicle}
                    vehicle={selectedVehicle as VehicleLog}
                    currentUser={currentUser}
                    activeTrip={activeTrip}
                    saveMessage={saveMessage}
                    showDeleteConfirm={showDeleteConfirm}
                    tripInfo={{
                        showForm: tripInfo.showForm || false,
                        pickupLocation: tripInfo.pickupLocation,
                        destination: tripInfo.destination
                    }}
                    reviewForm={reviewForm}
                    hoverRating={hoverRating}
                    hasUserReviewed={hasUserReviewed || false}
                    currentUserId={currentUserId}
                    mainImage={mainImage}
                    onClose={handleCloseDriverInfo}
                    onSaveDriver={handleSaveDriver}
                    onStartTrip={startTrip}
                    onUpdateTripStatus={updateTripStatus}
                    onDeleteComment={handleDeleteComment}
                    onConfirmDeleteComment={confirmDeleteComment}
                    onCancelDeleteComment={cancelDeleteComment}
                    onReviewSubmit={handleReviewSubmit}
                    onReviewChange={handleReviewChange}
                    onRatingClick={handleRatingClick}
                    onSetHoverRating={setHoverRating}
                    onSetMainImage={setMainImage}
                    onSetTripInfo={setTripInfo}
                    onSetDriverInfo={setDriverInfo}
                    onSetPreChat={setShowPreChat}
                    isSubmittingReview={isSubmittingReview}
                    onPhoneCall={handlePhoneCall}
                    onWhatsAppMessage={handleWhatsAppMessage}
                    getDriverAddress={getDriverAddress}
                    getDriverLocation={getDriverLocation}
                    canSaveDriver={canSaveDriver}
                    formatDate={formatDate}
                    onSetVehicle={setSelectedVehicle}
                />

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

                {/* Flag Overlay Integration */}
                {currentUser && flagDriverOverlay.show && flagDriverOverlay.driver && (
                    <FlagOverlay
                        isOpen={flagDriverOverlay.show}
                        onClose={() => setFlagDriverOverlay({ show: false, driver: null, vehicle: null })}
                        targetUser={{
                            uid: flagDriverOverlay.driver.uid,
                            fullName: flagDriverOverlay.driver.fullName,
                            email: flagDriverOverlay.driver.email,
                            phone: flagDriverOverlay.driver.phoneNumber,
                            type: "driver"
                        }}
                        reporterUser={{
                            uid: currentUser.uid,
                            fullName: currentUser.displayName || "Anonymous Customer"
                        }}
                    />
                )}

            </div>
        </>
    )
}