"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  FaSearch, FaMapMarkerAlt, FaFilter, FaSyncAlt,
  FaCar, FaUsers, FaInfoCircle, FaChevronRight, FaTimes, FaExclamationTriangle,
} from "react-icons/fa";
import {
  collection, collectionGroup, query, where, onSnapshot, getDocs, doc,
  updateDoc, writeBatch, serverTimestamp,
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { LoadBooking, getTodayString } from "./types";
import DriverLoadCard from "./DriverLoadCard";
import SeatSelectionOverlay from "./SeatSelectionOverlay";
import LoadFlagOverlay from "./LoadFlagOverlay";
import BookingTrackingMap from "@/components/map/BookingTrackingMap";

const GOOGLE_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

// Robust normalization for Nigerian spellings (e.g., Sagamu vs Shagamu)
const normalizeForSearch = (str: string) => {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/sh/g, "s")      // Handle Shagamu/Sagamu
    .replace(/zh/g, "j")      // Handle variations of J/ZH
    .replace(/[^a-z0-9]/g, "") // Remove all punctuation/spaces
    .trim();
};


interface CustomerSearchPanelProps {
  currentUser: {
    uid: string;
    displayName: string;
    photoURL?: string;
    trustScore: number;
    city?: string;
    state?: string;
    location?: { lat?: number; lng?: number; address?: string };
  };
  onCancelOccurred: () => void;
}

