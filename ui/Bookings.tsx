"use client"

import { useState, useEffect } from "react"
import Image from "next/image";
import { motion } from "framer-motion";
import {
    collection, query, where, getDocs, doc, updateDoc, arrayUnion,
    arrayRemove, Timestamp, getDoc, writeBatch, serverTimestamp, addDoc, onSnapshot,
    orderBy, deleteDoc, limit, startAfter
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import {
    FaTimesCircle, FaCar, FaSearch, FaExclamationTriangle, FaTimes, FaInfoCircle, FaMapMarkerAlt
} from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from "react-hot-toast"
import { triggerNotification } from "@/lib/notifications"
import { logFeatureUsage } from "@/lib/analytics";

// NEW: Imports From components 
import PreChat from "@/components/PreChat"
import FlagOverlay from "@/components/mobility/FlagOverlay"
import BookingTrackingMap from "@/components/map/BookingTrackingMap";


// Interfaces matching your Firebase data structure
import {
    VehicleLog, Comment, Driver, DriverWithVehicle, TripHistory,
    ContactedDriver, HiredCar, Trip, DirectOffer,
    BookingRequest
} from "@/components/mobilityBookings/types"
import {
    getDriverLocation,
    getDriverAddress, formatDate, getDefaultVehicleImage
} from "@/components/mobilityBookings/utils"
import { nigeriaLocations } from "@/components/carHireBookings/locations"

// NEW: Refactored Components
import QuickViewHistory from "@/components/mobilityBookings/QuickViewHistory";
import SearchFilters from "@/components/mobilityBookings/SearchFilters";
import BookingGrid from "@/components/mobilityBookings/BookingGrid";
import DriverDetailsModal from "@/components/mobilityBookings/DriverDetailsModal";
import MyVehiclesSelector from "@/components/mobilityBookings/MyVehiclesSelector";

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

// Negotiation Notice ///////////////////////////////////////////////////////////
const NegotiationNotice = () => (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 flex items-center gap-2 shadow-sm">
        <div className="bg-blue-600 px-2 py-1 rounded-xl text-white shadow-md shrink-0">
            <FaInfoCircle size={14} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Fair Negotiation Policy</p>
            <p className="text-[11px] font-medium text-gray-600 leading-tight">
                Bookings are negotiations between drivers and customers. Please ensure a proper agreement on fare and terms is reached before starting your trip.
            </p>
        </div>
    </div>
);



///////////////////////////////////////////////////////////////////////
// VIP Configuration - Same as in driver profile


export default function BookingUi() {
    // activate for parameters
    const searchParams = useSearchParams()

    // Close driver's information page
    const [driverInfo, setDriverInfo] = useState(false)

    // State for contacted drivers and hired cars from Firebase
    const [tripHistory, setTripHistory] = useState<TripHistory[]>([]) // Trip history state
    const [contactedDrivers, setContactedDrivers] = useState<ContactedDriver[]>([])
    const [hiredCars, setHiredCars] = useState<HiredCar[]>([])


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
    const [visibleCount, setVisibleCount] = useState(20)

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

    // Server-side pagination states
    const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null)
    const [hasMoreDrivers, setHasMoreDrivers] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

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
    const [isDriver, setIsDriver] = useState(false);

    // OWN VEHICLE SELECTOR STATE
    const [ownVehicles, setOwnVehicles] = useState<VehicleLog[]>([])
    const [activeOwnVehicleId, setActiveOwnVehicleId] = useState<string>("")

    // ✅ NEW: Loading state for accept offer button
    const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
    const [isStartingTrip, setIsStartingTrip] = useState(false);

    // ✅ NEW: Missing state for active public booking requests
    const [activeRequest, setActiveRequest] = useState<BookingRequest | null>(null);

    // ✅ NEW: Destination Overlay States
    const [showDestinationOverlay, setShowDestinationOverlay] = useState(false);
    const [tempBookingData, setTempBookingData] = useState<{ driver: DriverWithVehicle; vehicle: VehicleLog } | null>(null);
    const [destinationInput, setDestinationInput] = useState("");


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

    useEffect(() => {
        logFeatureUsage("bookings");
    }, []);

    // New function to load notification data
    const loadNotificationData = async (userId: string) => {
        try {
            // Check if user is driver
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const driverStatus = userData.isDriver || false;
                setIsDriver(driverStatus);
                const savedViewMode = sessionStorage.getItem("nomo_view_mode");
                if (savedViewMode === "customer") {
                    setViewMode("customer");
                } else if (savedViewMode === "driver") {
                    setViewMode("driver");
                } else if (driverStatus) {
                    setViewMode("driver");
                }

                // Notification counts for drivers
                if (driverStatus) {
                    const requestsRef = collection(db, "bookingRequests");
                    const querySnapshot = await getDocs(query(
                        requestsRef,
                        where("status", "==", "active"),
                        limit(50) // Added limit to prevent over-fetching
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
                    // For customers: Count received offers from notification data
                    const requestsRef = collection(db, "bookingRequests");
                    const q = query(
                        requestsRef,
                        where("userId", "==", userId),
                        where("status", "==", "active"),
                        limit(1)
                    );

                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const request = querySnapshot.docs[0].data();
                        setNotificationCount(Math.min(request.offers?.length || 0, 99));
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching notification data:", error);
        }
    };

    // Helper to load offers for a specific request (used in listeners)
    const loadRequestOffers = async (requestId: string) => {
        try {
            const requestDoc = await getDoc(doc(db, "bookingRequests", requestId));
            if (requestDoc.exists()) {
                const data = requestDoc.data();
                setNotificationCount(Math.min(data.offers?.length || 0, 99));
            }
        } catch (error) {
            console.error("Error loading request offers:", error);
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

                // ✅ AUTO-SELECT: If driver has exactly 1 approved/available car and no bookingVehicleId set yet
                if (myVehiclesList.length === 1 && !userData.bookingVehicleId) {
                    const soleVehicle = myVehiclesList[0];
                    console.log(`[Auto-Select] Driver has only 1 car. Selecting ${soleVehicle.carName} (ID: ${soleVehicle.id})`);

                    await updateDoc(doc(db, "users", currentUserId), {
                        bookingVehicleId: soleVehicle.id,
                        bookingVehicleLastUpdated: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    setActiveOwnVehicleId(soleVehicle.id);
                }
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

                // ✅ NEW: Real-time sync for contacted drivers list
                if (data.contactedDrivers) {
                    const sorted = [...data.contactedDrivers].sort((a: any, b: any) => {
                        const timeA = a.lastContacted?.toMillis?.() || a.contactDate?.toMillis?.() || 0;
                        const timeB = b.lastContacted?.toMillis?.() || b.contactDate?.toMillis?.() || 0;
                        return timeB - timeA;
                    }).slice(0, 5);
                    setContactedDrivers(sorted);
                }
            }
        }, (error) => {
            console.error("[Bookings] Error listening to user profile:", error);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // Dedicated listener for Customer's active booking request
    useEffect(() => {
        if (!currentUserId) return;

        const q = query(
            collection(db, "bookingRequests"),
            where("userId", "==", currentUserId),
            where("status", "==", "active"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const requestData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BookingRequest;
                setActiveRequest(requestData);
                loadRequestOffers(snapshot.docs[0].id);
            } else {
                setActiveRequest(null);
            }
        }, (error) => {
            console.error("[Bookings] Error listening to active request:", error);
        });

        return () => unsubscribe();
    }, [currentUserId, isDriver]);

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
                where("status", "in", ["completed", "cancelled"]), // Only completed/cancelled trips
                limit(10) // Added limit to prevent massive history fetch
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


    // Fetch drivers and vehicle data from Firebase (Debounced on Search)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchDriversAndVehicles(false)
        }, 600); // 600ms debounce
        return () => clearTimeout(timeoutId);
    }, [currentUserId, searchLocation]) // Re-fetch when currentUserId or search changes

    // new useEffect to handle query parameters
    useEffect(() => {
        const handleParams = async () => {
            const driverId = searchParams.get('driver')
            const vehicleId = searchParams.get('vehicle')
            const searchQuery = searchParams.get('search')
            const category = searchParams.get('category')
            const openModal = searchParams.get('openModal') === 'true'

            // Handle category filter from external link
            if (category) {
                setSelectedCategory(category)
                setTimeout(() => {
                    const element = document.getElementById('search-results')
                    if (element) element.scrollIntoView({ behavior: 'smooth' })
                }, 500)
            }

            // Handle search query
            if (searchQuery) {
                setSearchLocation(searchQuery)
                setTimeout(() => {
                    const element = document.getElementById('search-results')
                    if (element) element.scrollIntoView({ behavior: 'smooth' })
                }, 500)
            }

            if (driverId && openModal) {
                // 1. Try finding in current proximity list
                let driver = driversWithVehicles.find(d => d.uid === driverId || d.id === driverId)
                let vehicle: VehicleLog | null = null

                if (driver) {
                    if (vehicleId) {
                        vehicle = driver.vehicles.find(v => v.id === vehicleId) || null
                    }
                    if (!vehicle && driver.vehicles.length > 0) {
                        vehicle = driver.vehicles[0]
                    }
                } else {
                    // 2. Not found in proximity? Fetch directly from DB
                    try {
                        const driverDoc = await getDoc(doc(db, "users", driverId))
                        if (driverDoc.exists()) {
                            const dData = driverDoc.data()
                            const fetchedDriver: any = {
                                id: driverDoc.id,
                                uid: dData.uid || driverDoc.id,
                                firstName: dData.firstName || "",
                                lastName: dData.lastName || "",
                                fullName: dData.fullName || `${dData.firstName} ${dData.lastName}`,
                                phoneNumber: dData.phoneNumber || dData.phone || "",
                                profileImage: dData.profileImage || dData.photoURL || "",
                                vehicleLog: dData.vehicleLog || [],
                                verified: dData.verified || false,
                                vipLevel: dData.vipLevel || 0,
                                purchasedVipLevel: dData.purchasedVipLevel || 0,
                                averageRating: dData.averageRating || 0,
                                vehicles: []
                            }

                            // Fetch vehicle details
                            const targetVId = vehicleId || (fetchedDriver.vehicleLog.length > 0 ? fetchedDriver.vehicleLog[0] : null)
                            if (targetVId) {
                                const vDoc = await getDoc(doc(db, "vehicleLog", targetVId))
                                if (vDoc.exists()) {
                                    vehicle = { id: vDoc.id, ...vDoc.data() } as VehicleLog
                                    fetchedDriver.vehicles = [vehicle]
                                }
                            }
                            driver = fetchedDriver as DriverWithVehicle
                        }
                    } catch (err) {
                        console.error("[Bookings] Error fetching driver for param modal:", err)
                    }
                }

                if (driver && vehicle) {
                    setSelectedDriver(driver)
                    setSelectedVehicle(vehicle)
                    setDriverInfo(true)
                    setMainImage(vehicle.images?.front || "/car_select.jpg")
                    
                    // Scroll to modal view
                    setTimeout(() => {
                        const element = document.getElementById('contact-driver')
                        if (element) element.scrollIntoView({ behavior: 'smooth' })
                    }, 500)
                }
            }
        }

        if (currentUserId) {
            handleParams()
        }
    }, [currentUserId, searchParams, driversWithVehicles.length === 0])

    // Fetch Drivers and Vehicles from Backend (Paginated)
    const fetchDriversAndVehicles = async (isLoadMore = false) => {
        try {
            if (!isLoadMore) {
                setLoading(true);
                setDriversWithVehicles([]);
                setHasMoreDrivers(true);
            } else {
                setIsLoadingMore(true);
            }
            setError(null);

            // Base query array
            const queryConstraints: any[] = [
                where("isDriver", "==", true),
                where("isLocationActive", "==", true) // only fetch active drivers
            ];

            // Setup Backend Filter based on location
            let locationInput = "";
            if (searchLocation.trim() !== "") {
                locationInput = searchLocation.trim().toLowerCase();
            } else if (currentUser?.city) {
                locationInput = currentUser.city.toLowerCase();
            }

            if (locationInput) {
                queryConstraints.push(where("searchableLocations", "array-contains", locationInput));
            }

            // Apply Pagination
            if (isLoadMore && lastVisibleDoc) {
                queryConstraints.push(startAfter(lastVisibleDoc));
            }

            queryConstraints.push(limit(20));

            const driversQuery = query(collection(db, "users"), ...queryConstraints);
            const driversSnapshot = await getDocs(driversQuery);

            if (driversSnapshot.empty) {
                setHasMoreDrivers(false);
                if (!isLoadMore) setDriversWithVehicles([]);
                setLoading(false);
                setIsLoadingMore(false);
                return;
            }

            // Save the last visible document for the next page
            setLastVisibleDoc(driversSnapshot.docs[driversSnapshot.docs.length - 1]);

            // If we fetched less than 20 drivers, there are no more drivers to load
            if (driversSnapshot.docs.length < 20) {
                setHasMoreDrivers(false);
            } else {
                setHasMoreDrivers(true);
            }

            // Gather required vehicle IDs
            const vehicleIdsToFetch = new Set<string>();
            const driversList: Driver[] = [];

            driversSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.uid === currentUserId) return; // Skip self

                const driver: Driver = {
                    id: docSnap.id,
                    uid: data.uid || docSnap.id,
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    fullName: data.fullName || `${data.firstName} ${data.lastName}`.trim(),
                    phoneNumber: data.phoneNumber || data.phone || data.driverPhone || "",
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
                    location: data.location || undefined,
                    isLocationActive: data.isLocationActive || false,
                    locationSharedAt: data.locationSharedAt || undefined,
                    lastLocationUpdate: data.lastLocationUpdate || undefined,
                    bookingVehicleId: data.bookingVehicleId || undefined,
                    bookingVehicleLastUpdated: data.bookingVehicleLastUpdated || undefined,
                    isDisabled: data.isDisabled || false,
                };

                // Add active car ID (or first array element) to fetch list
                if (driver.bookingVehicleId) {
                    vehicleIdsToFetch.add(driver.bookingVehicleId);
                } else if (driver.vehicleLog.length > 0) {
                    vehicleIdsToFetch.add(driver.vehicleLog[0]);
                }

                driversList.push(driver);
            });

            // Fetch exactly ONLY those vehicles instead of the whole vehicleLog collection
            const vehicleMap = new Map<string, VehicleLog>();
            const vIds = Array.from(vehicleIdsToFetch);

            // Note: 'in' queries natively support up to 30 items, so vIds.length <= 20 is safe
            if (vIds.length > 0) {
                const vehiclesQuery = query(collection(db, "vehicleLog"), where("__name__", "in", vIds));
                const vehiclesSnapshot = await getDocs(vehiclesQuery);

                vehiclesSnapshot.forEach((vDoc) => {
                    const data = vDoc.data();
                    vehicleMap.set(vDoc.id, {
                        id: vDoc.id,
                        carName: data.carName || "",
                        carModel: data.carModel || "",
                        carType: data.carType || "",
                        exteriorColor: data.exteriorColor || "",
                        passengers: data.passengers || 0,
                        ac: data.ac || false,
                        description: data.description || "",
                        status: data.status || "available",
                        plateNumber: data.plateNumber || "",
                        isApproved: data.isApproved || false,
                        driverId: data.driverId || "",
                        images: data.images || {},
                    });
                });
            }

            // Combine Drivers and their targeted Vehicles
            const newDriversWithVehicles: DriverWithVehicle[] = [];

            for (const driver of driversList) {
                // Front-end filter check: do not show disabled drivers
                if (driver.isDisabled) continue;

                let activeVehicle = undefined;
                if (driver.bookingVehicleId) {
                    activeVehicle = vehicleMap.get(driver.bookingVehicleId);
                }
                if (!activeVehicle && driver.vehicleLog.length > 0) {
                    activeVehicle = vehicleMap.get(driver.vehicleLog[0]);
                }

                // Append if vehicle is approved
                if (activeVehicle && activeVehicle.isApproved) {
                    newDriversWithVehicles.push({
                        ...driver,
                        vehicles: [activeVehicle]
                    });
                }
            }

            // Sorting by Priority (VIP -> Rating -> Distance)
            const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };

            const getDriverDistance = (driver: DriverWithVehicle): number => {
                const dLat = driver.location?.lat ?? driver.location?.latitude;
                const dLng = driver.location?.lng ?? driver.location?.longitude;
                if (!customerLocation || !dLat || !dLng) return 9999;
                return haversineDistance(customerLocation.lat, customerLocation.lng, dLat, dLng);
            };

            const getPriorityRank = (driver: DriverWithVehicle): number => {
                const vipLevel = Math.max(driver.vipLevel || 0, driver.purchasedVipLevel || 0);
                if (driver.verified && vipLevel > 0) return 0;
                if (driver.verified && (driver.averageRating || 0) > 0) return 1;
                if (driver.verified) return 2;
                return 3;
            };

            newDriversWithVehicles.sort((a, b) => {
                const rankA = getPriorityRank(a);
                const rankB = getPriorityRank(b);
                if (rankA !== rankB) return rankA - rankB;
                if (rankA === 0) {
                    const vipA = Math.max(a.vipLevel || 0, a.purchasedVipLevel || 0);
                    const vipB = Math.max(b.vipLevel || 0, b.purchasedVipLevel || 0);
                    if (vipA !== vipB) return vipB - vipA;
                }
                return getDriverDistance(a) - getDriverDistance(b);
            });

            if (isLoadMore) {
                setDriversWithVehicles(prev => [...prev, ...newDriversWithVehicles]);
            } else {
                setDriversWithVehicles(newDriversWithVehicles);
            }

            console.log(`[Bookings] Fetched ${newDriversWithVehicles.length} drivers on this page.`);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load drivers and vehicles. Please try again.");
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    }

    // Filter drivers - final frontend pass for category/AC/verified logic
    const filteredDrivers = driversWithVehicles.flatMap((driver) => {
        if (!driver || !driver.vehicles) return [];

        return driver.vehicles
            .filter((vehicle) => {
                // Secondary runtime filters that can be done client-side cheaply

                let categoryMatch = true;
                if (selectedCategory !== "all") {
                    categoryMatch = vehicle.carType?.toLowerCase() === selectedCategory.toLowerCase();
                    if (showACOnly && vehicle.carType.toLowerCase() === "keke") categoryMatch = false;
                } else if (showACOnly && vehicle.carType.toLowerCase() === "keke") {
                    categoryMatch = false;
                }

                const acMatch = !showACOnly || (vehicle.ac && vehicle.carType.toLowerCase() !== "keke");
                const verifiedMatch = !showVerifiedOnly || driver.verified;

                return categoryMatch && acMatch && verifiedMatch;
            })
            .map(vehicle => ({ driver, vehicle }))
    })

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(20)
    }, [searchLocation, selectedCategory, showACOnly, showVerifiedOnly])

    // Handle own vehicle selection (persists to Firestore)
    const handleOwnVehicleSelect = async (vehicle: VehicleLog) => {
        if (!currentUserId || !vehicle.id) return;

        // Check the calendar day cooldown
        if (currentUser?.bookingVehicleLastUpdated) {
            const lastUpdated = currentUser.bookingVehicleLastUpdated.toDate();
            const today = new Date();
            if (
                lastUpdated.getDate() === today.getDate() &&
                lastUpdated.getMonth() === today.getMonth() &&
                lastUpdated.getFullYear() === today.getFullYear()
            ) {
                toast.error("You can only change your active vehicle once per day. Try again tomorrow.");
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

    // Helper for phone calls
    const handlePhoneCall = (phoneNumber: string) => {
        if (!phoneNumber) return

        let dialNumber = phoneNumber.replace(/\s+/g, '')
        if (dialNumber.startsWith('0') && dialNumber.length === 11) {
            dialNumber = '+234' + dialNumber.substring(1)
        } else if (!dialNumber.startsWith('+')) {
            dialNumber = '+234' + dialNumber
        }

        window.location.href = `tel:${dialNumber}`
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
            const now = Timestamp.now()

            // Get current user data
            const userDoc = await getDoc(userDocRef)
            const userData = userDoc.data()
            const driverTargetId = selectedDriver.uid || selectedDriver.id;

            const isAlreadyContacted = (userData?.contactedDrivers || []).some(
                (cd: any) => cd.driverId === driverTargetId
            );

            if (isAlreadyContacted) {
                const updatedList = (userData?.contactedDrivers || []).map((cd: any) => {
                    if (cd.driverId === driverTargetId) {
                        return { 
                            ...cd, 
                            lastContacted: now, 
                            timestamp: now,
                            phoneNumber: selectedDriver.phoneNumber || cd.phoneNumber || "",
                            driverPhone: selectedDriver.phoneNumber || cd.driverPhone || "" 
                        };
                    }
                    return cd;
                });
                await updateDoc(userDocRef, {
                    contactedDrivers: updatedList,
                    updatedAt: now
                });
                toast.success("Contact history updated!");
            } else {
                const newContactedDriver = {
                    driverId: driverTargetId,
                    driverName: selectedDriver.fullName || `${selectedDriver.firstName} ${selectedDriver.lastName}`.trim(),
                    phoneNumber: selectedDriver.phoneNumber || "",
                    driverPhone: selectedDriver.phoneNumber || "",
                    profileImage: selectedDriver.profileImage || "",
                    vehicleId: selectedVehicle.id,
                    vehicleName: selectedVehicle.carName,
                    vehicleModel: selectedVehicle.carModel,
                    contactDate: now,
                    lastContacted: now,
                    timestamp: now
                };

                await updateDoc(userDocRef, {
                    contactedDrivers: arrayUnion(newContactedDriver),
                    updatedAt: now
                });
                toast.success("Driver saved to your contacted list!");
            }
            
            // Refresh user history from Firestore (source of truth)
            loadUserHistory(currentUser.uid);

            // Add user to driver's customersCarried (if not already there)
            const driverDocId = selectedDriver.id || selectedDriver.uid;
            const driverDocRef = doc(db, "users", driverDocId);
            const customersCarried = selectedDriver.customersCarried || [];
            if (!customersCarried.includes(currentUser.uid)) {
                await updateDoc(driverDocRef, {
                    customersCarried: arrayUnion(currentUser.uid),
                    updatedAt: now
                });
            }

            // Update selected driver's customersCarried in local state
            if (!selectedDriver.customersCarried?.includes(currentUser.uid)) {
                setSelectedDriver({
                    ...selectedDriver,
                    customersCarried: [...(selectedDriver.customersCarried || []), currentUser.uid]
                });
            }

            // Update cooldown state
            const key = `${selectedDriver.uid}_${selectedVehicle.id}`;
            setSaveCooldown(prev => ({ ...prev, [key]: Date.now() }));

            // Show success message
            setSaveMessage({
                type: "success",
                text: isAlreadyContacted
                    ? "✓ Contact history updated."
                    : "✓ The contact of this driver has been added to your list of contacted drivers in your dashboard."
            });

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
        setSelectedDriver(null)
        setSelectedVehicle(null)
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
            const driverDocId = selectedDriver.id || selectedDriver.uid
            const driverDocRef = doc(db, "users", driverDocId)

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

        setIsStartingTrip(true);
        try {
            // Use fare from incomingOffer if available, otherwise generate estimation
            const fare = incomingOffer?.fare || Math.floor(Math.random() * 5000) + 2000;

            const tripData = {
                driverId,
                vehicleId,
                customerId: incomingOffer?.customerId || currentUser.uid,
                customerName: incomingOffer?.customerName || (currentUser.displayName || 'Customer'),
                pickupLocation,
                destination,
                fare,
                status: 'active',
                startTime: Timestamp.now(),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                type: incomingOffer ? 'direct_booking' : 'regular_booking',
                // NEW: Initial location
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
                currentTripId: tripDoc.id,
                updatedAt: serverTimestamp()
            });

            // Update incoming offer status if exists
            if (incomingOffer) {
                await updateDoc(doc(db, "directOffers", incomingOffer.id), {
                    status: 'started',
                    tripId: tripDoc.id,
                    updatedAt: serverTimestamp()
                });
            }

            // Update driver's customersCarried on a Monthly Reset basis
            const driverRef = doc(db, 'users', driverId);
            const driverDoc = await getDoc(driverRef);
            const driverData = driverDoc.data() || {};

            const currentCustomers = driverData.customersCarried || [];
            const lastMonth = driverData.customersCarriedMonth || "";
            const currentMonth = new Date().toISOString().slice(0, 7); // e.g., '2024-04'

            let newCustomers = currentCustomers;
            if (lastMonth !== currentMonth) {
                newCustomers = []; // Clear array for the new month
            }

            // Add this trip directly as a unique entry to increment the passenger stats
            const uniqueTripEntry = `${currentUser.uid}_${tripDoc.id}`;
            const updatedCustomers = [...newCustomers, uniqueTripEntry];

            await updateDoc(driverRef, {
                customersCarried: updatedCustomers,
                customersCarriedMonth: currentMonth,
                updatedAt: Timestamp.now()
            });

            // Set active trip locally
            setActiveTrip({
                ...tripData,
                id: tripDoc.id
            } as Trip);

            // Update the selected driver in local state
            setSelectedDriver(prev => prev ? {
                ...prev,
                customersCarried: updatedCustomers
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
                fare,
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
                    resolve(customerLocation || null);
                    return;
                }

                // Attempt 1: High Accuracy (e.g. mobile GPS)
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (error) => {
                        if (error.code === 1) { // Permission Denied
                            window.alert("PERMISSION DENIED: Please enable your system location/GPS to book a car. Look for the location icon in your browser address bar or system settings.");
                            resolve(customerLocation || null);
                            return;
                        }

                        // Attempt 2: Low Accuracy (e.g. laptop WiFi/IP location) if GPS fails/times out
                        console.warn("High Accuracy GPS failed, trying Low Accuracy fallback...");
                        navigator.geolocation.getCurrentPosition(
                            (posLow) => resolve({ lat: posLow.coords.latitude, lng: posLow.coords.longitude }),
                            (errorLow) => {
                                // Attempt 3: Final Fallback to already watched customerLocation
                                if (customerLocation) {
                                    resolve(customerLocation);
                                } else {
                                    toast.error("Could not retrieve your location. Check your GPS/network settings.");
                                    resolve(null);
                                }
                            },
                            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                        );
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } // Faster timeout so laptops failover quickly
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

        // Trigger destination overlay instead of sending immediately
        setTempBookingData({ driver, vehicle });
        setShowDestinationOverlay(true);
    };

    // Finalize booking after destination is entered
    const finalizeBooking = async () => {
        if (!tempBookingData || !currentUser || !destinationInput) {
            toast.error("Please enter a destination");
            return;
        }

        const { driver, vehicle } = tempBookingData;

        try {
            const offerData: any = {
                customerId: currentUser.uid,
                customerName: currentUser.fullName || (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : (currentUser.displayName || 'Customer')),
                driverId: driver.uid,
                driverName: driver.fullName || `${driver.firstName} ${driver.lastName}`,
                vehicleId: vehicle.id,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                customerLocation: customerLocation,
                driverLocation: driver.location || null, // Allow driver map tracking
                customerImage: (currentUser?.profileImage && !currentUser.profileImage.includes("profile.png"))
                    ? currentUser.profileImage
                    : (currentUser?.photoURL || ""),
                driverImage: driver.profileImage || "",
                driverPhone: driver.phoneNumber,
                plateNumber: vehicle.plateNumber || "N/A",
                pickupLocation: 'Current Location', // Simplified for now
                destination: destinationInput,
            };

            const docRef = await addDoc(collection(db, 'directOffers'), offerData);
            setPendingOffer({ ...offerData, id: docRef.id });
            setCountdown(60); // 60 second timeout logic (visual)

            // Trigger Notification for the Driver
            await triggerNotification(
                driver.uid,
                "New Booking Request!",
                `${currentUser.displayName || "A customer"} is requesting a ride to ${destinationInput}!`,
                "booking",
                "/user/mobility/bookings"
            );

            toast.success("Booking request sent!");
            setShowDestinationOverlay(false);
            setDestinationInput("");
            setTempBookingData(null);
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

            // Delayed database purge to ensure UI status propagates first before complete deletion
            setTimeout(async () => {
                try {
                    await deleteDoc(doc(db, 'directOffers', offerId));
                } catch (e) {
                    console.error('Silenced delayed delete error:', e);
                }
            }, 6000);

            setPendingOffer(null);
            setIncomingOffer(null);
            setAcceptanceMap(false);
            setShowCancelWarning(false);
        } catch (error) {
            console.error('Error cancelling offer:', error);
        }
    };

    // ✅ NEW: Direct Booking Flow Logic (Driver) - UPDATED with loading state
    const handleAcceptOffer = async (offer: DirectOffer) => {
        // Prevent multiple clicks
        if (isAcceptingOffer) return;

        setIsAcceptingOffer(true);

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
            toast.error("Failed to accept offer. Please try again.");
        } finally {
            setIsAcceptingOffer(false);
        }
    };

    const handleRejectOffer = async (offer: DirectOffer) => {
        try {
            await updateDoc(doc(db, 'directOffers', offer.id), {
                status: 'rejected',
                updatedAt: serverTimestamp()
            });

            // Delay purge
            setTimeout(async () => {
                try {
                    await deleteDoc(doc(db, 'directOffers', offer.id));
                } catch (e) {
                    console.error('Silenced delayed delete error:', e);
                }
            }, 6000);

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
        }, (error) => {
            console.error("[Bookings] Error listening to customer offers:", error);
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
        }, (error) => {
            console.error("[Bookings] Error listening to driver incoming offers:", error);
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

    // MAIN RETURN PAGE //////////////////////////////////////////////////////////////////////////////
    return (
        <>
            {/* ✅ NEW: Full-screen Acceptance Map Overlay */}
            {/* Map Acceptance Overlay */}
            {acceptanceMap && (pendingOffer || incomingOffer) && (
                <div className="fixed inset-0 z-[200] bg-black">
                    {/* Placeholder for the real Map - integrating with existing map tools if possible */}
                    {/* Unified Map Overlay Content */}
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                        <div className="text-center text-white mb-4 md:mb-8">
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest mb-2">
                                {pendingOffer ? "Driver En Route" : "Customer Location"}
                            </h2>
                            <p className="text-gray-400">
                                {pendingOffer
                                    ? `Driver ${pendingOffer.driverName} has accepted your request.`
                                    : `You are tracking ${incomingOffer?.customerName}'s pick-up point.`
                                }
                            </p>
                            {/* Show destination */}
                            {(pendingOffer?.destination || incomingOffer?.destination) && (
                                <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-xl">
                                    <FaMapMarkerAlt className="text-emerald-400" size={12} />
                                    <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">
                                        Heading to: {pendingOffer?.destination || incomingOffer?.destination}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-[80%] h-[50vh] md:h-[60vh] bg-gray-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden border-4 md:border-8 border-gray-800 shadow-2xl relative">
                            <BookingTrackingMap
                                pickup={pendingOffer?.customerLocation || incomingOffer?.customerLocation || { lat: 0, lng: 0, address: "" }}
                                driver={pendingOffer?.driverLocation || incomingOffer?.driverLocation || { lat: 0, lng: 0, address: "" }}
                                customerImage={pendingOffer?.customerImage || incomingOffer?.customerImage}
                                driverImage={pendingOffer?.driverImage || incomingOffer?.driverImage}
                                plateNumber={pendingOffer?.plateNumber || incomingOffer?.plateNumber}
                                viewerRole={pendingOffer ? 'customer' : 'driver'}
                                destinationLabel={pendingOffer?.destination || incomingOffer?.destination}
                            />

                            {/* Visual Pulse for active tracking */}
                            <div className="absolute top-8 left-8 flex items-center gap-3 bg-gray-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-xl">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Live Connection Active</span>
                            </div>
                        </div>

                        <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-4 w-full px-6 max-w-xl">
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
                        <div className="relative w-36 h-36 mx-auto mb-8">
                            {/* Rotating Spinner Border */}
                            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent z-10"
                            ></motion.div>

                            {/* Driver Image Container */}
                            <div className="absolute inset-2 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-900 shadow-inner">
                                {pendingOffer.driverImage ? (
                                    <Image
                                        src={pendingOffer.driverImage}
                                        alt={pendingOffer.driverName}
                                        width={144}
                                        height={144}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-600/20 text-blue-500">
                                        <FaCar size={40} />
                                    </div>
                                )}
                            </div>

                            {/* Countdown Badge */}
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center text-lg font-black shadow-xl z-20 border-4 border-gray-900">
                                {countdown > 0 ? countdown : "..."}
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Connecting to Driver</h3>
                        <p className="text-gray-400 text-sm mb-8">Driver {pendingOffer.driverName} is reviewing your booking request. Please stay on this page.</p>
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
                                onClick={() => {
                                    if (pendingOffer) cancelOffer(pendingOffer.id);
                                    else if (incomingOffer) cancelOffer(incomingOffer.id);
                                }}
                                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ NEW: Destination Input Overlay */}
            {showDestinationOverlay && tempBookingData && (
                <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
                    >
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

                        <button
                            onClick={() => {
                                setShowDestinationOverlay(false);
                                setDestinationInput("");
                                setTempBookingData(null);
                            }}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                        >
                            <FaTimes size={20} />
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                <FaMapMarkerAlt className="text-emerald-500 text-2xl" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Set Your Destination</h3>
                            <p className="text-gray-400 text-xs">Tell {tempBookingData.driver.firstName} where you are heading.</p>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="relative">
                                <div className="absolute top-1/2 left-5 -translate-y-1/2 text-emerald-500">
                                    <FaMapMarkerAlt size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter drop-off location..."
                                    value={destinationInput}
                                    onChange={(e) => setDestinationInput(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                                    autoFocus
                                />
                            </div>

                            <div className="bg-gray-800/50 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                    <Image
                                        src={tempBookingData.driver.profileImage || "/per.png"}
                                        alt="Driver"
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Driver Selected</p>
                                    <p className="text-sm font-bold text-white">{tempBookingData.driver.fullName}</p>
                                    <p className="text-[10px] text-gray-500">{tempBookingData.vehicle.carName} • {tempBookingData.vehicle.plateNumber}</p>
                                </div>
                            </div>

                            <button
                                onClick={finalizeBooking}
                                disabled={!destinationInput.trim()}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-50 text-white hover:text-emerald-900 font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 disabled:hover:text-white"
                            >
                                Confirm & Send Request
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="px-2 pt-4 md:px-4 md:pt-2 relative bg-[#F9FAF9]">
                {/* ✅ NEW: View Mode Toggles */}
                {isDriver && (
                    <div className="max-w-6xl mx-auto mb- flex justify-center md:justify-start flex-row gap-2 md:inline-flex w-full md:w-auto">
                        <button
                            onClick={() => { setViewMode("customer"); sessionStorage.setItem("nomo_view_mode", "customer"); }}
                            className={`px-3 md:px-8 py-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-1 md:gap-3 border-2 ${viewMode === "customer"
                                ? "bg-gray-900 text-white border-gray-900 shadow-xl"
                                : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                                }`}
                        >
                            <FaSearch size={14} />
                            Book a Ride
                        </button>
                        <button
                            onClick={() => { setViewMode("driver"); sessionStorage.setItem("nomo_view_mode", "driver"); }}
                            className={`px-3 md:px-8 py-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-1 md:gap-3 border-2 ${viewMode === "driver"
                                ? "bg-amber-500 text-black border-amber-500 shadow-xl"
                                : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                                }`}
                        >
                            <FaCar size={14} />
                            My Requests
                        </button>
                    </div>
                )}

                {/* Main Content Area ////////////////////////////////////////////////////////////////////////////////////////////*/}
                <div className="pt-0 pb-20 mx-auto bg-white shadow-md min-h-[40rem]">

                    {viewMode === 'customer' ? (
                        <>
                            <NegotiationNotice />
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
                                customerCity={currentUser?.city}
                            />

                            <div className="px-3 pb-8">
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

                                {hasMoreDrivers && (
                                    <div className="flex justify-center mt-8">
                                        <button
                                            onClick={() => fetchDriversAndVehicles(true)}
                                            disabled={isLoadingMore}
                                            className="px-8 py-3 bg-gray-900 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-black transition-all shadow-xl hover:scale-105 active:scale-95 border border-gray-700 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                        >
                                            {isLoadingMore && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            {isLoadingMore ? 'Loading...' : 'Load More Drivers'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="relative">
                            <NegotiationNotice />
                            {/* Incoming Offer Switch Logic */}
                            {incomingOffer ? (
                                <div className="p-4 flex justify-center items-center animate-in fade-in zoom-in duration-500">
                                    {driverResponse === 'cancelled' ? (
                                        <div className="py-5">
                                            <div className="max-w-md mx-auto bg-red-50 border border-red-100 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden shadow-lg">
                                                <button
                                                    onClick={() => setIncomingOffer(null)}
                                                    className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-all"
                                                >
                                                    <FaTimes />
                                                </button>
                                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <FaTimesCircle className="text-red-500 text-2xl" />
                                                </div>
                                                <h3 className="text-lg font-black text-red-900 uppercase">Request Cancelled</h3>
                                                <p className="text-red-700/70 mt-1 text-xs sm:text-sm">The customer cancelled this request at the last minute.</p>
                                            </div>
                                        </div>
                                    ) : incomingOffer.status === 'accepted' ? (
                                        <div className="max-w-lg mx-auto w-full px-2 sm:px-4">
                                            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
                                                <div className="bg-emerald-500 py-2.5 text-center">
                                                    <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Active Trip Signal Connected</p>
                                                </div>
                                                <div className="p-6 md:p-8 text-center">
                                                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <FaCar className="text-emerald-500 text-xl" />
                                                    </div>
                                                    <h3 className="text-xl font-black text-gray-900 mb-1">Trip with {incomingOffer.customerName}</h3>
                                                    <p className="text-gray-500 text-[10px] sm:text-xs mb-6 font-medium">Map tracking is active. You can minimize this view to see your other requests.</p>

                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => setAcceptanceMap(true)}
                                                                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all"
                                                            >
                                                                Open Map
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (incomingOffer.pickupLocation && incomingOffer.destination) {
                                                                        startTrip(
                                                                            incomingOffer.driverId,
                                                                            incomingOffer.vehicleId,
                                                                            incomingOffer.pickupLocation,
                                                                            incomingOffer.destination
                                                                        );
                                                                    } else {
                                                                        toast.error("Trip details incomplete");
                                                                    }
                                                                }}
                                                                disabled={isStartingTrip}
                                                                className="flex-1 py-3.5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                            >
                                                                {isStartingTrip ? (
                                                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <><FaCar size={10} /> Start Trip</>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowCancelWarning(true)} // Used as Cancel here
                                                            className="w-full py-3.5 bg-gray-50 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                                                        >
                                                            Terminate
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-1 sm:p-2 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-2xl flex items-center justify-center max-w-lg mx-auto w-full">
                                            <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 text-center w-full">
                                                <div className="flex justify-center mb-6">
                                                    <div className="relative w-24 h-24">
                                                        <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-25"></div>
                                                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-amber-500 shadow-xl bg-gray-100">
                                                            {incomingOffer.customerImage ? (
                                                                <Image
                                                                    src={incomingOffer.customerImage}
                                                                    alt={incomingOffer.customerName}
                                                                    width={96}
                                                                    height={96}
                                                                    className="object-cover w-full h-full"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-amber-100 text-amber-600">
                                                                    <FaCar size={32} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-amber-600 mb-2 drop-shadow-sm">New Booking Offer</p>
                                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 leading-tight tracking-tighter">
                                                    {incomingOffer.customerName} <span className="text-amber-500 flex flex-col sm:inline">wants to book you!</span>
                                                </h3>
                                                <p className="text-gray-500 text-xs sm:text-sm mb-4 font-medium">Accept request from {incomingOffer.customerName} to see the location.</p>

                                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId) && (
                                                    <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200 shadow-inner flex items-center justify-center gap-3 w-full">
                                                        <div className="text-center">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Target Vehicle</p>
                                                            <p className="font-bold text-gray-900 text-xs">
                                                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId)?.carName}{" "}
                                                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId)?.carModel}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Customer's Destination */}
                                                {incomingOffer.destination && (
                                                    <div className="bg-emerald-50 rounded-xl p-3 mb-6 border border-emerald-200 shadow-inner w-full">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                                                <FaMapMarkerAlt className="text-white" size={14} />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Customer&apos;s Destination</p>
                                                                <p className="font-bold text-gray-900 text-sm leading-tight">{incomingOffer.destination}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-3 w-full">
                                                    <button
                                                        onClick={() => handleRejectOffer(incomingOffer)}
                                                        className="flex-1 py-3 sm:py-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 font-black tracking-widest uppercase rounded-xl transition-all text-[10px] sm:text-xs"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAcceptOffer(incomingOffer)}
                                                        disabled={isAcceptingOffer}
                                                        className={`flex-1 py-3 sm:py-4 font-black tracking-widest uppercase rounded-xl transition-all text-[10px] sm:text-xs flex items-center justify-center gap-2 ${isAcceptingOffer
                                                            ? "bg-gray-400 cursor-not-allowed text-white"
                                                            : "bg-gray-900 hover:bg-black text-white shadow-xl"
                                                            }`}
                                                    >
                                                        {isAcceptingOffer ? "Wait..." : "Accept"}
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

                                            <SubtleDriverNotice />

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

                    reviewForm={reviewForm}
                    hoverRating={hoverRating}
                    hasUserReviewed={hasUserReviewed || false}
                    currentUserId={currentUserId}
                    mainImage={mainImage}
                    onClose={handleCloseDriverInfo}
                    onDeleteComment={handleDeleteComment}
                    onConfirmDeleteComment={confirmDeleteComment}
                    onCancelDeleteComment={cancelDeleteComment}
                    onReviewSubmit={handleReviewSubmit}
                    onReviewChange={handleReviewChange}
                    onRatingClick={handleRatingClick}
                    onSetHoverRating={setHoverRating}
                    onSetMainImage={setMainImage}
                    onSetDriverInfo={setDriverInfo}
                    onSetPreChat={setShowPreChat}
                    isSubmittingReview={isSubmittingReview}
                    onPhoneCall={handlePhoneCall}
                    onWhatsAppMessage={handleWhatsAppMessage}
                    getDriverAddress={getDriverAddress}
                    formatDate={formatDate}
                    onSetVehicle={setSelectedVehicle}
                    onMarkContacted={handleSaveDriver}
                    isContacted={(currentUser?.contactedDrivers || []).some((cd: any) => cd.driverId === (selectedDriver?.uid || selectedDriver?.id))}
                    canSave={selectedDriver && selectedVehicle ? canSaveDriver(selectedDriver.uid || selectedDriver.id, selectedVehicle.id).canSave : true}
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
