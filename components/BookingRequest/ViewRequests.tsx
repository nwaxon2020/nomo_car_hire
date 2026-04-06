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
  setDoc,
  writeBatch,
} from "firebase/firestore";
import toast from 'react-hot-toast';
import { X, Check, Phone, Car, Calendar, Users, MapPin, MessageCircle, AlertCircle, Trash2, Edit2, Send, Eye, Navigation, Crown } from 'lucide-react';
import ChatWindow from "../PreChat/chat-window";
import CustomerRequests from "./CustomerRequests";
import DriverRequests from "./DriverRequests";

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
  hasNewBid?: boolean;
  userHasMadeOffer?: boolean;
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
  read?: boolean;
  vehicleId?: string;
  vehicleDetails?: any;
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

// Standalone Offer Card Component
function OfferCard({
  request,
  userId,
  userName,
  isDriverView = false,
  onClose,
  onDeleteOffer,
  onMarkAsRead,
  onMarkAllRead,
  onWhatsAppContact,
  onChatDriver,
  onViewVehiclePreview
}: {
  request: BookingRequestType;
  userId?: string;
  userName?: string;
  isDriverView?: boolean;
  onClose: () => void;
  onDeleteOffer: (requestId: string, offerIndex: number) => void;
  onMarkAsRead: (requestId: string, offerIndex: number) => void;
  onMarkAllRead: (requestId: string) => void;
  onWhatsAppContact: (phoneNumber: string, driverName: string, price: string) => void;
  onChatDriver: (otherUserId: string, otherUserName: string, request?: BookingRequestType) => void;
  onViewVehiclePreview: (vehicle: any) => void;
}) {
  const isRequestOwner = request.userId === userId;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ offerIndex: number, driverName: string } | null>(null);

  // Filter offers based on user type
  let displayOffers = request.offers || [];
  if (isDriverView && userId) {
    // Drivers only see their own offers
    displayOffers = displayOffers.filter(offer => offer.driverId === userId);
  }

  return (
    <div className="h-[100vh] fixed inset-0 bg-black/70 flex items-center justify-center p-2 md:p-4 z-[100] backdrop-blur-md">
      <div className="bg-gray-900 rounded md:rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700 animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/95 rounded-t-2xl sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              {isDriverView ? "Your Offer" : `Offers for ${request.carType}`}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {request.location} • {request.startDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Offers List */}
        <div className="flex-1 overflow-y-auto p-5">
          {displayOffers.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {isDriverView ? "You haven't made an offer on this request yet" : "No offers yet"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {isDriverView ? "Click 'Make Offer' to submit your bid" : "Check back later for driver offers"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mark All Read Button - Only for customers */}
              {!isDriverView && (request.offers || []).some((o: any) => o.read === false && isRequestOwner) && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => onMarkAllRead(request.id)}
                    className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full hover:bg-green-500/30 transition-all font-bold uppercase tracking-wider"
                  >
                    Mark All Read
                  </button>
                </div>
              )}

              {displayOffers.map((offer, index) => {
                const isUsersOffer = offer.driverId === userId;
                const isUnread = offer.read === false && isRequestOwner && !isDriverView;
                const originalIndex = request.offers?.findIndex(o => o.driverId === offer.driverId) || index;

                return (
                  <div
                    key={index}
                    className={`bg-gray-800/80 border rounded-xl p-5 transition-all ${isUsersOffer ? 'border-blue-500 bg-blue-900/20' :
                      isUnread ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                        'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-lg">
                            {offer.driverName}
                          </h4>
                          {isUsersOffer && (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                              Your Offer
                            </span>
                          )}
                          {isUnread && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full animate-pulse border border-green-500/30">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{offer.driverPhone}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-green-400">
                          ₦{parseInt(offer.price).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${offer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            offer.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                              'bg-red-500/20 text-red-300'
                            }`}>
                            {offer.status}
                          </span>
                          {(isUsersOffer || isRequestOwner) && !isDriverView && (
                            <button
                              onClick={() => setShowDeleteConfirm({ offerIndex: originalIndex, driverName: offer.driverName })}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title={isUsersOffer ? "Remove your offer" : "Remove this offer"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {isUsersOffer && isDriverView && (
                            <button
                              onClick={() => setShowDeleteConfirm({ offerIndex: originalIndex, driverName: offer.driverName })}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Remove your offer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-900/50 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-500">Car</span>
                        <p className="text-sm font-medium text-gray-200">{offer.carMake || "Not specified"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Air Conditioning</span>
                        <p className={`text-sm font-medium ${offer.hasAC ? 'text-green-400' : 'text-red-400'}`}>
                          {offer.hasAC ? 'Yes ✓' : 'No ✗'}
                        </p>
                      </div>
                      {offer.vehicleDetails && (
                        <div className="col-span-2">
                          <button
                            onClick={() => onViewVehiclePreview(offer.vehicleDetails)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                          >
                            <Car className="w-4 h-4" /> View Car Details & Images
                          </button>
                        </div>
                      )}
                    </div>

                    {offer.message && (
                      <div className={`mb-4 p-3 rounded-lg text-sm ${isUsersOffer ? 'bg-blue-900/30 text-blue-100' : 'bg-gray-900/50 text-gray-300'
                        }`}>
                        <p className="italic">"{offer.message}"</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-700">
                      <span className="text-xs text-gray-500">
                        Offered {offer.createdAt?.toDate?.().toLocaleDateString() || 'recently'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {isUnread && !isDriverView && (
                          <button
                            onClick={() => onMarkAsRead(request.id, originalIndex)}
                            className="px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-xs font-medium transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Read
                          </button>
                        )}
                        {isRequestOwner && !isDriverView && (
                          <>
                            <button
                              onClick={() => onWhatsAppContact(offer.driverPhone, offer.driverName, offer.price)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm"
                            >
                              <MessageCircle className="w-4 h-4" />
                              WhatsApp
                            </button>
                            <button
                              onClick={() => {
                                onChatDriver(offer.driverId, offer.driverName, request);
                                if (isUnread) onMarkAsRead(request.id, originalIndex);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                            >
                              <Send className="w-4 h-4" />
                              Chat
                            </button>
                          </>
                        )}
                        {isUsersOffer && (
                          <button
                            onClick={() => onChatDriver(request.userId, request.userName, request)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                          >
                            <Send className="w-4 h-4" />
                            Chat Requester
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/95 rounded-b-2xl">
          <p className="text-center text-xs text-gray-500">
            {isDriverView
              ? `Your offer status`
              : `Total Offers: ${request.offers?.length || 0}`}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Offer?</h3>
              <p className="text-gray-600 mb-6 font-medium">
                Are you sure you want to remove your offer for <strong>{showDeleteConfirm.driverName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteOffer(request.id, showDeleteConfirm.offerIndex);
                    setShowDeleteConfirm(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  const [isDriver, setIsDriver] = useState(false);
  const [driverState, setDriverState] = useState<string>("");
  const [driverCity, setDriverCity] = useState<string>("");
  const [driverBids, setDriverBids] = useState({ used: 0, limit: 3, lastReset: null });
  const [driverVehicles, setDriverVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showVehiclePreview, setShowVehiclePreview] = useState<{ show: boolean, vehicle?: any }>({ show: false });
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [showBidLimitModal, setShowBidLimitModal] = useState(false);

  // Standalone offer card state
  const [showOfferCard, setShowOfferCard] = useState(false);
  const [offerCardRequest, setOfferCardRequest] = useState<BookingRequestType | null>(null);
  const [showDriverDeleteConfirm, setShowDriverDeleteConfirm] = useState<{ requestId: string, offerIndex: number } | null>(null);

  const [contactForm, setContactForm] = useState({
    carMake: "",
    hasAC: true,
    price: "",
    message: "",
    agreeTerms: false,
    vehicleId: ""
  });

  const [popupTimer, setPopupTimer] = useState<any>(null);

  const [activeChat, setActiveChat] = useState<{
    show: boolean;
    chatId?: string;
    car?: any;
    driver?: any;
  }>({ show: false });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [adminConfig, setAdminConfig] = useState<any>(null);

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

  // Track previous offers per driver to detect new bids and prevent double counting
  const [previousDriverOffers, setPreviousDriverOffers] = useState<Record<string, Record<string, number>>>({});

  // Track if warning has been shown in this session
  const [warningShown, setWarningShown] = useState(false);

  // Add this useEffect after the existing useEffects to listen for real-time request count changes
  useEffect(() => {
    if (!userId || isDriver) return; // Only for customers

    const requestsRef = collection(db, "bookingRequests");
    const q = query(
      requestsRef,
      where("userId", "==", userId),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      setUserRequestCount(count);

      // Also update the warning shown state based on count
      const vipLvl = userData.vipLevel || 0;
      const getMaxBookings = (level: number) => {
        if (level >= 5) return 8;
        if (level === 4) return 5;
        if (level === 3) return 4;
        if (level === 2) return 3;
        if (level === 1) return 2;
        return 1;
      };
      const maxLimit = getMaxBookings(vipLvl);

      // Reset warningShown when count is below limit
      if (count < maxLimit) {
        setWarningShown(false);
        sessionStorage.removeItem('requestLimitWarningShown');
      }
    });

    return () => unsubscribe();
  }, [userId, isDriver, userData.vipLevel]);

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

          if (data.isDriver) {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
            const lastReset = data.lastBidReset || "";

            let bidsUsed = data.bidsUsed || 0;
            if (lastReset !== currentMonth) {
              bidsUsed = 0;
              updateDoc(doc(db, "users", userId), {
                bidsUsed: 0,
                lastBidReset: currentMonth
              });
            }

            const vipLvl = data.vipLevel || 0;
            const limits: Record<number, number> = { 0: 3, 1: 5, 2: 7, 3: 9, 4: 11, 5: 15 };
            const limit = limits[vipLvl] || 3;

            setDriverBids({
              used: bidsUsed,
              limit: limit,
              lastReset: currentMonth as any
            });

            const vehicleIds = data.vehicleLog || [];
            if (vehicleIds.length > 0) {
              const vehicles: any[] = [];
              try {
                for (const vId of vehicleIds) {
                  const vDoc = await getDoc(doc(db, "vehicleLog", vId));
                  if (vDoc.exists()) {
                    const vData = vDoc.data();
                    // Check if vehicle is approved (either isApproved === true OR status === "approved")
                    const isVehicleApproved = vData.isApproved === true || vData.status === "approved";

                    const vImagesMap = vData.images || {};
                    const essentialImages = [
                      vImagesMap.front,
                      vImagesMap.back,
                      vImagesMap.side,
                      vImagesMap.interior
                    ].filter(Boolean);

                    vehicles.push({
                      id: vDoc.id,
                      make: vData.carName || "Unknown",
                      model: vData.carModel || "",
                      type: vData.carType || "",
                      year: vData.createdAt?.toDate?.().getFullYear() || "N/A",
                      color: vData.exteriorColor || "",
                      images: essentialImages,
                      isApproved: isVehicleApproved,
                      status: vData.status || "pending"
                    });
                  }
                }
                setDriverVehicles(vehicles);
              } catch (err) {
                console.error("Error fetching vehicles:", err);
              }
            } else {
              setDriverVehicles([]);
            }
          }
        }

        const configSnap = await getDoc(doc(db, "adminfinance", "pricing"));
        if (configSnap.exists()) {
          setAdminConfig(configSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data/config:", error);
      }
    };

    fetchUserData();
  }, [userId]);

  // Replace the existing fetchUserRequestCount useEffect with this one
  useEffect(() => {
    if (!userId || isDriver) return;

    // Initial fetch to set the count and show warning if needed
    const fetchInitialCount = async () => {
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
      } catch (error) {
        console.error("Error fetching user request count:", error);
      }
    };

    fetchInitialCount();
  }, [userId, isDriver]);

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

      if (!isDriver) {
        // Customers: only see their own requests
        if (filter === "urgent") {
          q = query(requestsRef, where("userId", "==", userId), where("status", "==", "active"), where("urgent", "==", true));
        } else {
          q = query(requestsRef, where("userId", "==", userId), where("status", "==", "active"));
        }
      } else {
        // Drivers: see ALL active requests
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

          let accessibleRequests = requestsList;

          // Ticket collection check for drivers
          if (isDriver && adminConfig?.startTicketCollect) {
            const hasValidTicket = userData?.hasActiveTicket &&
              userData?.ticketExpiryDate?.toDate() > new Date();

            const isTrialActive = () => {
              if (!userData?.newDriverConfig?.registeredAt) return false;
              const regDate = userData.newDriverConfig.registeredAt.toDate?.() || new Date(userData.newDriverConfig.registeredAt);
              const trialDays = adminConfig?.newDriver?.freeTrialDays || 60;
              const trialEnd = new Date(regDate);
              trialEnd.setDate(trialEnd.getDate() + trialDays);
              return new Date() < trialEnd;
            };

            if (!hasValidTicket && !isTrialActive()) {
              accessibleRequests = [];
            }
          }

          // For drivers: mark which ones they've made offers on
          let processedRequests = accessibleRequests;
          if (isDriver) {
            processedRequests = accessibleRequests.map(request => ({
              ...request,
              userHasMadeOffer: request.offers?.some(offer => offer.driverId === userId) || false
            }));
          }

          const sortedRequests = processedRequests.sort((a, b) => {
            const vipA = (a as any).vipLevel || 0;
            const vipB = (b as any).vipLevel || 0;
            if (vipB !== vipA) {
              return vipB - vipA;
            }
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });

          let finalFiltered = sortedRequests;

          if (filter === "urgent") {
            finalFiltered = finalFiltered.filter(req => req.urgent);
          }

          if (filter === "nearby" && isDriver) {
            finalFiltered = finalFiltered.filter(request =>
              checkLocationMatch(request, driverState, driverCity)
            );
          }

          // Detect new bids for customers AND for drivers (when they are request owners)
          if (!isDriver) {
            // Customers: detect unread offers on their own requests
            const newRequests = finalFiltered.map(request => {
              const hasUnread = request.offers?.some(o => o.read === false) || false;
              return { ...request, hasNewBid: hasUnread };
            });
            setRequests(newRequests);
          } else {
            // Drivers: also detect unread offers on requests they OWN (as customers)
            const processedWithNotifications = finalFiltered.map(request => {
              // If this is the driver's OWN request (they posted it as a customer)
              if (request.userId === userId) {
                const hasUnread = request.offers?.some(o => o.read === false) || false;
                return { ...request, hasNewBid: hasUnread };
              }
              return { ...request, hasNewBid: false };
            });
            setRequests(processedWithNotifications);
          }

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
  }, [filter, driverState, driverCity, isDriver, userId, adminConfig, userData]);


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

  // Delete request
  const handleDeleteRequest = async (requestId: string) => {
    const deleteToast = toast.loading("Deleting request...");

    try {
      const requestRef = doc(db, "bookingRequests", requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        toast.error("Request not found", { id: deleteToast });
        return;
      }

      const requestData = requestDoc.data();

      if (requestData.userId !== userId) {
        toast.error("You can only delete your own requests", { id: deleteToast });
        return;
      }

      const offers = requestData.offers || [];
      const batch = writeBatch(db);

      // Add bid returns to batch
      if (offers.length > 0) {
        const driverIds: string[] = [];
        offers.forEach((offer: OfferType) => {
          if (!driverIds.includes(offer.driverId)) {
            driverIds.push(offer.driverId);
          }
        });

        for (const driverId of driverIds) {
          const driverRef = doc(db, "users", driverId);
          batch.update(driverRef, {
            bidsUsed: increment(-1),
            updatedAt: Timestamp.now()
          });
        }
      }

      // Add request deletion to batch
      batch.delete(requestRef);

      // Commit everything atomically
      await batch.commit();

      // Update local state
      if (isDriver && offers.some((offer: OfferType) => offer.driverId === userId)) {
        setDriverBids(prev => ({ ...prev, used: Math.max(0, prev.used - 1) }));
      }

      setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));

      toast.success("Request deleted successfully! Bids returned to drivers.", { id: deleteToast });

      if (viewingRequest?.id === requestId) {
        setViewingRequest(null);
      }
      setShowDeleteConfirm(null);
      setShowOfferCard(false);
      setOfferCardRequest(null);

      if (onNotificationUpdate) onNotificationUpdate();

    } catch (error: any) {
      console.error("Error deleting request:", error);

      if (error.code === 'permission-denied') {
        toast.error("You don't have permission to delete this request", { id: deleteToast });
      } else if (error.code === 'not-found') {
        toast.error("Request not found", { id: deleteToast });
      } else {
        toast.error(`Failed to delete request: ${error.message}`, { id: deleteToast });
      }
    }
  };

  // Open standalone offer card
  const openOfferCard = (request: BookingRequestType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOfferCardRequest(request);
    setShowOfferCard(true);

    // Mark offers as viewed for request owners (both customers AND drivers who posted requests)
    if (userId && request.userId === userId && request.offers?.length > 0) {
      if (onNotificationUpdate) onNotificationUpdate();
      if (onCustomerViewedOffers) onCustomerViewedOffers();
    }
  };

  const handleDeleteOffer = async (requestId: string, offerIndex: number, isDriverSelfDelete: boolean = false) => {
    const deleteToast = toast.loading(isDriverSelfDelete ? "Removing your bid..." : "Removing offer...");

    try {
      const requestRef = doc(db, "bookingRequests", requestId);
      const request = requests.find(r => r.id === requestId);

      if (request) {
        const updatedOffers = [...request.offers];
        updatedOffers.splice(offerIndex, 1);

        await updateDoc(requestRef, { offers: updatedOffers });
        toast.success(isDriverSelfDelete ? "Your bid has been removed!" : "Offer removed successfully!", { id: deleteToast });

        // Update local requests state
        setRequests(prevRequests =>
          prevRequests.map(req => {
            if (req.id === requestId) {
              const stillHasUnread = updatedOffers.some(o => o.read === false);
              const userMadeOffer = updatedOffers.some(o => o.driverId === userId);
              return { ...req, offers: updatedOffers, hasNewBid: stillHasUnread, userHasMadeOffer: userMadeOffer };
            }
            return req;
          })
        );

        // Update the offer card if it's open
        if (offerCardRequest?.id === requestId) {
          const stillHasUnread = updatedOffers.some(o => o.read === false);
          setOfferCardRequest({ ...offerCardRequest, offers: updatedOffers, hasNewBid: stillHasUnread });
        }

        // Close viewing request modal if open
        if (viewingRequest?.id === requestId) {
          setViewingRequest(null);
        }

        if (onNotificationUpdate) onNotificationUpdate();
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to remove offer", { id: deleteToast });
    } finally {
      setShowDriverDeleteConfirm(null);
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

    // Check bidding limit first
    if (driverBids.used >= driverBids.limit) {
      setShowBidLimitModal(true);
      return;
    }

    // Get reference to the request document
    const requestRef = doc(db, "bookingRequests", request.id);

    try {
      await updateDoc(requestRef, { views: increment(1) });
    } catch (error) {
      console.error("Error incrementing views:", error);
    }

    const existingOfferIndex = request.offers?.findIndex(offer => offer.driverId === userId) ?? -1;

    if (existingOfferIndex !== -1) {
      const existingOffer = request.offers[existingOfferIndex];

      // Ask if they want to override their existing offer
      const confirmOverride = window.confirm(
        `You already have an existing offer of ₦${parseInt(existingOffer.price).toLocaleString()} on this request.\n\nDo you want to replace it with a new offer?`
      );

      if (confirmOverride) {
        try {
          // Remove the existing offer first
          const updatedOffers = [...request.offers];
          updatedOffers.splice(existingOfferIndex, 1);

          await updateDoc(requestRef, { offers: updatedOffers });

          // Update local state
          setRequests(prevRequests =>
            prevRequests.map(req => {
              if (req.id === request.id) {
                const stillHasUnread = updatedOffers.some(o => o.read === false);
                return { ...req, offers: updatedOffers, hasNewBid: stillHasUnread, userHasMadeOffer: false };
              }
              return req;
            })
          );

          toast.success("Previous offer removed. You can now make a new offer.", { duration: 3000 });

          // Now proceed with making new offer
          setSelectedRequest(request);
          setContactForm({
            carMake: "",
            hasAC: true,
            price: request.budget || "",
            message: "",
            agreeTerms: false,
            vehicleId: ""
          });
          setShowContactModal(true);
        } catch (error) {
          console.error("Error removing existing offer:", error);
          toast.error("Failed to remove existing offer. Please try again.");
        }
      }
      return;
    }

    setSelectedRequest(request);
    setContactForm({
      carMake: "",
      hasAC: true,
      price: request.budget || "",
      message: "",
      agreeTerms: false,
      vehicleId: ""
    });
    setShowContactModal(true);
  };

  const handleMarkAsRead = async (requestId: string, offerIndex: number) => {
    try {
      const requestRef = doc(db, "bookingRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        const data = requestSnap.data();
        const offers = [...(data.offers || [])];
        if (offers[offerIndex]) {
          offers[offerIndex].read = true;
          await updateDoc(requestRef, { offers });

          // Update local requests state to remove pulse
          setRequests(prevRequests =>
            prevRequests.map(req => {
              if (req.id === requestId) {
                const updatedOffers = [...req.offers];
                if (updatedOffers[offerIndex]) {
                  updatedOffers[offerIndex].read = true;
                }
                // Check if any offers are still unread
                const stillHasUnread = updatedOffers.some(o => o.read === false);
                return { ...req, offers: updatedOffers, hasNewBid: stillHasUnread };
              }
              return req;
            })
          );

          // Update the offer card if it's open
          if (offerCardRequest?.id === requestId) {
            const updatedOffers = [...offerCardRequest.offers];
            if (updatedOffers[offerIndex]) {
              updatedOffers[offerIndex].read = true;
            }
            const stillHasUnread = updatedOffers.some(o => o.read === false);
            setOfferCardRequest({ ...offerCardRequest, offers: updatedOffers, hasNewBid: stillHasUnread });
          }

          if (onNotificationUpdate) onNotificationUpdate();
        }
      }
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleMarkAllRead = async (requestId: string) => {
    try {
      const requestRef = doc(db, "bookingRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        const data = requestSnap.data();
        const offers = (data.offers || []).map((o: any) => ({ ...o, read: true }));
        await updateDoc(requestRef, { offers });

        // Update local requests state to remove pulse
        setRequests(prevRequests =>
          prevRequests.map(req => {
            if (req.id === requestId) {
              const updatedOffers = offers;
              return { ...req, offers: updatedOffers, hasNewBid: false };
            }
            return req;
          })
        );

        // Update the offer card if it's open
        if (offerCardRequest?.id === requestId) {
          setOfferCardRequest({ ...offerCardRequest, offers, hasNewBid: false });
        }

        if (onNotificationUpdate) onNotificationUpdate();
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
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

    // FIX: Convert price to string before trim
    const priceString = contactForm.price.toString();
    if (!priceString.trim()) {
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

    // Check bidding limit again before submitting
    if (driverBids.used >= driverBids.limit) {
      setShowBidLimitModal(true);
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
        price: priceString, // Use the string version
        message: contactForm.message,
        status: "pending",
        createdAt: Timestamp.now(),
        read: false,
        vehicleId: contactForm.vehicleId,
        vehicleDetails: selectedVehicle ? {
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
          color: selectedVehicle.color,
          images: selectedVehicle.images || []
        } : null
      };

      const requestRef = doc(db, "bookingRequests", selectedRequest.id);
      const updatedOffers = [...(selectedRequest.offers || []), newOffer];
      await updateDoc(requestRef, { offers: updatedOffers });

      await updateDoc(doc(db, "users", userId), {
        bidsUsed: increment(1)
      });

      setDriverBids(prev => ({ ...prev, used: prev.used + 1 }));

      toast.success("Offer submitted successfully!", { id: submitToast });
      setShowContactModal(false);
      setViewingRequest(null);
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
    // For drivers, use the userHasMadeOffer flag
    if (isDriver) {
      return request.userHasMadeOffer || false;
    }
    return request.offers?.some(offer => offer.driverId === userId) || false;
  };

  const getUserOffer = (request: BookingRequestType) => {
    if (!userId) return null;
    return request.offers?.find(offer => offer.driverId === userId) || null;
  };

  const stats = getStats();

  const MaxRequestsWarning = () => {
    const vipLvl = userData.vipLevel || 0;
    const getMaxBookings = (level: number) => {
      if (level >= 5) return 8;
      if (level === 4) return 5;
      if (level === 3) return 4;
      if (level === 2) return 3;
      if (level === 1) return 2;
      return 1;
    };
    const maxLimit = getMaxBookings(vipLvl);

    // This will update in real-time because userRequestCount changes via onSnapshot
    if (userRequestCount >= maxLimit) {
      return (
        <div className="mb-2 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-1 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800">Maximum Requests Reached</h4>
              <p className="text-xs text-red-700">
                You have {userRequestCount} active requests (maximum is {maxLimit}). Delete one to create a new request.
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
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="w-full">
        {!isDriver && <MaxRequestsWarning />}
      </div>

      {/* Header - Responsive Fix */}
      <div className="-mt-6 w-full bg-white shadow-sm p-3 md:px-6 mb-8">
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

          {/* Filter Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs ${filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("urgent")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-xs ${filter === "urgent"
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
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-xs ${filter === "nearby"
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

      {/* Conditional Rendering for Customer vs Driver */}
      {!isDriver ? (
        <CustomerRequests
          requests={requests}
          userId={userId}
          formatDate={formatDate}
          openOfferCard={openOfferCard}
          setViewingRequest={setViewingRequest}
          setShowDeleteConfirm={setShowDeleteConfirm}
        />
      ) : (
        <DriverRequests
          requests={requests}
          userId={userId}
          formatDate={formatDate}
          openOfferCard={openOfferCard}
          setViewingRequest={setViewingRequest}
          driverState={driverState}
          driverCity={driverCity}
          filter={filter}
          driverVehicles={driverVehicles}
        />
      )}

      {/* Viewing Details Modal */}
      {viewingRequest && (
        <div className="h-[100vh] fixed inset-0 bg-black/60 flex flex-col items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded md:rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col relative border border-gray-700 animate-fadeIn">
            <div className="p-4 flex justify-between items-center border-b border-gray-800 shrink-0 bg-gray-900 sticky top-0 z-10 w-full">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-500" />
                Request Details
              </h3>
              <button
                onClick={() => setViewingRequest(null)}
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
                                  <div className="truncate text-xs">
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

                          <div className="grid grid-cols-2 gap-3 mt-5 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date</span>
                              <span className="text-sm font-semibold text-gray-200 text-xs">
                                {formatDate(request.startDate)} {request.endDate > request.startDate && `- ${formatDate(request.endDate)}`}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Passengers</span>
                              <span className="text-sm font-semibold text-gray-200 text-xs">{request.passengers}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Trip Type</span>
                              <span className="text-sm font-semibold text-gray-200 capitalize text-xs">{request.tripType?.split(':')[0]}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-gray-500">Budget Limit</span>
                              <span className="text-base font-black text-emerald-400 text-xs">
                                ₦{parseInt(request.budget || "0").toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {tripPurpose && (
                        <div className="mt-3 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Trip Purpose:</span>
                            <span className="text-sm font-medium text-gray-300 capitalize text-xs">
                              {tripPurpose.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                        </div>
                      )}

                      {request.description && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-700 text-sm sm:text-base text-xs">{request.description}</p>
                        </div>
                      )}

                      {/* User's Offer Status (for drivers) */}
                      {isDriver && userId !== request.userId && userHasMadeOffer && userOffer && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="w-full">
                              <p className="font-medium text-amber-900">Your Offer</p>
                              <p className="flex gap-4 items-center text-xs sm:text-sm text-amber-700">
                                <span>• ₦{parseInt(userOffer.price).toLocaleString()}</span>
                                <span>• Status: <span className="font-medium capitalize">{userOffer.status}</span></span>
                              </p>
                              <p className="flex gap-4 items-center text-xs sm:text-sm text-amber-700">
                                <span>• Car: {userOffer.carMake || "Not specified"}</span>
                                <span>• AC: {userOffer.hasAC ? 'Yes' : 'No'}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const offerIndex = request.offers.findIndex(o => o.driverId === userId);
                                if (offerIndex !== -1) {
                                  setShowDriverDeleteConfirm({ requestId: request.id, offerIndex });
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm whitespace-nowrap"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              Remove Your Bid
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 pt-4 border-t border-gray-700">
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-50">
                          <span className="flex items-center gap-1 text-xs">
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            {request.views || 0} views
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openOfferCard(request, e);
                            }}
                            className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer text-blue-500 text-xs"
                          >
                            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            {request.offers?.length || 0} offers
                            {userHasMadeOffer && (
                              <span className="hidden sm:inline text-gray-300"> • Your offer included</span>
                            )}
                          </button>

                          <span className="text-xs text-gray-400 text-xs">
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
                                      agreeTerms: true,
                                      vehicleId: existingOffer.vehicleId || ""
                                    });
                                    setShowContactModal(true);
                                  }
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm text-xs"
                              >
                                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                Edit Offer
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleContactUser(request)}
                              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-bold text-sm sm:text-base z-20 text-xs"
                            >
                              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              Make Offer
                            </button>
                          )
                        ) : userId === request.userId ? (
                          <div className="text-sm text-gray-400 text-xs">Your request</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Driver Delete Confirmation Modal */}
      {showDriverDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Your Bid?</h3>
              <p className="text-gray-600 mb-6 font-medium">
                Are you sure you want to remove your bid from this request? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDriverDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showDriverDeleteConfirm) {
                      handleDeleteOffer(showDriverDeleteConfirm.requestId, showDriverDeleteConfirm.offerIndex, true);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20"
                >
                  Remove Bid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Offer Card Component */}
      {showOfferCard && offerCardRequest && (
        <OfferCard
          request={offerCardRequest}
          userId={userId}
          userName={userName}
          isDriverView={isDriver && offerCardRequest.userId !== userId} // Only true for drivers viewing OTHER people's requests
          onClose={() => {
            setShowOfferCard(false);
            setOfferCardRequest(null);
          }}
          onDeleteOffer={handleDeleteOffer}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllRead={handleMarkAllRead}
          onWhatsAppContact={handleWhatsAppContact}
          onChatDriver={handleChatDriver}
          onViewVehiclePreview={(vehicle) => setShowVehiclePreview({ show: true, vehicle })}
        />
      )}

      {/* Bid Limit Modal */}
      {showBidLimitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[150] backdrop-blur-md">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-amber-500/30">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500">
                <Crown className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Bidding Limit Reached!</h3>
              <p className="text-gray-300 mb-4">
                You have exhausted your <span className="font-bold text-amber-400">{driverBids.limit}</span> monthly bids.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-300">
                  Upgrade to VIP to get more bids and unlock premium features!
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBidLimitModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowBidLimitModal(false);
                    window.location.href = '/purchase';
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all font-bold shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade VIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Contact Modal */}
      {showContactModal && selectedRequest && userData && (
        <div className="h-[100vh] fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-[60] backdrop-blur-sm">
          <div className="bg-gray-900 rounded md:rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-gray-700 animate-fadeIn">
            <div className="p-4 sm:p-5 flex-shrink-0 border-b border-gray-800 bg-gray-900 rounded-t-xl sticky top-0 z-10 w-full">
              <div className="flex justify-between items-center">
                <div className="w-full">
                  <div className="flex justify-between items-center gap-2">
                    <h3 className="text-lg sm:text-lg font-bold text-white flex items-center gap-2">
                      <Car className="w-5 h-5 text-emerald-500" /> Make an Offer
                    </h3>
                    <button
                      onClick={() => setShowContactModal(false)}
                      className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mt-3 md:mt-1 truncate text-xs">
                    You're offering for: <span className="font-medium text-gray-200">{selectedRequest.carType}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-5 w-full">
              {/* Requester's Details Section */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="font-medium text-emerald-400 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Requester's Details
                </p>
                <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-300">
                  <p><span className="text-gray-500">Name:</span> {selectedRequest.userName || "Anonymous"}</p>
                  <p><span className="text-gray-500">Location:</span> {selectedRequest.city ? `${selectedRequest.city}, ${selectedRequest.state}` : selectedRequest.location || "Unknown"}</p>
                  <p className="text-[10px] sm:text-xs text-emerald-500/70 mt-2 flex items-center gap-1">
                    <span className="text-emerald-400">💡</span> Contact info will be shared after you submit your offer
                  </p>
                </div>
              </div>

              {/* Your Details Section (Driver's info) */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-800/60 border border-gray-700 rounded-lg">
                <p className="font-medium text-blue-400 text-sm flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Your Details (Will be shared with requester)
                </p>
                <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-300">
                  <p><span className="text-gray-500">Name:</span> {userData.fullName || userData.firstName ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userName : userName || "Not provided"}</p>
                  <p><span className="text-gray-500">Phone:</span> {userData.phoneNumber || "Not provided"}</p>
                  <p><span className="text-gray-500">Location:</span> {userData.city ? `${userData.city}, ${userData.state}` : userData.state || "Unknown"}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">This info will be safely shared with the requester upon offer submission</p>
                </div>
              </div>

              {/* Offer Form */}
              <div className="space-y-4 pb-2">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                    Select Your Car from Fleet *
                  </label>
                  <select
                    value={contactForm.vehicleId}
                    onChange={(e) => {
                      const v = driverVehicles.find(veh => veh.id === e.target.value);
                      setSelectedVehicle(v || null);
                      setContactForm({
                        ...contactForm,
                        vehicleId: e.target.value,
                        carMake: v ? `${v.make} ${v.model}` : ""
                      });
                    }}
                    className="w-full px-3 py-2 sm:py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    required
                  >
                    <option value="">-- Choose Car --</option>
                    {driverVehicles.map((v) => (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={!v.isApproved}
                        className={!v.isApproved ? 'text-gray-500 bg-gray-900' : ''}
                      >
                        {v.make} {v.model} ({v.year}) {v.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
                      </option>
                    ))}
                  </select>

                  {/* Show warning when driver has ZERO approved vehicles */}
                  {driverVehicles.filter(v => v.isApproved === true).length === 0 && driverVehicles.length > 0 && (
                    <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                      <p className="text-orange-400 text-[11px] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        ⚠️ You have no approved vehicles. Please wait for admin approval or contact support.
                      </p>
                    </div>
                  )}

                  {driverVehicles.length === 0 && (
                    <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                      <p className="text-orange-400 text-[11px] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        ⚠️ You have no vehicles. Please add a vehicle to your profile first.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/user/driver-profile/${userId}#vehicle-section`;
                        }}
                        className="mt-2 text-xs bg-orange-500/30 text-orange-300 px-3 py-1 rounded-lg hover:bg-orange-500/40 transition-colors"
                      >
                        Add Vehicle
                      </button>
                    </div>
                  )}
                </div>

                {/* Price Input */}
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
                      disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-emerald-500 mt-1.5 font-medium">
                    Requested budget: ₦{parseInt(selectedRequest.budget || "0").toLocaleString()}
                  </p>
                </div>

                {/* Air Conditioning Checkbox */}
                <div className="flex items-start mt-2">
                  <input
                    type="checkbox"
                    id="hasAC"
                    checked={contactForm.hasAC}
                    onChange={(e) => setContactForm({ ...contactForm, hasAC: e.target.checked })}
                    className="h-4 w-4 bg-gray-800 text-emerald-500 rounded border-gray-600 mt-0.5 focus:ring-emerald-500"
                    disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                  />
                  <label htmlFor="hasAC" className="ml-2.5 text-gray-300">
                    <span className="font-medium text-sm">Air Conditioning</span>
                    <p className="text-[10px] sm:text-xs text-gray-500">I have a functional AC system.</p>
                  </label>
                </div>

                {/* Message */}
                <div className="pt-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                    Message (Optional)
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-500"
                    rows={2}
                    placeholder="Short message to the requester..."
                    disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                  />
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start bg-gray-800/40 p-3 rounded-lg border border-gray-700/50 mt-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={contactForm.agreeTerms}
                    onChange={(e) => setContactForm({ ...contactForm, agreeTerms: e.target.checked })}
                    className="h-4 w-4 bg-gray-800 text-emerald-500 rounded border-gray-600 mt-0.5 focus:ring-emerald-500"
                    required
                    disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
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

            {/* Action Buttons */}
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
                  disabled={
                    !contactForm.agreeTerms ||
                    !contactForm.price ||
                    !contactForm.carMake ||
                    driverVehicles.filter(v => v.isApproved === true).length === 0
                  }
                  className={`flex-1 px-4 py-2.5 rounded-lg transition-colors text-sm font-bold shadow-md ${!contactForm.agreeTerms ||
                      !contactForm.price ||
                      !contactForm.carMake ||
                      driverVehicles.filter(v => v.isApproved === true).length === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20'
                    }`}
                >
                  Confirm Offer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Edit Request Modal */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Request?</h3>
              <p className="text-gray-600 mb-6 font-medium">
                Are you sure you want to delete this trip request? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRequest(showDeleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tip for Drivers */}
      {isDriver && (
        <div className="mx-2 mt-6 md:mt-8 md:mx-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 sm:p-5">
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
                  <span>You can only make one offer per request. Making a new offer will replace your previous one.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>You have used <strong>{driverBids.used}</strong> out of <strong>{driverBids.limit}</strong> bids this month.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Image Preview Modal */}
      {showVehiclePreview.show && showVehiclePreview.vehicle && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                {showVehiclePreview.vehicle.make} {showVehiclePreview.vehicle.model}
              </h3>
              <button onClick={() => setShowVehiclePreview({ show: false })} className="p-2 bg-gray-800 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {showVehiclePreview.vehicle.images?.length > 0 ? (
                <>
                  <img
                    src={showVehiclePreview.vehicle.images[previewImageIndex]}
                    alt="Vehicle"
                    className="w-full h-full object-contain"
                  />
                  {showVehiclePreview.vehicle.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setPreviewImageIndex(prev => (prev === 0 ? showVehiclePreview.vehicle.images.length - 1 : prev - 1))}
                        className="absolute left-2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        &lt;
                      </button>
                      <button
                        onClick={() => setPreviewImageIndex(prev => (prev === showVehiclePreview.vehicle.images.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        &gt;
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-gray-500 flex flex-col items-center gap-2">
                  <Car className="w-12 h-12" />
                  No images available
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-900">
              <div className="flex gap-2 justify-center">
                {showVehiclePreview.vehicle.images?.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setPreviewImageIndex(i)}
                    className={`w-2 h-2 rounded-full ${i === previewImageIndex ? 'bg-blue-500 w-4' : 'bg-gray-700'} transition-all`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}