"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  Timestamp,
  getDoc,
  increment,
  setDoc
} from "firebase/firestore";
import toast from 'react-hot-toast';
import { X, Check, Phone, Car, Calendar, Users, MapPin, MessageCircle, AlertCircle, Trash2, Edit2, Send, Eye, Navigation } from 'lucide-react';
import ChatWindow from "../PreChat/chat-window";

interface ViewRequestsProps {
  userId?: string;
  userName?: string;
  userLocation?: string;
  onNotificationUpdate?: () => void;
  onCustomerViewedOffers?: () => void;
}

interface BookingRequestType {
  id: string;
  userId: string;
  userName: string;
  carType: string;
  budget: string;
  location: string;
  state?: string;
  city?: string;
  startDate: string;
  endDate: string;
  passengers: string;
  tripType: string;
  description: string;
  negotiable: boolean;
  urgent: boolean;
  status: "active" | "fulfilled" | "expired";
  offers: OfferType[];
  views: number;
  createdAt: any;
  expiresAt: string;
  isSameCity?: boolean;
  destination?: string;
}

interface OfferType {
  id?: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  carColor?: string;
  hasAC: boolean;
  price: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: any;
}

interface UserType {
  isDriver?: boolean;
  phoneNumber?: string;
  fullName?: string;
  location?: string;
  state?: string;
  city?: string;
  [key: string]: any;
}