export default function CustomerSearchPanel({
  currentUser,
  onCancelOccurred,
}: CustomerSearchPanelProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_LIBRARIES,
  });

  const [bookings, setBookings] = useState<LoadBooking[]>([]);
  const [filtered, setFiltered] = useState<LoadBooking[]>([]);
  const [destination, setDestination] = useState(initialSearch);
  const [manualLocation, setManualLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<LoadBooking | null>(null);
  const [flagBooking, setFlagBooking] = useState<LoadBooking | null>(null);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeBookingDriverName, setActiveBookingDriverName] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  const destInputRef = useRef<HTMLInputElement>(null);
  const locInputRef = useRef<HTMLInputElement>(null);
  const destAcRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locAcRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [activeDriverPoints, setActiveDriverPoints] = useState<string[]>([]);

  // Detect Google Maps
  useEffect(() => {
    if (isLoaded) {
      // API is loaded and ready
    }
  }, [isLoaded]);

  // Initialize Autocomplete for Destination
  useEffect(() => {
    if (!isLoaded || !destInputRef.current || destAcRef.current) return;

    const ac = new google.maps.places.Autocomplete(destInputRef.current, {
      fields: ["formatted_address", "name", "geometry", "address_components"],
      componentRestrictions: { country: "ng" },
      types: ["geocode", "establishment"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const name = place.name || "";
      const addressComponents = place.address_components || [];
      const lga = addressComponents.find(c => c.types.includes("administrative_area_level_2"))?.long_name || "";
      const city = addressComponents.find(c => c.types.includes("locality"))?.long_name || "";
      const state = addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.long_name || "";
      let fullAddr = place.formatted_address || "";
      
      fullAddr = fullAddr.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/g, "").trim().replace(/^[,.\s]+|[,.\s]+$/g, "");

      const firstPart = fullAddr.split(",")[0].trim();
      let displayName = (name && !name.includes("+")) ? name : firstPart;
      displayName = displayName.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/g, "").trim();

      const headerParts = [displayName];
      const area = city || lga;
      if (area && !displayName.toLowerCase().includes(area.toLowerCase())) headerParts.push(area);
      if (state && !displayName.toLowerCase().includes(state.toLowerCase()) && !area.toLowerCase().includes(state.toLowerCase())) {
        headerParts.push(state);
      }
      
      const header = headerParts.join(", ");
      let cleanAddr = `${header} (${fullAddr})`;
      cleanAddr = cleanAddr.replace(/^[,.\s]+|[,.\s]+$/g, "");

      setDestination(cleanAddr);
      if (destInputRef.current) destInputRef.current.value = cleanAddr;
    });

    destAcRef.current = ac;
  }, [isLoaded]);

  // Broadcast active seat state globally so the sidebar can intercept navigation
  useEffect(() => {
    const event = new CustomEvent("loadBookingState", { detail: hasActiveBooking });
    window.dispatchEvent(event);
    
    return () => {
      // Clear state when unmounting
      window.dispatchEvent(new CustomEvent("loadBookingState", { detail: false }));
    };
  }, [hasActiveBooking]);

  // Extract unique active driver meeting points
  useEffect(() => {
    if (bookings.length > 0) {
      const points = Array.from(new Set(bookings.map(b => b.meetingPoint))).filter(p => !!p);
      setActiveDriverPoints(points);
    }
  }, [bookings]);

  // Real-time listener for active load bookings today
  useEffect(() => {
    const today = getTodayString();
    const q = query(
      collection(db, "loadBookings"),
      where("status", "in", ["active", "departed"]),
      where("date", "==", today)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LoadBooking[];
      setBookings(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Check if user already has an active seat somewhere (using collectionGroup for offline resilience)
  const [activeBookingObj, setActiveBookingObj] = useState<LoadBooking | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocationTimestamp, setDriverLocationTimestamp] = useState<number>(0);

  // ✅ NEW: Inactivity tracking for load bookings
  const [showLoadInactivityPrompt, setShowLoadInactivityPrompt] = useState(false);
  const [loadInactivityDismissedAt, setLoadInactivityDismissedAt] = useState<number>(0);

  // ✅ REFACTORED: Use collectionGroup real-time listener for active seat detection
  // This ensures bookings survive network drops, reboots, and offline cache loads
  useEffect(() => {
    if (!currentUser.uid) {
      setHasActiveBooking(false);
      setActiveBookingObj(null);
      return;
    }

    const seatsQuery = query(
      collectionGroup(db, "seats"),
      where("customerId", "==", currentUser.uid),
      where("status", "==", "booked")
    );

    let bookingUnsub: (() => void) | null = null;

    const unsub = onSnapshot(
      seatsQuery,
      (snap: any) => {
        try {
          if (snap.empty) {
            setHasActiveBooking(false);
            setActiveBookingObj(null);
            setActiveBookingDriverName("");
            setActiveBookingId(null);
            if (bookingUnsub) { bookingUnsub(); bookingUnsub = null; }
            return;
          }

          // Get the parent booking document reference from the first active seat
          const seatDoc = snap.docs[0];
          const bookingRef = seatDoc.ref.parent.parent;
          if (!bookingRef) return;

          // Listen to the parent booking document in real-time
          if (bookingUnsub) bookingUnsub();
          bookingUnsub = onSnapshot(
            bookingRef,
            (bookingSnap: any) => {
              if (bookingSnap.exists()) {
                const bookingData = { id: bookingSnap.id, ...bookingSnap.data() } as LoadBooking;
                setHasActiveBooking(true);
                setActiveBookingDriverName(bookingData.driverName);
                setActiveBookingId(bookingData.id);
                setActiveBookingObj(bookingData);
              } else {
                setHasActiveBooking(false);
                setActiveBookingObj(null);
              }
            },
            (error: any) => {
              console.error("[LoadBooking] Error listening to booking doc:", error);
            }
          );
        } catch (err) {
          console.error("[LoadBooking] Error in active booking listener:", err);
        }
      },
      (error: any) => {
        console.error("[LoadBooking] Error listening to active seats:", error);
      }
    );

    return () => {
      unsub();
      if (bookingUnsub) bookingUnsub();
    };
  }, [currentUser.uid]);

  // Sync driver location if trip is active
  useEffect(() => {
    if (!activeBookingObj || activeBookingObj.status !== 'departed') {
      setDriverLocation(null);
      setDriverLocationTimestamp(0);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", activeBookingObj.driverId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.location?.lat && data.location?.lng) {
          setDriverLocation({ lat: data.location.lat, lng: data.location.lng });
          // Track the timestamp for inactivity detection
          const ts = data.location?.timestamp || data.lastLocationUpdate;
          if (ts) {
            if (typeof ts.toMillis === 'function') setDriverLocationTimestamp(ts.toMillis());
            else if (ts.seconds) setDriverLocationTimestamp(ts.seconds * 1000);
            else if (typeof ts === 'number') setDriverLocationTimestamp(ts);
          }
        }
      }
    });

    return () => unsub();
  }, [activeBookingObj?.id, activeBookingObj?.status]);

  // ✅ NEW: Cancel load booking due to inactivity
  const cancelLoadBookingDueToInactivity = async (bookingId: string) => {
    try {
      const batch = writeBatch(db);
      // Cancel the booking
      batch.update(doc(db, "loadBookings", bookingId), {
        status: "cancelled",
        cancelReason: "Auto-cancelled: Driver inactive",
        updatedAt: serverTimestamp(),
      });
      // Release all seats
      const seatsSnap = await getDocs(collection(db, "loadBookings", bookingId, "seats"));
      seatsSnap.forEach((seatDoc) => {
        if (seatDoc.data().status === "booked") {
          batch.update(seatDoc.ref, { status: "available", customerId: "", customerName: "", updatedAt: serverTimestamp() });
        }
      });
      await batch.commit();
      setHasActiveBooking(false);
      setActiveBookingObj(null);
      onCancelOccurred();
    } catch (err) {
      console.error("[LoadBooking] Error cancelling due to inactivity:", err);
    }
  };

  // ✅ NEW: Inactivity Check for Load Bookings (30-min prompt, 3-hr auto-cancel)
  useEffect(() => {
    if (!activeBookingObj || activeBookingObj.status !== 'departed') {
      setShowLoadInactivityPrompt(false);
      return;
    }

    const THIRTY_MIN = 30 * 60 * 1000;
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const SUPPRESS_AFTER_DISMISS = 15 * 60 * 1000;

    const interval = setInterval(() => {
      try {
        const now = Date.now();
        
        // Use driver location timestamp as inactivity marker (survives app restart via Firestore)
        let inactivityStartTime = driverLocationTimestamp;
        
        if (!inactivityStartTime || inactivityStartTime === 0) return;

        const elapsed = now - inactivityStartTime;

      // 3-hour auto-cancel
      if (elapsed >= THREE_HOURS) {
        console.warn("[LoadBooking Inactivity] 3hr auto-cancel for", activeBookingObj.id);
        cancelLoadBookingDueToInactivity(activeBookingObj.id);
        setShowLoadInactivityPrompt(false);
        return;
      }

      // 30-minute interactive prompt
      if (elapsed >= THIRTY_MIN) {
        if (loadInactivityDismissedAt && (now - loadInactivityDismissedAt) < SUPPRESS_AFTER_DISMISS) return;
        setShowLoadInactivityPrompt(true);
      } else {
        setShowLoadInactivityPrompt(false);
      }
      } catch (err) {
        console.error("Error in inactivity check:", err);
        setShowLoadInactivityPrompt(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeBookingObj?.id, activeBookingObj?.status, driverLocationTimestamp, loadInactivityDismissedAt]);

  // Broadcast active seat state globally so the sidebar can intercept navigation
  useEffect(() => {
    const event = new CustomEvent("loadBookingState", { detail: hasActiveBooking });
    window.dispatchEvent(event);
    
    return () => {
      // Clear state when unmounting
      window.dispatchEvent(new CustomEvent("loadBookingState", { detail: false }));
    };
  }, [hasActiveBooking]);

  // Haversine distance formula
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter bookings by user's location + destination search
  useEffect(() => {
      try {
        if (bookings.length === 0) {
          setFiltered([]);
          return;
        }

        const userCity = (currentUser?.city || "").toLowerCase();
        const userState = (currentUser?.state || "").toLowerCase();
        const locAddr = (manualLocation || "").toLowerCase();

        let result = bookings.filter((b) => {
          return b && b.driverId && b.driverId !== currentUser?.uid;
        });

        // Filter logic
        result = result.filter((b) => {
          if (!b || !b.id) return false;
          // ALWAYS include their active booking so they can manage it
          if (b.id === activeBookingId) return true;

          const bCity = (b.driverCity || "").toLowerCase();
          const bState = (b.driverState || "").toLowerCase();
      let stringLocalityMatch = false;

      if (locAddr.trim()) {
        // Strict match against the driver's set meeting point only
        try {
          const normInput = normalizeForSearch(locAddr);
          const normPoint = normalizeForSearch(b.meetingPoint || "");
          stringLocalityMatch = !!(normPoint && normPoint.includes(normInput));
        } catch (err) {
          console.warn("Error normalizing search:", err);
          stringLocalityMatch = false;
        }
      } else {
        // Fallback to profile location if search is empty
        stringLocalityMatch = (!!userCity && (bCity.includes(userCity) || userCity.includes(bCity))) || (!!userState && (bState.includes(userState) || userState.includes(bState)));
      }
      // 2. Radius match (GPS based - 5km Discovery Radius)
      let radiusMatch = false;
      if (currentUser.location?.lat != null && currentUser.location?.lng != null && b.meetingPointLat != null && b.meetingPointLng != null) {
        const dist = getDistance(
          currentUser.location.lat,
          currentUser.location.lng,
          b.meetingPointLat,
          b.meetingPointLng
        );
        if (dist <= 5) radiusMatch = true;
      }

      // FINAL LOCALITY MATCH:
      // If the user typed a specific area, we must match that area STRICTLY.
      // If the search is empty, we show profile matches + radius matches.
      const localityMatch = locAddr.trim() ? stringLocalityMatch : (stringLocalityMatch || radiusMatch);

      // If destination is empty, prioritize locality/radius match
      if (!destination.trim()) {
        if (!userCity && !userState && !manualLocation && !currentUser.location?.lat) return true;
        return localityMatch;
      } else {
        // Destination search
        const q = destination.trim().toLowerCase();
        const destMatch =
          b.destination.toLowerCase().includes(q) ||
          b.meetingPoint.toLowerCase().includes(q) ||
          b.driverName.toLowerCase().includes(q) ||
          b.vehicleName.toLowerCase().includes(q);

        return destMatch && localityMatch;
      }
    });

    // Sort results
    result.sort((a, b) => {
      // 1. User's active booking always first
      if (a.id === activeBookingId) return -1;
      if (b.id === activeBookingId) return 1;

      // 2. VIP & Verified
      const aVipVer = (a.vipLevel || 0) > 0 && a.isVerified;
      const bVipVer = (b.vipLevel || 0) > 0 && b.isVerified;
      if (aVipVer !== bVipVer) return aVipVer ? -1 : 1;

      // 3. VIP only
      const aVip = (a.vipLevel || 0) > 0;
      const bVip = (b.vipLevel || 0) > 0;
      if (aVip !== bVip) return aVip ? -1 : 1;

      // 4. Verified only
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;

      // 5. By listed first (createdAt)
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return aTime - bTime;
    });

    setFiltered(result);
      setVisibleCount(20);
      } catch (err) {
        console.error("Error in booking filter effect:", err);
        setFiltered([]);
      }
    }, [bookings, activeBookingId, currentUser, manualLocation]);

  const handleClearDestination = () => {
    setDestination("");
    if (destInputRef.current) {
      destInputRef.current.value = "";
      destInputRef.current.focus();
    }
  };

  const handleBookingChanged = (action: "booked" | "cancelled") => {
    if (action === "cancelled") {
      onCancelOccurred();
    }
  };

  const loadMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-700/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
              <FaSearch className="text-purple-400" size={12} />
            </div>
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-tight">Find a Ride</h3>
              <p className="text-purple-400/60 text-[9px] font-bold uppercase tracking-widest">
                Drivers near you heading your way
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {/* Destination input */}
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block flex items-center gap-1">
                <FaMapMarkerAlt className="text-red-400" size={8} /> Destination / Bus Stop
              </label>
              <div className="relative">
                <input
                  ref={destInputRef}
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Where are you going?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-purple-500 placeholder-gray-600 transition-colors pr-10"
                />
                {destination && (
                  <button
                    onClick={handleClearDestination}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </div>
              {!isLoaded && (
                <p className="text-[8px] text-purple-400/40 mt-1 uppercase font-bold tracking-tighter">
                  Initialising...
                </p>
              )}
            </div>

            {/* Location info & Manual Input */}
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block flex items-center gap-1">
                <FaMapMarkerAlt className="text-green-400" size={8} /> Your Locality
              </label>
              <div className="relative">
                <input
                  ref={locInputRef}
                  type="text"
                  value={manualLocation}
                  onBlur={() => setTimeout(() => setShowDriverSuggestions(false), 300)}
                  onChange={(e) => {
                    setManualLocation(e.target.value);
                    if (e.target.value.length > 0) {
                      setShowDriverSuggestions(true);
                    } else {
                      setShowDriverSuggestions(false);
                    }
                  }}
                  placeholder="Where are you? (e.g. Allen Avenue)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-purple-500 placeholder-gray-600 transition-colors pr-10"
                />
                
                {/* Driver-First Custom Suggestions */}
                <AnimatePresence>
                  {showDriverSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 right-0 top-full mt-1 z-[10000] bg-gray-900 border border-purple-500/40 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                    >
                      {activeDriverPoints.length > 0 ? (
                        <>
                          <div className="bg-purple-600/10 px-3 py-2 border-b border-white/5">
                            <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Available Driver Pickup Points</p>
                          </div>
                          
                          {/* Exact/String matches */}
                          {activeDriverPoints
                            .filter(p => {
                              if (!manualLocation) return true;
                              const normInput = normalizeForSearch(manualLocation);
                              const normPoint = normalizeForSearch(p);
                              return normPoint.includes(normInput);
                            })
                            .map((p, idx) => (
                              <button
                                key={`driver-p-${idx}`}
                                onClick={() => {
                                  setManualLocation(p);
                                  setShowDriverSuggestions(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-purple-600/10 border-b border-white/5 flex items-center gap-3 group transition-colors"
                              >
                                <div className="w-6 h-6 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-purple-600/20 transition-colors">
                                  <FaMapMarkerAlt className="text-purple-500" size={10} />
                                </div>
                                <span className="text-white text-[11px] font-medium truncate">{p}</span>
                              </button>
                            ))}

                                {/* No direct match? Show the error and nearby drivers */}
                                {manualLocation.length > 2 && 
                                 activeDriverPoints.filter(p => {
                                   const normInput = normalizeForSearch(manualLocation);
                                   const normPoint = normalizeForSearch(p);
                                   return normPoint.includes(normInput);
                                 }).length === 0 && (
                                  <div className="p-4 text-center">
                                    <p className="text-orange-400 text-[10px] font-black uppercase mb-3">
                                      No driver within this location, try entering another location
                                    </p>
                                    
                                    <div className="text-left">
                                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Nearby Suggested Drivers (within 2km)</p>
                                      {bookings
                                        .map(b => {
                                          const lat1 = currentUser.location?.lat;
                                          const lng1 = currentUser.location?.lng;
                                          const lat2 = b.meetingPointLat;
                                          const lng2 = b.meetingPointLng;
                                          const dist = (lat1 != null && lng1 != null && lat2 != null && lng2 != null) 
                                            ? getDistance(lat1, lng1, lat2, lng2) 
                                            : 999;
                                          return { ...b, dist };
                                        })
                                        .filter(b => b.dist <= 2)
                                        .sort((a, b) => a.dist - b.dist)
                                        .slice(0, 5)
                                  .map((b) => (
                                    <button
                                      key={`nearby-${b.id}`}
                                      onClick={() => {
                                        setManualLocation(b.meetingPoint);
                                        setShowDriverSuggestions(false);
                                      }}
                                      className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg mb-1 group"
                                    >
                                      <div className="w-7 h-7 rounded-full overflow-hidden border border-purple-500/30">
                                        <img src={b.driverImage || "/default-avatar.png"} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <p className="text-white text-[9px] font-bold truncate">{b.meetingPoint}</p>
                                        <p className="text-purple-400 text-[7px] font-black uppercase tracking-widest">{b.dist.toFixed(1)}km away • {b.driverFirstName}</p>
                                      </div>
                                      <FaChevronRight size={8} className="text-gray-600 group-hover:text-purple-400" />
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-8 text-center">
                          <FaCar className="text-gray-700 mx-auto mb-2 opacity-20" size={24} />
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">No active drivers found today</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {manualLocation && (
                  <button
                    onClick={() => setManualLocation("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </div>

              {/* Clickable Auto-detected location */}
              {(() => {
                const autoAddr = currentUser.location?.address || `${currentUser.city || ""} ${currentUser.state || ""}`.trim();
                if (!autoAddr || autoAddr === "Location not found") return null;

                return (
                  <button
                    onClick={() => setManualLocation(autoAddr)}
                    className="mt-1.5 w-full flex items-center gap-1.5 px-2 py-1 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 rounded-lg transition-all group text-left"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[7px] font-black text-green-500/70 uppercase tracking-widest leading-none">Auto-detected · Tap to use</p>
                      <p className="text-green-400/90 text-[9px] font-bold truncate mt-0.5 group-hover:text-green-300">
                        {autoAddr}
                      </p>
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Active booking notice & Tracking Map */}
        <AnimatePresence>
          {hasActiveBooking && activeBookingObj && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0 border border-amber-500/30">
                  <FaInfoCircle className="text-amber-400" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-amber-400 font-black text-xs uppercase tracking-widest">
                    You have an active seat
                  </p>
                  <p className="text-gray-300 text-[10px] font-medium mt-1 leading-relaxed">
                    You're booked with <strong className="text-white">{activeBookingDriverName}</strong> for a ride to <strong className="text-white">{activeBookingObj.destination}</strong>.
                    {activeBookingObj.status === 'departed' 
                      ? " Your trip has started! Tracking map is active below." 
                      : " Wait for the driver at the meeting point."}
                  </p>
                </div>
              </div>

              {/* LIVE TRACKING MAP FOR LOAD BOOKING */}
              {activeBookingObj.status === 'departed' && (
                <div className="bg-gray-900 border border-purple-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative h-[450px]">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 via-emerald-500 to-blue-600 z-10"></div>
                  
                  <BookingTrackingMap
                    pickup={{ 
                      lat: activeBookingObj.meetingPointLat || 0, 
                      lng: activeBookingObj.meetingPointLng || 0, 
                      address: activeBookingObj.meetingPoint 
                    }}
                    driver={{ 
                      lat: driverLocation?.lat || activeBookingObj.meetingPointLat || 0, 
                      lng: driverLocation?.lng || activeBookingObj.meetingPointLng || 0 
                    }}
                    destination={{ 
                      lat: activeBookingObj.destinationLat || 0, 
                      lng: activeBookingObj.destinationLng || 0, 
                      address: activeBookingObj.destination 
                    }}
                    customerImage={currentUser.photoURL || "/default-avatar.png"}
                    driverImage={activeBookingObj.driverImage}
                    plateNumber={activeBookingObj.vehiclePlate}
                    viewerRole="customer"
                    destinationLabel={activeBookingObj.destination}
                  />

                  {/* Tracking Overlay Info */}
                  <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                    <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl">
                      <p className="text-emerald-400 font-black text-[8px] uppercase tracking-widest mb-0.5">Trip Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-white font-black text-xs uppercase tracking-tighter">In Progress</p>
                      </div>
                    </div>

                    <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl text-right">
                      <p className="text-purple-400 font-black text-[8px] uppercase tracking-widest mb-0.5">Heading To</p>
                      <p className="text-white font-black text-xs uppercase tracking-tighter truncate max-w-[120px]">{activeBookingObj.destination}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
              <FaCar size={10} className="text-purple-400" />
              {loading ? "Searching..." : `${filtered.length} Ride${filtered.length !== 1 ? "s" : ""} Found`}
            </h4>
            <div className="flex items-center gap-2">
              {destination && (
                <span className="bg-purple-600/20 border border-purple-500/30 text-purple-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                  <FaFilter size={7} /> {destination.slice(0, 20)}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 bg-gray-800/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-14 bg-gray-900/50 border border-white/5 rounded-2xl"
            >
              <FaCar size={36} className="text-gray-700 mx-auto mb-4" />
              <h5 className="text-white font-black text-sm uppercase tracking-tight">No Rides Found</h5>
              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-[200px] mx-auto leading-relaxed">
                {destination
                  ? `No drivers going to "${destination}" near you`
                  : "No active load bookings in your area right now"}
              </p>
              <p className="text-gray-700 text-[9px] mt-3">Check back soon or clear your filter</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {filtered.slice(0, visibleCount).map((b, i) => (
                  <DriverLoadCard
                    key={b.id}
                    booking={b}
                    index={i}
                    isInactive={hasActiveBooking && b.id !== activeBookingId}
                    hasBooked={hasActiveBooking && b.id === activeBookingId}
                    onSelect={(bk) => {
                      setSelectedBooking(bk);
                    }}
                    onFlag={(bk) => setFlagBooking(bk)}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {filtered.length > visibleCount && (
                <button
                  onClick={loadMore}
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 border border-purple-500/30 text-purple-400 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 group shadow-lg shadow-purple-900/10"
                >
                  <FaSyncAlt className="group-hover:rotate-180 transition-transform duration-500" />
                  Load More Rides ({filtered.length - visibleCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Seat Selection Overlay */}
      <AnimatePresence>
        {selectedBooking && (
          <SeatSelectionOverlay
            booking={selectedBooking}
            currentUser={currentUser}
            onClose={() => setSelectedBooking(null)}
            onBookingChanged={(action) => {
              handleBookingChanged(action);
              if (action === "booked") setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Flag Driver Overlay */}
      <AnimatePresence>
        {flagBooking && (
          <LoadFlagOverlay
            isOpen={true}
            onClose={() => setFlagBooking(null)}
            bookingId={flagBooking.id}
            targetUser={{
              uid: flagBooking.driverId,
              fullName: flagBooking.driverName,
              type: "driver",
            }}
            reporterUser={{
              uid: currentUser.uid,
              fullName: currentUser.displayName,
            }}
          />
        )}
      </AnimatePresence>

      {/* ✅ NEW: Inactivity Warning Prompt for Load Bookings */}
      <AnimatePresence>
        {showLoadInactivityPrompt && activeBookingObj && activeBookingObj.status === 'departed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-md w-full bg-white rounded-[2.5rem] p-8 text-center shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
              
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <FaExclamationTriangle className="text-amber-500 text-3xl" />
              </div>

              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">Driver Inactive</h3>
              <p className="text-gray-500 text-sm font-medium mb-4">
                Your driver <span className="text-gray-900 font-bold">{activeBookingObj.driverName}</span> has not sent a location update for over 30 minutes.
              </p>
              <p className="text-gray-400 text-xs mb-8">
                If the driver remains inactive for 3 hours, the trip will be automatically cancelled.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    cancelLoadBookingDueToInactivity(activeBookingObj.id);
                    setShowLoadInactivityPrompt(false);
                  }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95"
                >
                  Cancel Trip
                </button>
                <button
                  onClick={() => {
                    setShowLoadInactivityPrompt(false);
                    setLoadInactivityDismissedAt(Date.now());
                  }}
                  className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all"
                >
                  Keep Trip — Driver is still on the way
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
