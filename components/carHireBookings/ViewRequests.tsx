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
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import toast from 'react-hot-toast';
import { X, Check, Phone, Car, Calendar, Users, MapPin, MessageCircle, AlertCircle, Trash2, Edit2, Send, Eye, Navigation, Crown } from 'lucide-react';
import ChatWindow from "../PreChat/chat-window";
import CustomerRequests from "./CustomerRequests";
import DriverRequests from "./DriverRequests";

import { BookingRequestType, OfferType, UserType } from "./types";
import { nigeriaLocations } from "./locations";
import OfferCard from "./OfferCard";
import FilterBar from "./FilterBar";
import ViewRequestModal from "./ViewRequestModal";
import EditRequestModal from "./EditRequestModal";
import ContactModal from "./ContactModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import BidLimitModal from "./BidLimitModal";
import VehiclePreviewModal from "./VehiclePreviewModal";
import MaxRequestsWarning from "./MaxRequestsWarning";
import DriverTips from "./DriverTips";
import ReBidWarningModal from "./ReBidWarningModal";
import FlagOverlay from "../mobility/FlagOverlay";

interface ViewRequestsProps {
  userId?: string;
  userName?: string;
  userLocation?: string;
  onNotificationUpdate?: () => void;
  onCustomerViewedOffers?: () => void;
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
  const [showReBidWarning, setShowReBidWarning] = useState(false);
  const [pendingReBidRequest, setPendingReBidRequest] = useState<BookingRequestType | null>(null);

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

  const [flagOverlay, setFlagOverlay] = useState<{
    show: boolean;
    targetUser: { uid: string; fullName: string; email?: string; phoneNumber?: string; type: "driver" | "customer" } | null;
  }>({ show: false, targetUser: null });

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


  // Track previous offers per driver to detect new bids and prevent double counting
  const [previousDriverOffers, setPreviousDriverOffers] = useState<Record<string, Record<string, number>>>({});

