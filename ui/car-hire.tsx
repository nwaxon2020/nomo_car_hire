"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  Timestamp,
  getDoc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { getAuth } from "firebase/auth"
import { 
  FaStar, 
  FaStarHalfAlt, 
  FaRegStar, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaUsers, 
  FaPalette, 
  FaSnowflake, 
  FaFlag, 
  FaEye, 
  FaTrash, 
  FaCar, 
  FaSearch, 
  FaWhatsapp, 
  FaEnvelope, 
  FaHistory, 
  FaClock, 
  FaUserCheck, 
  FaSave, 
  FaExclamationTriangle,
  FaEdit,
  FaUser
} from 'react-icons/fa'

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
}

interface DriverWithVehicle extends Driver {
  vehicles: VehicleLog[];
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

export default function CarHireUi() {
    // State for contacted drivers and hired cars from Firebase
    const [contactedDrivers, setContactedDrivers] = useState<ContactedDriver[]>([])
    const [hiredCars, setHiredCars] = useState<HiredCar[]>([])

    // Pop up driver name before booking
    const [selectDriver, setSelectDriver] = useState("")

    // Close driver's information page
    const [driverInfo, setDriverInfo] = useState(false)

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

    // State for loading history
    const [loadingHistory, setLoadingHistory] = useState(false)

    // State for delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, comment: Comment | null}>({show: false, comment: null})

    // Check if user has already reviewed
    const hasUserReviewed = selectedDriver?.comments?.some(comment => comment.userId === currentUserId)

    // Initialize auth and load history from Firebase
    useEffect(() => {
        const auth = getAuth()
        const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
            setCurrentUser(user)
            setCurrentUserId(user.uid)
            loadUserHistory(user.uid)
        } else {
            setCurrentUser(null)
            setCurrentUserId("")
            setContactedDrivers([])
            setHiredCars([])
        }
        })

        // Load quick view history from localStorage
        const savedHistory = localStorage.getItem('carHireQuickView')
        if (savedHistory) {
        setQuickViewHistory(JSON.parse(savedHistory))
        }