export default function ViewRequests({
  userId,
  userName = "",
  userLocation = "",
  onNotificationUpdate,
  onCustomerViewedOffers
}: ViewRequestsProps) {
  const [requests, setRequests] = useState<BookingRequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "urgent" | "nearby">("all");
  const [error, setError] = useState<string>("");
  const [userData, setUserData] = useState<UserType>({});
  const [userRequestCount, setUserRequestCount] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequestType | null>(null);
  const [viewingRequest, setViewingRequest] = useState<BookingRequestType | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [driverState, setDriverState] = useState<string>("");
  const [driverCity, setDriverCity] = useState<string>("");

  const [popupTimer, setPopupTimer] = useState<NodeJS.Timeout | null>(null);

  const [activeChat, setActiveChat] = useState<{
    show: boolean;
    chatId?: string;
    car?: any;
    driver?: any;
  }>({ show: false });

  const [contactForm, setContactForm] = useState({
    carMake: "",
    hasAC: true,
    price: "",
    message: "",
    agreeTerms: false
  });

  const [editForm, setEditForm] = useState({
    carType: "",
    budget: "",
    location: "",
    startDate: "",
    endDate: "",
    passengers: "",
    tripType: "",
    description: "",
    negotiable: false,
    urgent: false,
    isSameCity: true,
    destination: ""
  });

  const nigeriaLocations = {
    "Lagos": ["Lagos", "Ikeja", "Victoria Island", "Lekki", "Ajah", "Surulere"],
    "Abuja": ["Abuja", "Garki", "Wuse", "Maitama", "Asokoro"],
    "Ogun": ["Abeokuta", "Sagamu", "Ijebu-Ode", "Ifo", "Mowe"],
    "Rivers": ["Port Harcourt", "Obio-Akpor", "Eleme"],
    "Oyo": ["Ibadan", "Ogbomoso", "Iseyin"],
    "Kano": ["Kano", "Nassarawa", "Fagge"],
    "Delta": ["Asaba", "Warri", "Sapele"],
    "Enugu": ["Enugu", "Nsukka", "Agbani"],
    "Kaduna": ["Kaduna", "Zaria"],
    "Edo": ["Benin", "Auchi"],
    "Imo": ["Owerri", "Orlu"],
    "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene"],
    "Cross River": ["Calabar", "Ogoja"],
    "Anambra": ["Awka", "Onitsha", "Nnewi"],
    "Plateau": ["Jos", "Bukuru"]
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setIsDriver(data.isDriver || false);

          if (data.state) setDriverState(data.state);
          if (data.city) setDriverCity(data.city);

          if (!data.state || !data.city) {
            const locationStr = (data.location || "").toLowerCase();
            Object.keys(nigeriaLocations).forEach(state => {
              if (locationStr.includes(state.toLowerCase())) {
                setDriverState(state);
                const cities = nigeriaLocations[state as keyof typeof nigeriaLocations];
                cities.forEach(city => {
                  if (locationStr.includes(city.toLowerCase())) {
                    setDriverCity(city);
                  }
                });
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchUserRequestCount = async () => {
      try {
        const requestsRef = collection(db, "bookingRequests");
        const q = query(
          requestsRef,
          where("userId", "==", userId),
          where("status", "==", "active")
        );
        const snapshot = await getDocs(q);
        const count = snapshot.size;
        setUserRequestCount(count);

        if (count >= 3) {
          const warningMessage = "You have reached the maximum of 3 active requests. Please delete one to create a new request.";
          const lastWarning = localStorage.getItem('requestLimitWarning');
          const now = Date.now();

          if (!lastWarning || (now - parseInt(lastWarning)) > 30000) {
            toast.error(warningMessage, {
              duration: 6000,
              icon: '⚠️'
            });
            localStorage.setItem('requestLimitWarning', now.toString());
          }
        }
      } catch (error) {
        console.error("Error fetching user request count:", error);
      }
    };
    fetchUserRequestCount();
  }, [userId, requests]);

  const checkLocationMatch = (request: BookingRequestType, driverState: string, driverCity: string) => {
    if (!driverState && !driverCity) return false;

    const requestState = (request.state || "").toLowerCase();
    const requestCity = (request.city || "").toLowerCase();
    const requestLocation = (request.location || "").toLowerCase();

    const driverStateLower = driverState.toLowerCase();
    const driverCityLower = driverCity.toLowerCase();

    if (driverState && requestState.includes(driverStateLower)) return true;
    if (driverCity && requestCity.includes(driverCityLower)) return true;
    if (driverState && requestLocation.includes(driverStateLower)) return true;
    if (driverCity && requestLocation.includes(driverCityLower)) return true;

    for (const [state, cities] of Object.entries(nigeriaLocations)) {
      if (driverStateLower.includes(state.toLowerCase())) {
        const stateCities = cities.map(c => c.toLowerCase());
        if (stateCities.some(city => requestLocation.includes(city) || requestCity.includes(city))) {
          return true;
        }
      }
    }

    return false;
  };

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const requestsRef = collection(db, "bookingRequests");
      let q;
      
      // Enforce the new Firestore rules: Customers MUST explicitly query only by their userId
      if (!isDriver) {
        if (filter === "urgent") {
          q = query(requestsRef, where("userId", "==", userId), where("status", "==", "active"), where("urgent", "==", true));
        } else {
          q = query(requestsRef, where("userId", "==", userId), where("status", "==", "active"));
        }
      } else {
        // Drivers are authorized by Security Rules to view all active requests
        if (filter === "urgent") {
          q = query(requestsRef, where("status", "==", "active"), where("urgent", "==", true));
        } else {
          q = query(requestsRef, where("status", "==", "active"));
        }
      }

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          const requestsList: BookingRequestType[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            requestsList.push({
              id: doc.id,
              ...data,
              offers: data.offers || []
            } as BookingRequestType);
          });

          const sortedRequests = requestsList.sort((a, b) => {
            const vipA = (a as any).vipLevel || 0;
            const vipB = (b as any).vipLevel || 0;
            if (vipB !== vipA) {
              return vipB - vipA;
            }
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });

          let filtered = sortedRequests;

          if (filter === "urgent") {
            filtered = filtered.filter(req => req.urgent);
          }

          if (filter === "nearby" && isDriver) {
            filtered = filtered.filter(request =>
              checkLocationMatch(request, driverState, driverCity)
            );
          }

          setRequests(filtered);
          setLoading(false);
        },
        (error) => {
          console.error("Firestore error:", error);
          setError(`Error loading requests: ${error.message}`);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error: any) {
      console.error("Error setting up query:", error);
      setError(`Error: ${error.message}`);
      setLoading(false);
    }
  }, [filter, driverState, driverCity, isDriver, userId]);

  const getStats = () => {
    const active = requests.filter(r => r.status === "active").length;
    const urgent = requests.filter(r => r.urgent).length;
    const today = new Date().toISOString().split("T")[0];
    const todayRequests = requests.filter(r => r.startDate === today).length;

    return { active, urgent, todayRequests };
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    const deleteToast = toast.loading("Deleting request...");

    try {
      await deleteDoc(doc(db, "bookingRequests", requestId));
      toast.success("Request deleted successfully!", { id: deleteToast });

      if (onNotificationUpdate) onNotificationUpdate();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request", { id: deleteToast });
    }
  };

  const handleMessageIconClick = (request: BookingRequestType) => {
    // Clear any existing timer
    if (popupTimer) {
      clearTimeout(popupTimer);
      setPopupTimer(null);
    }

    // Toggle expanded offers section
    setExpandedRequestId(expandedRequestId === request.id ? null : request.id);

    // If customer clicked to view their offers, update notification badge
    if (!isDriver && userId && request.userId === userId && request.offers?.length > 0) {
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }

      // For customers, also trigger the callback to mark offers as viewed
      if (onCustomerViewedOffers) {
        onCustomerViewedOffers();
      }
    }
  };

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (popupTimer) {
        clearTimeout(popupTimer);
      }
    };
  }, [popupTimer]);

  const handleDeleteOffer = async (requestId: string, offerIndex: number) => {
    const deleteToast = toast.loading("Removing offer...");

    try {
      const requestRef = doc(db, "bookingRequests", requestId);
      const request = requests.find(r => r.id === requestId);

      if (request) {
        const updatedOffers = [...request.offers];
        updatedOffers.splice(offerIndex, 1);

        await updateDoc(requestRef, { offers: updatedOffers });
        toast.success("Offer removed successfully!", { id: deleteToast });

        if (onNotificationUpdate) onNotificationUpdate();
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to remove offer", { id: deleteToast });
    }
  };

  const handleContactUser = async (request: BookingRequestType) => {
    if (!isDriver) {
      toast.error("Only drivers can make offers");
      return;
    }

    if (userId === request.userId) {
      toast.error("You cannot make offers on your own request");
      return;
    }

    try {
      const requestRef = doc(db, "bookingRequests", request.id);
      await updateDoc(requestRef, { views: increment(1) });
    } catch (error) {
      console.error("Error incrementing views:", error);
    }

    const existingOfferIndex = request.offers?.findIndex(offer => offer.driverId === userId) ?? -1;

    if (existingOfferIndex !== -1) {
      const existingOffer = request.offers[existingOfferIndex];
      toast.error(
        <div>
          You already made an offer on this request<br />
          <button
            onClick={() => {
              handleDeleteOffer(request.id, existingOfferIndex);
              setTimeout(() => {
                setSelectedRequest(request);
                setContactForm({
                  carMake: existingOffer.carMake || "",
                  hasAC: existingOffer.hasAC,
                  price: existingOffer.price,
                  message: existingOffer.message,
                  agreeTerms: true
                });
                setShowContactModal(true);
              }, 1000);
            }}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Delete current offer to make a new one
          </button>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    setSelectedRequest(request);
    setContactForm({
      carMake: "",
      hasAC: true,
      price: request.budget || "",
      message: "",
      agreeTerms: false
    });
    setShowContactModal(true);
  };

  const handleEditRequest = (request: BookingRequestType) => {
    if (userId !== request.userId) {
      toast.error("You can only edit your own requests");
      return;
    }

    setSelectedRequest(request);
    setEditForm({
      carType: request.carType,
      budget: request.budget,
      location: request.location,
      startDate: request.startDate,
      endDate: request.endDate,
      passengers: request.passengers,
      tripType: request.tripType,
      description: request.description || "",
      negotiable: request.negotiable,
      urgent: request.urgent,
      isSameCity: request.isSameCity || true,
      destination: request.destination || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest || !userId) return;

    const updateToast = toast.loading("Updating request...");

    try {
      const requestRef = doc(db, "bookingRequests", selectedRequest.id);
      const updateData: any = {
        carType: editForm.carType,
        budget: editForm.budget,
        location: editForm.location,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        passengers: editForm.passengers,
        tripType: editForm.tripType,
        description: editForm.description,
        negotiable: editForm.negotiable,
        urgent: editForm.urgent,
        updatedAt: Timestamp.now()
      };

      // Add isSameCity and destination if they exist
      if (editForm.isSameCity !== undefined) {
        updateData.isSameCity = editForm.isSameCity;
      }
      if (editForm.destination) {
        updateData.destination = editForm.destination;
      }

      await updateDoc(requestRef, updateData);

      toast.success("Request updated successfully!", { id: updateToast });
      setShowEditModal(false);

      if (onNotificationUpdate) onNotificationUpdate();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request", { id: updateToast });
    }
  };

  const handleSubmitOffer = async () => {
    if (!selectedRequest || !userId) return;

    if (!contactForm.price.trim()) {
      toast.error("Please enter your price offer");
      return;
    }

    if (!contactForm.carMake.trim()) {
      toast.error("Please enter your car make/model");
      return;
    }

    if (!contactForm.agreeTerms) {
      toast.error("Please agree to the terms");
      return;
    }

    const submitToast = toast.loading("Submitting your offer...");

    try {
      let driverName = userName;
      let driverPhone = "";

      try {
        const driverDoc = await getDoc(doc(db, "users", userId));
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          driverName = `${driverData.firstName} ${driverData.lastName}` || "Unknown";
          driverPhone = driverData.phoneNumber || "";
        }
      } catch (error) {
        console.error("Error fetching driver details:", error);
      }

      const newOffer: OfferType = {
        driverId: userId,
        driverName: driverName,
        driverPhone: driverPhone,
        carMake: contactForm.carMake,
        hasAC: contactForm.hasAC,
        price: contactForm.price,
        message: contactForm.message,
        status: "pending",
        createdAt: Timestamp.now()
      };

      const requestRef = doc(db, "bookingRequests", selectedRequest.id);
      const updatedOffers = [...(selectedRequest.offers || []), newOffer];
      await updateDoc(requestRef, { offers: updatedOffers });

      toast.success("Offer submitted successfully!", { id: submitToast });
      setShowContactModal(false);
      setContactForm({
        carMake: "",
        hasAC: true,
        price: "",
        message: "",
        agreeTerms: false
      });

      if (onNotificationUpdate) onNotificationUpdate();

    } catch (error) {
      console.error("Error submitting offer:", error);
      toast.error("Failed to submit offer", { id: submitToast });
    }
  };

  const handleWhatsAppContact = (phoneNumber: string, driverName: string, price: string) => {
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('234') && formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 10) {
      formattedPhone = '234' + formattedPhone;
    }

    const message = `Hi ${driverName}, I'm interested in your offer of ₦${price} for my car request.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleChatDriver = async (otherUserId: string, otherUserName: string, request?: BookingRequestType) => {
    if (!userId) {
      toast.error("You must be logged in to chat");
      return;
    }

    try {
      const chatId = [userId, otherUserId].sort().join('_');
      const chatRef = doc(db, "preChats", chatId);
      const chatDoc = await getDoc(chatRef);

      const carInfo = request ? {
        id: request.id,
        title: `${request.carType} - ${request.location}`,
        carType: request.carType,
        location: request.location,
        budget: request.budget
      } : {
        id: 'general',
        title: 'Car Rental Request',
        carType: 'General',
        location: 'Unknown',
        budget: '0'
      };

      const driverInfo = {
        id: otherUserId,
        name: otherUserName,
        phone: '',
      };

      const currentUserName = userData.fullName || userName || "User";

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [userId, otherUserId],
          participantNames: {
            [userId]: currentUserName,
            [otherUserId]: otherUserName
          },
          carInfo: carInfo,
          lastActivity: Timestamp.now(),
          messages: [],
          createdAt: Timestamp.now()
        });
      } else {
        await updateDoc(chatRef, {
          participantNames: {
            [userId]: currentUserName,
            [otherUserId]: otherUserName
          },
          carInfo: carInfo,
          lastActivity: Timestamp.now()
        });
      }

      setActiveChat({
        show: true,
        chatId,
        car: carInfo,
        driver: driverInfo
      });

    } catch (error) {
      console.error("Error opening chat:", error);
      toast.error("Failed to open chat");
    }
  };

  const hasUserMadeOffer = (request: BookingRequestType) => {
    if (!userId) return false;
    return request.offers?.some(offer => offer.driverId === userId) || false;
  };

  const getUserOffer = (request: BookingRequestType) => {
    if (!userId) return null;
    return request.offers?.find(offer => offer.driverId === userId) || null;
  };

  const stats = getStats();

  const MaxRequestsWarning = () => {
    if (userRequestCount >= 3) {
      return (
        <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-1">Maximum Requests Reached</h4>
              <p className="text-sm text-red-700">
                You have {userRequestCount} active requests (maximum is 3). Delete one to create a new request.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Requests</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="w-full">
        <MaxRequestsWarning />
      </div>

      {/* Header - Responsive Fix */}
      <div className="w-full bg-white shadow-sm p-3 md:px-6 mb-8">
        <div className="flex flex-col justify-center md:justify-between items-center md:flex-row gap-4 text-center md:text-left">
          <div>
            <h1 className="font-bold text-gray-900">Booking Requests</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="text-xs flex items-center gap-1">
                <Car className="w-4 h-4" />
                {stats.active} active
              </span>
              <span className="text-xs flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                {stats.urgent} urgent
              </span>
              <span className="text-xs flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {stats.todayRequests} today
              </span>
              {filter === "nearby" && isDriver && (driverState || driverCity) && (
                <span className="text-xs flex items-center gap-1 text-green-600">
                  <Navigation className="w-4 h-4" />
                  {driverCity ? `${driverCity}, ${driverState}` : driverState}
                </span>
              )}
            </div>
          </div>

          {/* Filter Buttons - Responsive Stack */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("urgent")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm  ${filter === "urgent"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Urgent</span>
              <span className="sm:hidden">Urg</span>
            </button>
            {isDriver && (
              <button
                onClick={() => setFilter("nearby")}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${filter === "nearby"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Nearby</span>
                <span className="sm:hidden">Near</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.length === 0 ? (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-gray-900 rounded-xl shadow-sm border border-gray-700">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No requests found</h3>
            <p className="text-gray-500 mb-4">
              {filter !== "all"
                ? `No ${filter} requests available`
                : "No requests to display"}
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="text-blue-500 font-medium hover:underline"
              >
                View all requests
              </button>
            )}
          </div>
        ) : (
          requests.map((request) => {
            const userHasMadeOffer = hasUserMadeOffer(request);
            const userOffer = getUserOffer(request);

            // Parse trip type and determine if it's same city
            const [tripCategory, tripPurpose] = request.tripType?.split(':') || ['city', ''];
            const isSameCity = tripCategory === 'city' || request.isSameCity === true;
            const destination = request.destination || request.location;

            return (
              <div
                key={request.id}
                onClick={() => {
                  setViewingRequest(request);
                }}
                className="w-full relative overflow-hidden bg-[#1E1B4B] bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-lg border border-purple-500/30 hover:border-purple-400 hover:shadow-purple-500/30 transition-all cursor-pointer p-3 sm:p-4 group"
              >
                {/* Premium Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

                <div className="relative z-10 flex flex-col gap-2">
                  {/* Location */}
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span className="truncate">
                      {isSameCity ? `Within ${request.location}` : `${request.location} → ${destination}`}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {request.urgent && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] sm:text-[10px] font-bold rounded flex items-center gap-1 leading-none border border-orange-500/30">
                        URGENT
                      </span>
                    )}
                    {request.negotiable && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-bold rounded leading-none border border-blue-500/30">
                        NEGOTIABLE
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-white/10 text-gray-200 text-[9px] sm:text-[10px] font-bold rounded uppercase leading-none border border-white/20">
                      {request.tripType?.split(':')[0] || 'Ride'}
                    </span>
                  </div>

                  {/* Vehicle Icon & Car Type */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-white/10 p-1.5 rounded-md border border-white/20 text-purple-300">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">
                      {request.carType}
                    </h3>
                  </div>

                  {/* Price / Budget */}
                  <div className="text-yellow-400 text-lg sm:text-xl font-black mt-1 drop-shadow-md">
                    ₦{parseInt(request.budget || "0").toLocaleString()}
                  </div>

                  {/* xs Date, Offers, Views */}
                  <div className="flex items-center justify-between text-[10px] text-gray-300 mt-1 border-t border-purple-500/30 pt-2 pb-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-purple-400" /> {formatDate(request.startDate)}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 font-medium text-gray-400">
                        <Eye className="w-3 h-3" /> {request.views || 0}
                      </span>
                      <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded ${request.offers?.length ? 'bg-purple-500/30 text-white font-bold' : 'bg-black/20 text-gray-400'}`}>
                        <MessageCircle className="w-3 h-3" /> {request.offers?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
      </div>

      {/* Viewing Details Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col relative border border-gray-700 animate-fadeIn">
            <div className="p-4 flex justify-between items-center border-b border-gray-800 shrink-0 bg-gray-900 sticky top-0 z-10 w-full">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-500" />
                Request Details
              </h3>
              <button
                onClick={() => {
                  setViewingRequest(null);
                  setExpandedRequestId(null);
                }}
                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto w-full">
              {(() => {
                const request = viewingRequest;
                const userHasMadeOffer = hasUserMadeOffer(request);
                const userOffer = getUserOffer(request);
                const [tripCategory, tripPurpose] = request.tripType?.split(':') || ['city', ''];
                const isSameCity = tripCategory === 'city' || request.isSameCity === true;
                const destination = request.destination || request.location;

                return (
                  <div className="w-full">
                    {/* Inner Card Content Base from original */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3">
                            <div className="bg-emerald-500/10 p-2 sm:p-2.5 rounded-xl self-start border border-emerald-500/20">
                              <Car className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                            </div>
                            <div className="flex-1 w-full">
                              <div className="flex flex-col pb-2 sm:flex-row sm:items-center gap-2 mb-1">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-100 border-b border-gray-800 sm:border-0">{request.carType}</h3>
                                <div className="pt-1 flex flex-wrap gap-2">
                                  {request.urgent && (
                                    <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold rounded-md flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Urgent
                                    </span>
                                  )}
                                  {request.negotiable && (
                                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-md">
                                      Negotiable
                                    </span>
                                  )}
                                  {/* Trip Type Badge */}
                                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${isSameCity
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    }`}>
                                    {isSameCity ? 'City Ride' : 'Intercity'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between md:items-center md:justify-start gap-3 text-gray-50 text-sm">
                                <span className="font-medium text-gray-300 truncate">{request.userName}</span>
                                <span className="hidden sm:inline text-gray-700">•</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                                  <div className="truncate">
                                    {isSameCity ? (
                                      <span className="text-gray-300">{request.location}</span>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-gray-300">{request.location}</span>
                                        <span className="text-gray-500 text-[10px]">TO</span>
                                        <span className="text-emerald-400 font-medium">{destination}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2-Column Grid for Information */}
                          <div className="grid grid-cols-2 gap-3 mt-5 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date</span>
                              <span className="text-sm font-semibold text-gray-200">
                                {formatDate(request.startDate)} {request.endDate > request.startDate && `- ${formatDate(request.endDate)}`}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Passengers</span>
                              <span className="text-sm font-semibold text-gray-200">{request.passengers}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Trip Type</span>
                              <span className="text-sm font-semibold text-gray-200 capitalize">{request.tripType?.split(':')[0]}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500">Budget Limit</span>
                              <span className="text-base font-black text-emerald-400">
                                ₦{parseInt(request.budget || "0").toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons - Stack on Mobile */}
                        <div className="flex flex-col items-stretch sm:items-end gap-2">
                          {userId === request.userId && (
                            <div className="flex flex-col xs:flex-row gap-2">
                              <button
                                onClick={() => handleEditRequest(request)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                              >
                                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Edit</span>
                                <span className="xs:hidden">Edit Request</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRequest(request.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Delete</span>
                                <span className="xs:hidden">Delete Request</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trip Purpose Display */}
                      {tripPurpose && (
                        <div className="mt-3 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Trip Purpose:</span>
                            <span className="text-sm font-medium text-gray-300 capitalize">
                              {tripPurpose.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {request.description && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-700 text-sm sm:text-base">{request.description}</p>
                        </div>
                      )}

                      {/* User's Offer Status (for drivers) */}
                      {isDriver && userId !== request.userId && userHasMadeOffer && userOffer && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="w-full">
                              <p className="font-medium text-blue-900">Your Offer</p>

                              <p className="flex gap-4 items-center text-xs sm:text-sm text-blue-700">
                                <span>• ₦{parseInt(userOffer.price).toLocaleString()}</span>
                                <span>• Status: <span className="font-medium capitalize">{userOffer.status}</span></span>
                              </p>
                              <p className="flex gap-4 items-center text-xs sm:text-sm text-blue-700">
                                <span>• Car: {userOffer.carMake || "Not specified"}</span>
                                <span>• AC: {userOffer.hasAC ? 'Yes' : 'No'}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteOffer(request.id, request.offers.findIndex(o => o.driverId === userId))}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm whitespace-nowrap"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              Remove Offer
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 pt-4 border-t border-gray-700">
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-50">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            {request.views || 0} views
                          </span>

                          <button
                            onClick={() => handleMessageIconClick(request)}
                            className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer text-blue-500"
                          >
                            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            {request.offers?.length || 0} offers
                            {userHasMadeOffer && (
                              <span className="hidden sm:inline text-gray-300"> • Your offer included</span>
                            )}
                          </button>

                          <span className="text-xs text-gray-400">
                            Posted {(() => {
                              const date = request.createdAt?.toDate?.() || new Date(request.createdAt);
                              const now = new Date();
                              const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

                              if (diffHours < 1) return "just now";
                              if (diffHours < 24) return `${diffHours}h ago`;
                              return date.toLocaleDateString();
                            })()}
                          </span>
                        </div>

                        {/* Action Button - Right Side */}
                        {isDriver && userId !== request.userId ? (
                          userHasMadeOffer ? (
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  const existingOfferIndex = request.offers.findIndex(o => o.driverId === userId);
                                  if (existingOfferIndex !== -1) {
                                    const existingOffer = request.offers[existingOfferIndex];
                                    setSelectedRequest(request);
                                    setContactForm({
                                      carMake: existingOffer.carMake || "",
                                      hasAC: existingOffer.hasAC,
                                      price: existingOffer.price,
                                      message: existingOffer.message,
                                      agreeTerms: true
                                    });
                                    setShowContactModal(true);
                                  }
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                              >
                                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                Edit Offer
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleContactUser(request)}
                              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-bold text-sm sm:text-base z-20"
                            >
                              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              Make Offer
                            </button>
                          )
                        ) : userId === request.userId ? (
                          <div className="text-sm text-gray-400">Your request</div>
                        ) : null}
                      </div>

                      {/* Offers Section - Expandable */}
                      {expandedRequestId === request.id && (
                        <div className="mx-auto mt-4 border border-gray-700 rounded-xl px-2 sm:px-5 py-4 bg-gray-800">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-white flex items-center gap-2 text-sm sm:text-base">
                              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                              Offers Received ({request.offers?.length || 0})
                            </h4>
                            <button
                              onClick={() => setExpandedRequestId(null)}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {(!request.offers || request.offers.length === 0) ? (
                            <div className="text-center py-6">
                              <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
                              <p className="text-gray-400">No offers yet</p>
                              <p className="text-xs sm:text-sm text-gray-500 mt-1">Drivers will appear here when they make offers</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {request.offers.map((offer, index) => {
                                const isUsersOffer = offer.driverId === userId;
                                const isRequestOwner = request.userId === userId;

                                return (
                                  <div key={index} className={`bg-gray-700 border rounded-lg p-3 sm:p-4 hover:border-gray-500 transition-colors ${isUsersOffer ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'}`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start mb-3 gap-3">
                                      <div className="w-full flex-1">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-semibold text-white text-sm sm:text-base truncate">
                                            {offer.driverName}
                                            {isUsersOffer && (
                                              <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded whitespace-nowrap">
                                                Your Offer
                                              </span>
                                            )}
                                          </h5>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-300 flex items-center gap-1 mt-1">
                                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                          <span className="truncate">{offer.driverPhone}</span>
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg sm:text-xl font-bold text-green-400">
                                          ₦{parseInt(offer.price).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`px-2 py-1 text-xs rounded-full ${offer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                            offer.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                                              'bg-red-500/20 text-red-300'
                                            }`}>
                                            {offer.status}
                                          </span>

                                          {(isUsersOffer || isRequestOwner) && (
                                            <button
                                              onClick={() => handleDeleteOffer(request.id, index)}
                                              className="text-red-400 hover:text-red-300 transition-colors"
                                              title={isUsersOffer ? "Remove your offer" : "Remove this offer"}
                                            >
                                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Driver's Car Make Information */}
                                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
                                      <div className="text-xs sm:text-sm">
                                        <span className="text-gray-400">Driver's Car:</span>
                                        <span className="ml-2 font-medium text-gray-200 truncate block">
                                          {offer.carMake || "Not specified"}
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm">
                                        <span className="text-gray-400">AC Available:</span>
                                        <span className={`ml-2 ${offer.hasAC ? 'text-green-400' : 'text-red-400'}`}>
                                          {offer.hasAC ? 'Yes ✓' : 'No ✗'}
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm">
                                        <span className="text-gray-400">Car Requested:</span>
                                        <span className="ml-2 font-medium text-gray-200 truncate block">{request.carType}</span>
                                      </div>
                                      <div className="text-xs sm:text-sm">
                                        <span className="text-gray-400">Trip Type:</span>
                                        <span className="ml-2 font-medium text-gray-200 truncate block">{request.tripType}</span>
                                      </div>
                                    </div>

                                    {offer.message && (
                                      <div className={`break-words mb-3 p-2 rounded text-xs sm:text-sm ${isUsersOffer ? 'bg-blue-900/40 text-blue-100' : 'bg-gray-800 text-gray-300'}`}>
                                        <p>{offer.message}</p>
                                      </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                      <span className="text-xs text-gray-400">
                                        Offered {offer.createdAt?.toDate?.().toLocaleDateString() || 'recently'}
                                      </span>
                                      {/* Show WhatsApp and Chat buttons for request owner OR driver who made the offer */}
                                      {(isRequestOwner || isUsersOffer) && (
                                        <div className="flex flex-wrap gap-2">
                                          {isRequestOwner && (
                                            <>
                                              <button
                                                onClick={() => handleWhatsAppContact(offer.driverPhone, offer.driverName, offer.price)}
                                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 text-xs sm:text-sm"
                                              >
                                                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                                WhatsApp
                                              </button>
                                              <button
                                                onClick={() => handleChatDriver(offer.driverId, offer.driverName, request)}
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-xs sm:text-sm"
                                              >
                                                <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                                                Chat
                                              </button>
                                            </>
                                          )}
                                          {isUsersOffer && (
                                            <button
                                              onClick={() => handleChatDriver(request.userId, request.userName, request)}
                                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-xs sm:text-sm"
                                            >
                                              <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                                              Chat Requester
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Driver Contact Modal Customer Form */}
      {showContactModal && selectedRequest && userData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-[60] backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-gray-700 animate-fadeIn">
            <div className="p-4 sm:p-5 flex-shrink-0 border-b border-gray-800 bg-gray-900 rounded-t-xl sticky top-0 z-10 w-full">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg sm:text-lg font-bold text-white flex items-center gap-2"><Car className="w-5 h-5 text-emerald-500" /> Make an Offer</h3>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
                    You're offering for: <span className="font-medium text-gray-200">{selectedRequest.carType}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-5 w-full">
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-800/60 border border-gray-700 rounded-lg">
                <p className="font-medium text-emerald-400 text-sm">Your Details</p>
                <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-300">
                  <p><span className="text-gray-500">Name:</span> {userData.fullName || userName}</p>
                  <p><span className="text-gray-500">Phone:</span> {userData.phoneNumber || "Not provided"}</p>
                  <p><span className="text-gray-500">Location:</span> {userData.city ? `${userData.city}, ${userData.state}` : userData.state || "Unknown"}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">This info will be safely shared with the requester</p>
                </div>
              </div>

              <div className="space-y-4 pb-2">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                    Your Car Make/Model *
                  </label>
                  <input
                    type="text"
                    value={contactForm.carMake}
                    onChange={(e) => setContactForm({ ...contactForm, carMake: e.target.value })}
                    className="w-full px-3 py-2 sm:py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-500"
                    placeholder="e.g., Toyota Camry, Honda Accord"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                    Your Offer Price (₦) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">₦</span>
                    <input
                      type="number"
                      value={contactForm.price}
                      onChange={(e) => setContactForm({ ...contactForm, price: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 sm:py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-500 font-medium tracking-wide"
                      placeholder="Enter price"
                      required
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-emerald-500 mt-1.5 font-medium">
                    Requested budget block: ₦{parseInt(selectedRequest.budget || "0").toLocaleString()}
                  </p>
                </div>

                <div className="flex items-start mt-2">
                  <input
                    type="checkbox"
                    id="hasAC"
                    checked={contactForm.hasAC}
                    onChange={(e) => setContactForm({ ...contactForm, hasAC: e.target.checked })}
                    className="h-4 w-4 bg-gray-800 text-emerald-500 rounded border-gray-600 mt-0.5 focus:ring-emerald-500"
                  />
                  <label htmlFor="hasAC" className="ml-2.5 text-gray-300">
                    <span className="font-medium text-sm">Air Conditioning</span>
                    <p className="text-[10px] sm:text-xs text-gray-500">I have a heavily functional AC system.</p>
                  </label>
                </div>

                <div className="pt-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                    Message (Optional)
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-500"
                    rows={2}
                    placeholder="Short message to hook the requester..."
                  />
                </div>

                <div className="flex items-start bg-gray-800/40 p-3 rounded-lg border border-gray-700/50 mt-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={contactForm.agreeTerms}
                    onChange={(e) => setContactForm({ ...contactForm, agreeTerms: e.target.checked })}
                    className="h-4 w-4 bg-gray-800 text-emerald-500 rounded border-gray-600 mt-0.5 focus:ring-emerald-500"
                    required
                  />
                  <label htmlFor="agreeTerms" className="ml-2.5 text-gray-300">
                    <span className="font-medium text-xs sm:text-sm">I agree to terms</span>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                      I guarantee that I am immediately available for this trip.
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-xl flex-shrink-0 w-full">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitOffer}
                  disabled={!contactForm.agreeTerms || !contactForm.price || !contactForm.carMake}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:border disabled:border-gray-600 disabled:cursor-not-allowed transition-colors text-sm font-bold shadow-md shadow-emerald-500/20"
                >
                  Confirm Offer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Edit Request Modal Form  */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[40rem] max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Request</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Car Type *
                  </label>
                  <input
                    type="text"
                    value={editForm.carType}
                    onChange={(e) => setEditForm({ ...editForm, carType: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    placeholder="e.g., Toyota Camry, SUV, etc."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget (₦) *
                    </label>
                    <input
                      type="number"
                      value={editForm.budget}
                      onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passengers *
                    </label>
                    <input
                      type="number"
                      value={editForm.passengers}
                      onChange={(e) => setEditForm({ ...editForm, passengers: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <select
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    >
                      <option value="">Select State</option>
                      {Object.keys(nigeriaLocations).map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      placeholder="Enter your city"
                      required
                    />
                  </div>
                </div>

                {/* Same City Radio Buttons for Editing */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Is this trip within the same city?
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="editSameCityYes"
                        name="editSameCity"
                        checked={editForm.isSameCity}
                        onChange={() => setEditForm({ ...editForm, isSameCity: true })}
                        className="h-5 w-5 text-green-500"
                      />
                      <label htmlFor="editSameCityYes" className="ml-2 text-sm text-gray-700 cursor-pointer">
                        <span className="font-medium text-green-600">City Ride</span> - Within same city
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="editSameCityNo"
                        name="editSameCity"
                        checked={!editForm.isSameCity}
                        onChange={() => setEditForm({ ...editForm, isSameCity: false })}
                        className="h-5 w-5 text-blue-500"
                      />
                      <label htmlFor="editSameCityNo" className="ml-2 text-sm text-gray-700 cursor-pointer">
                        <span className="font-medium text-blue-600">Intercity Trip</span> - To another city
                      </label>
                    </div>
                  </div>

                  {/* Destination Input for Editing */}
                  {!editForm.isSameCity && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-fadeIn">
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        🚗 Destination City *
                      </label>
                      <input
                        type="text"
                        value={editForm.destination}
                        onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                        required={!editForm.isSameCity}
                        placeholder="e.g., Abuja, Ibadan, Port Harcourt"
                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      />
                      <p className="text-xs text-blue-600 mt-2">
                        <span className="font-medium">Route:</span> {editForm.location} → {editForm.destination || "[Destination]"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Purpose *
                  </label>
                  <select
                    value={editForm.tripType}
                    onChange={(e) => setEditForm({ ...editForm, tripType: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    required
                  >
                    <option value="">Select trip purpose...</option>
                    <option value="Quick Drop">Quick Drop Within City</option>
                    <option value="Airport">Airport Pickup/Drop-off</option>
                    <option value="Wedding/Event">Wedding/Event</option>
                    <option value="Monthly">Monthly Rental</option>
                    <option value="Tourism">Tourism/Sightseeing</option>
                    <option value="Custom">Custom Trip</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    rows={3}
                    placeholder="Add any additional details..."
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editNegotiable"
                      checked={editForm.negotiable}
                      onChange={(e) => setEditForm({ ...editForm, negotiable: e.target.checked })}
                      className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="editNegotiable" className="ml-3 text-gray-700">
                      <span className="font-medium text-sm sm:text-base">Budget is Negotiable</span>
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editUrgent"
                      checked={editForm.urgent}
                      onChange={(e) => setEditForm({ ...editForm, urgent: e.target.checked })}
                      className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 rounded border-gray-300"
                    />
                    <label htmlFor="editUrgent" className="ml-3 text-gray-700">
                      <span className="font-medium text-sm sm:text-base">Urgent Request</span>
                      <p className="text-xs sm:text-sm text-gray-500">This request needs immediate attention</p>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRequest}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
                >
                  Update Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window Component */}
      {activeChat.show && activeChat.chatId && activeChat.car && activeChat.driver && (
        <ChatWindow
          chatId={activeChat.chatId}
          car={activeChat.car}
          driver={activeChat.driver}
          onClose={() => setActiveChat({ show: false })}
        />
      )}

      {/* Tip for Drivers & passengers */}
      {isDriver && (
        <div className="mx-2 mt-6 md:mt-8 md:mx-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg self-start">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Tips for Drivers</h4>
              <ul className="space-y-2 text-gray-700 text-xs sm:text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Nearby Filter:</strong> Shows requests matching your location: {driverCity ? `${driverCity}, ${driverState}` : driverState || "Set your location in profile"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Views increase when you click "Make Offer" - even if you don't submit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>You can only make one offer per request. Delete your current offer to make a new one.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}