  // Track if warning has been shown in this session
  const [warningShown, setWarningShown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

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
            const locationStr = (typeof data.location === 'string' ? data.location : (data.location?.address || "")).toLowerCase();
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
              userHasMadeOffer: request.offers?.some(offer => offer.driverId === userId) || false,
              userWasRejected: request.rejectedOnce?.includes(userId || "") || false,
              userIsBlocked: request.rejectedTwice?.includes(userId || "") || false
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

          setRequests(sortedRequests);
          setVisibleCount(20); // Reset on filter change

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
        const offerToDelete = updatedOffers[offerIndex];
        updatedOffers.splice(offerIndex, 1);

        const updateData: any = { offers: updatedOffers };

        // If customer deletes a driver's bid, track it as a rejection
        if (!isDriverSelfDelete && offerToDelete) {
          const rejectedDriverId = offerToDelete.driverId;
          const isAlreadyRejectedOnce = request.rejectedOnce?.includes(rejectedDriverId);

          if (isAlreadyRejectedOnce) {
            updateData.rejectedOnce = arrayRemove(rejectedDriverId);
            updateData.rejectedTwice = arrayUnion(rejectedDriverId);
          } else {
            updateData.rejectedOnce = arrayUnion(rejectedDriverId);
          }
        }

        await updateDoc(requestRef, updateData);
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

  const handleContactUser = async (request: BookingRequestType, bypassWarning = false) => {
    if (!isDriver) {
      toast.error("Only drivers can make offers");
      return;
    }

    if (userId === request.userId) {
      toast.error("You cannot make offers on your own request");
      return;
    }

    if (request.userIsBlocked) {
      toast.error("You cannot bid on this request again as your previous offers were rejected.");
      return;
    }

    if (request.userWasRejected && !showReBidWarning && !bypassWarning) {
      setPendingReBidRequest(request);
      setShowReBidWarning(true);
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
        `You already have an existing offer of â‚¦${parseInt(existingOffer.price).toLocaleString()} on this request.\n\nDo you want to replace it with a new offer?`
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
      
      await updateDoc(requestRef, { 
        offers: updatedOffers 
      });

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

    const message = `Hi ${driverName}, I'm interested in your offer of â‚¦${price} for my car request.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Auto-close modals to show the background/chat
    setShowOfferCard(false);
    setViewingRequest(null);
  };

  const handleChatDriver = async (otherUserId: string, otherUserName: string, request?: BookingRequestType, driverPhone?: string) => {
    if (!userId || !otherUserId) {
      toast.error("Unable to start chat: Missing user information");
      return;
    }

    try {
      const chatId = [userId, otherUserId].sort().join('_');
      const chatRef = doc(db, "preChats", chatId);
      let chatDoc;
      
      try {
        chatDoc = await getDoc(chatRef);
      } catch (e) {
        // If this fails, it's usually a permission error on the read check
        console.warn("Read permission denied or doc missing, attempting to proceed...");
      }

      const carInfo = request ? {
        id: request.id || 'unknown',
        title: `${request.carType || 'Trip'} - ${request.location || 'Unknown'}`,
        carType: request.carType || 'General',
        location: request.location || 'Unknown',
        budget: request.budget || '0'
      } : {
        id: 'general',
        title: 'Car Rental Request',
        carType: 'General',
        location: 'Unknown',
        budget: '0'
      };

      const driverInfo = {
        id: otherUserId,
        name: otherUserName || "Driver",
        phone: driverPhone || '',
      };

      const currentUserName = userData?.fullName || userName || "User";

      const chatData = {
        participants: [userId, otherUserId],
        participantNames: {
          [userId]: currentUserName,
          [otherUserId]: otherUserName || "Driver"
        },
        carInfo: carInfo,
        lastActivity: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (!chatDoc?.exists()) {
        await setDoc(chatRef, {
          ...chatData,
          messages: [],
          createdAt: Timestamp.now()
        });
      } else {
        await updateDoc(chatRef, chatData);
      }

      setActiveChat({
        show: true,
        chatId: chatId,
        car: carInfo,
        driver: driverInfo
      });

      // Auto-close modals to show the chat window
      setShowOfferCard(false);
      setViewingRequest(null);

    } catch (error) {
      console.error("Error opening chat:", error);
      toast.error("Permission denied: Check Firestore rules");
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

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="w-full">
        {!isDriver && (
          <MaxRequestsWarning
            userRequestCount={userRequestCount}
            vipLevel={userData.vipLevel || 0}
          />
        )}
      </div>

      <FilterBar
        stats={stats}
        filter={filter}
        setFilter={setFilter}
        isDriver={isDriver}
        driverState={driverState}
        driverCity={driverCity}
      />

      {/* Conditional Rendering for Customer vs Driver */}
      {!isDriver ? (
        <CustomerRequests
          requests={requests.slice(0, visibleCount)}
          userId={userId}
          formatDate={formatDate}
          openOfferCard={openOfferCard}
          setViewingRequest={setViewingRequest}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onFlagCustomer={(customer) => setFlagOverlay({ show: true, targetUser: { ...customer, type: "customer" } })}
        />
      ) : (
        <DriverRequests
          requests={requests.slice(0, visibleCount)}
          userId={userId}
          formatDate={formatDate}
          openOfferCard={openOfferCard}
          setViewingRequest={setViewingRequest}
          driverState={driverState}
          driverCity={driverCity}
          filter={filter}
          driverVehicles={driverVehicles}
          onFlagCustomer={(customer) => setFlagOverlay({ show: true, targetUser: { ...customer, type: "customer" } })}
        />
      )}

      {/* Load More Button */}
      {requests.length > visibleCount && (
        <div className="mt-8 flex justify-center pb-10">
          <button
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-xl active:scale-95"
          >
            Load More Requests
          </button>
        </div>
      )}

      {/* Viewing Details Modal */}
      {viewingRequest && (
        <ViewRequestModal
          request={requests.find(r => r.id === viewingRequest.id) || viewingRequest}
          isDriver={isDriver}
          userId={userId}
          userHasMadeOffer={hasUserMadeOffer(requests.find(r => r.id === viewingRequest.id) || viewingRequest)}
          userWasRejected={(requests.find(r => r.id === viewingRequest.id) || viewingRequest).userWasRejected}
          userIsBlocked={(requests.find(r => r.id === viewingRequest.id) || viewingRequest).userIsBlocked}
          userOffer={getUserOffer(requests.find(r => r.id === viewingRequest.id) || viewingRequest)}
          formatDate={formatDate}
          onClose={() => setViewingRequest(null)}
          openOfferCard={openOfferCard}
          onContactUser={handleContactUser}
          onEditOffer={(req, offer) => {
            setSelectedRequest(req);
            setContactForm({
              carMake: offer.carMake || "",
              hasAC: offer.hasAC,
              price: offer.price,
              message: offer.message,
              agreeTerms: true,
              vehicleId: offer.vehicleId || ""
            });
            setShowContactModal(true);
          }}
          onRemoveBid={(requestId, offerIndex) => {
            setShowDriverDeleteConfirm({ requestId, offerIndex });
          }}
        />
      )}

      {/* Driver Delete Confirmation Modal */}
      {showDriverDeleteConfirm && (
        <DeleteConfirmModal
          title="Remove Your Bid?"
          message="Are you sure you want to remove your bid from this request? This action cannot be undone."
          confirmLabel="Remove Bid"
          onConfirm={() => {
            if (showDriverDeleteConfirm) {
              handleDeleteOffer(showDriverDeleteConfirm.requestId, showDriverDeleteConfirm.offerIndex, true);
            }
          }}
          onCancel={() => setShowDriverDeleteConfirm(null)}
        />
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
          onFlagDriver={(driver) => setFlagOverlay({ show: true, targetUser: { ...driver, type: "driver" } })}
        />
      )}

      {/* Bid Limit Modal */}
      {showBidLimitModal && (
        <BidLimitModal
          limit={driverBids.limit}
          onClose={() => setShowBidLimitModal(false)}
          onUpgrade={() => {
            setShowBidLimitModal(false);
            window.location.href = '/purchase';
          }}
        />
      )}

      {/* Driver Contact Modal */}
      {showContactModal && selectedRequest && userData && (
        <ContactModal
          selectedRequest={selectedRequest}
          userData={userData}
          contactForm={contactForm}
          setContactForm={setContactForm}
          driverVehicles={driverVehicles}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          onClose={() => setShowContactModal(false)}
          onSubmit={handleSubmitOffer}
          userId={userId}
          userName={userName}
        />
      )}

      {/* Customer Edit Request Modal */}
      {showEditModal && selectedRequest && (
        <EditRequestModal
          request={selectedRequest}
          editForm={editForm}
          setEditForm={setEditForm}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateRequest}
        />
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
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          title="Delete Request?"
          message="Are you sure you want to delete this trip request? This action cannot be undone."
          onConfirm={() => handleDeleteRequest(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Tip for Drivers */}
      {isDriver && (
        <DriverTips
          driverCity={driverCity}
          driverState={driverState}
          driverBids={driverBids}
        />
      )}

      {/* Vehicle Image Preview Modal */}
      {showVehiclePreview.show && showVehiclePreview.vehicle && (
        <VehiclePreviewModal
          vehicle={showVehiclePreview.vehicle}
          onClose={() => setShowVehiclePreview({ show: false })}
        />
      )}
      {/* Re-Bid Warning Modal */}
      <ReBidWarningModal
        show={showReBidWarning}
        onClose={() => {
          setShowReBidWarning(false);
          setPendingReBidRequest(null);
        }}
        onProceed={() => {
          const req = pendingReBidRequest;
          setShowReBidWarning(false);
          setPendingReBidRequest(null);
          if (req) {
            handleContactUser(req, true);
          }
        }}
      />

      {/* Flag Overlay */}
      {flagOverlay.show && flagOverlay.targetUser && (
        <FlagOverlay
          isOpen={flagOverlay.show}
          onClose={() => setFlagOverlay({ show: false, targetUser: null })}
          targetUser={flagOverlay.targetUser}
          reporterUser={{
            uid: userId || "",
            fullName: userName || "Anonymous User"
          }}
        />
      )}
    </div>
  );
}