        return () => unsubscribe()
    }, [])

    // Save to localStorage when quickViewHistory changes
    useEffect(() => {
        if (quickViewHistory) {
        localStorage.setItem('carHireQuickView', JSON.stringify(quickViewHistory))
        } else {
        localStorage.removeItem('carHireQuickView')
        }
    }, [quickViewHistory])

    // Load user history from Firebase with 5-item limit
    const loadUserHistory = async (userId: string) => {
        try {
        setLoadingHistory(true)
        const userDocRef = doc(db, "users", userId)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
            const userData = userDoc.data()
            
            // Get contacted drivers and hired cars, sort by timestamp, limit to 5
            const contactedDriversData: ContactedDriver[] = (userData.contactedDrivers || [])
            .map((item: ContactedDriver) => ({
                ...item,
                // Ensure we have a timestamp for sorting
                timestamp: item.lastContacted || item.contactDate || serverTimestamp()
            }))
            .sort((a: ContactedDriver, b: ContactedDriver) => {
                const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || new Date(a.timestamp).getTime() || 0
                const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || new Date(b.timestamp).getTime() || 0
                return timeB - timeA // Descending (newest first)
            })
            .slice(0, 5) // Keep only 5 most recent
            
            const hiredCarsData: HiredCar[] = (userData.hiredCars || [])
            .map((item: HiredCar) => ({
                ...item,
                timestamp: item.lastHired || item.hireDate || serverTimestamp()
            }))
            .sort((a: HiredCar, b: HiredCar) => {
                const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || new Date(a.timestamp).getTime() || 0
                const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || new Date(b.timestamp).getTime() || 0
                return timeB - timeA
            })
            .slice(0, 5)
            
            setContactedDrivers(contactedDriversData)
            setHiredCars(hiredCarsData)
        }
        } catch (error) {
        console.error("Error loading user history:", error)
        } finally {
        setLoadingHistory(false)
        }
    }

    // Fetch data from Firebase
    useEffect(() => {
        fetchDriversAndVehicles()
    }, [currentUserId]) // Re-fetch when currentUserId changes

    const fetchDriversAndVehicles = async () => {
        try {
        setLoading(true)
        setError(null)

        // Fetch drivers
        const driversQuery = query(
            collection(db, "users"),
            where("isDriver", "==", true)
        )
        const driversSnapshot = await getDocs(driversQuery)
        
        const driversList: Driver[] = []
        driversSnapshot.forEach((doc) => {
            const data = doc.data()
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
            }
            driversList.push(driver)
        })

        // Fetch all vehicles
        const vehiclesQuery = collection(db, "vehicleLog")
        const vehiclesSnapshot = await getDocs(vehiclesQuery)
        
        // Create a map of vehicle IDs to vehicle objects
        const vehicleMap = new Map<string, VehicleLog>()
        vehiclesSnapshot.forEach((doc) => {
            const data = doc.data()
            const vehicle: VehicleLog = {
            id: doc.id,
            carName: data.carName || "",
            carModel: data.carModel || "",
            carType: data.carType || "",
            exteriorColor: data.exteriorColor || "",
            passengers: data.passengers || 0,
            ac: data.ac || false,
            description: data.description || "",
            status: data.status || "",
            driverId: data.driverId || "",
            images: data.images || {},
            }
            vehicleMap.set(doc.id, vehicle)
        })

        // Combine drivers with their vehicles
        const driversWithVehiclesList: DriverWithVehicle[] = []
        
        driversList.forEach(driver => {
            // Skip if this driver is the current user (prevent self-booking)
            if (driver.uid === currentUserId) {
            return
            }

            // Get vehicle objects for this driver's vehicle IDs
            const driverVehicles: VehicleLog[] = []
            
            driver.vehicleLog.forEach(vehicleId => {
            const vehicle = vehicleMap.get(vehicleId)
            if (vehicle && vehicle.status === "available") {
                driverVehicles.push(vehicle)
            }
            })

            // Also check vehicles by driverId (in case vehicleLog IDs don't match)
            vehiclesSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.driverId === driver.uid && data.status === "available") {
                const vehicleExists = driverVehicles.some(v => v.id === doc.id)
                if (!vehicleExists) {
                const vehicle: VehicleLog = {
                    id: doc.id,
                    carName: data.carName || "",
                    carModel: data.carModel || "",
                    carType: data.carType || "",
                    exteriorColor: data.exteriorColor || "",
                    passengers: data.passengers || 0,
                    ac: data.ac || false,
                    description: data.description || "",
                    status: data.status || "",
                    driverId: data.driverId || "",
                    images: data.images || {},
                }
                driverVehicles.push(vehicle)
                }
            }
            })

            if (driverVehicles.length > 0) {
            driversWithVehiclesList.push({
                ...driver,
                vehicles: driverVehicles
            })
            }
        })

        setDriversWithVehicles(driversWithVehiclesList)

        } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load drivers and vehicles. Please try again.")
        } finally {
        setLoading(false)
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
            driverName: selectedDriver.fullName,
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
            driverName: selectedDriver.fullName,
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
        window.scrollTo({top: document.body.scrollHeight, behavior: "smooth"})
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

    // NEW FUNCTION: Handle regular call
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
        <div className="p-2 px-1 md:p-5 relative bg-[#F9FAF9]">
        {/* Select Car Page */}
        <div className="p-2 md:p-8 mx-auto max-w-6xl bg-white rounded-lg shadow-md">
            {/* Book Page Header section */}
            <div className="pt-4 left-0 top-0 text-center w-full">
            <h1 className="mb-2 text-2xl md:text-3xl text-gray-600 font-extrabold">Book a Car</h1>
            <div className="m-2 p-2 sm:p-2 rounded bg-gray-200 font-semibold text-red-800">
                <small><span className="font-black">Important Notice:</span> Please make sure you contact drivers, book appointments properly, negotiate on or before services.</small>
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

            {/* Search and Filter Section - Now with AC and Verified filters */}
            <div className="mt-8 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Search Location */}
                <div className="relative">
                <input 
                    className="w-full rounded-lg outline-blue-600 py-3 px-4 pl-10 border-2 border-gray-300"  
                    type="text" 
                    name="searchLocation" 
                    id="searchLocation" 
                    placeholder="Search Location (city or state)"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                />
                <FaSearch className="absolute top-3 left-3 text-gray-400" />
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
            <div className="p-3 max-h-[65rem] overflow-y-auto">
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
                            {driver.verified && (
                                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                <FaCheckCircle className="mr-1" /> Verified
                                </div>
                            )}
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
                                {driver.averageRating ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">
                                    <FaStar />
                                    </span>
                                    <span className="font-bold">
                                    {driver.averageRating.toFixed(1)}
                                    </span>
                                </div>
                                ) : null}
                            </div><hr className="text-gray-400 mb-1"/>

                            <div className="bg-white p-1 rounded-lg space-y-2 mb-4 text-xs sm:text-sm">
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

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                                <button
                                onClick={() => handleDriverSelect(driver, vehicle)}
                                className="flex-1 text-center text-white rounded-lg font-semibold py-3 bg-blue-600 hover:bg-blue-700 transition-all duration-300"
                                >
                                View Details
                                </button>
                                <button
                                onClick={() => handleComplain(driver.fullName, vehicle)}
                                className="px-4 text-center text-red-600 rounded-lg font-semibold py-3 border border-red-600 hover:bg-red-50 transition-all duration-300"
                                title="Complain about driver"
                                >
                                <FaFlag />
                                </button>
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
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-8 z-50 overflow-y-auto">
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

                        {/* Delete Confirmation Modal */}
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
                            <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white mb-2">{selectedDriver.fullName}</h1>
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
                                <div className="flex items-center">
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
                                </div>
                            </div>

                            {/* NEW: Contact Buttons */}
                            <div className="flex gap-3 mb-4">
                                {/* WhatsApp Button (only if whatsappPreferred is true) */}
                                {selectedDriver.whatsappPreferred ? (
                                <button
                                    onClick={() => handleWhatsAppMessage(selectedDriver, selectedVehicle)}
                                    className="flex-1 py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                >
                                    <FaWhatsapp className="mr-2" />
                                    Message on WhatsApp
                                </button>
                                ) : (
                                <button
                                    onClick={() => handlePhoneCall(selectedDriver.phoneNumber)}
                                    className="flex-1 py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                >
                                    <FaPhone className="mr-2" />
                                    Call Driver
                                </button>
                                )}
                            </div>

                            {/* Save to History Button with Cooldown Check */}
                            <div className="mb-4">
                                {currentUser ? (
                                <>
                                    <button
                                    onClick={handleSaveDriver}
                                    disabled={!canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave}
                                    className={`w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center ${
                                        canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave
                                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                        : "bg-gray-700 cursor-not-allowed"
                                    }`}
                                    >
                                    <FaEye className="mr-2" />
                                    {canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave
                                        ? "Completed"
                                        : "Save to History (Cooldown)"}
                                    </button>

                                    <p className="text-gray-400 text-xs mt-2 text-center">
                                    Click {'"Completed"'} Button for successful TP
                                    </p>

                                    <p className="text-gray-400 text-xs mt-1 mb-3 text-center">
                                    {canSaveDriver(selectedDriver.uid, selectedVehicle.id).canSave
                                        ? <div className="flex flex-col">
                                            <span>• Booking details will be added to your dashboard history</span>
                                            <span>• 10-minute cooldown between bookings</span>
                                            <span>• By clicking the Completed button, you confirm that your movement and transaction with the driver were successful. If you have any complaints about the driver, please flag them.</span>
                                        </div>
                                        : `⏳ ${canSaveDriver(selectedDriver.uid, selectedVehicle.id).message}`}
                                    </p>
                                </>
                                ) : (
                                <div className="w-full py-3 bg-gray-800 text-gray-400 font-semibold rounded-lg text-center">
                                    Sign in to save to your history
                                </div>
                                )}
                            </div>

                            {/* Rating Summary */}
                            {selectedDriver.averageRating ? (
                                <div className="bg-gray-800 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                    <div className="text-3xl font-bold text-white">
                                        {selectedDriver.averageRating.toFixed(1)}
                                    </div>
                                    <div>
                                        {renderStars(selectedDriver.averageRating, "lg", false)}
                                        <div className="text-gray-400 text-sm mt-1">
                                        {selectedDriver.totalRatings} {selectedDriver.totalRatings === 1 ? 'review' : 'reviews'}
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
                            ) : (
                                <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
                                No ratings yet
                                </div>
                            )}
                            </div>
                        </div>

                        {/* Vehicle Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Vehicle Images */}
                            <div>
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white mb-3">Vehicle Gallery</h3>
                                <div className="relative h-64 bg-gray-800 rounded-lg overflow-hidden mb-4">
                                <Image
                                    src={mainImage}
                                    alt="Car Image"
                                    fill
                                    className="object-contain"
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
                        <div className="bg-gray-800 rounded-lg md:px-26 p-2 sm:p-4">
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
        </div>
    )
}