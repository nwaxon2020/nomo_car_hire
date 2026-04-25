"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  FaSearch, FaMapMarkerAlt, FaFilter, FaSyncAlt,
  FaCar, FaUsers, FaInfoCircle, FaChevronRight, FaTimes,
} from "react-icons/fa";
import {
  collection, query, where, onSnapshot, getDocs,
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { LoadBooking, getTodayString } from "./types";
import DriverLoadCard from "./DriverLoadCard";
import SeatSelectionOverlay from "./SeatSelectionOverlay";
import LoadFlagOverlay from "./LoadFlagOverlay";

const GOOGLE_LIBRARIES: ("places")[] = ["places"];

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

  // Width matching logic for all inputs
  useEffect(() => {
    const matchWidth = (e: FocusEvent) => {
      const input = e.target as HTMLInputElement;
      const width = input.offsetWidth;
      setTimeout(() => {
        const containers = document.querySelectorAll('.pac-container') as NodeListOf<HTMLElement>;
        containers.forEach(c => {
          c.style.width = `${width}px`;
        });
      }, 10);
    };

    const dIn = destInputRef.current;
    const lIn = locInputRef.current;
    dIn?.addEventListener('focus', matchWidth);
    lIn?.addEventListener('focus', matchWidth);
    return () => {
      dIn?.removeEventListener('focus', matchWidth);
      lIn?.removeEventListener('focus', matchWidth);
    };
  }, [isLoaded]);

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
      where("status", "==", "active"),
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

  // Check if user already has an active seat somewhere
  useEffect(() => {
    if (!currentUser.uid || bookings.length === 0) return;

    const checkSeats = async () => {
      let found = false;
      let driverName = "";
      let foundId: string | null = null;

      for (const booking of bookings) {
        const seatsSnap = await getDocs(
          collection(db, "loadBookings", booking.id, "seats")
        );
        const mySeat = seatsSnap.docs.find(
          (d) => d.data().customerId === currentUser.uid && d.data().status === "booked"
        );
        if (mySeat) {
          found = true;
          driverName = booking.driverName;
          foundId = booking.id;
          break;
        }
      }
      setHasActiveBooking(found);
      setActiveBookingDriverName(driverName);
      setActiveBookingId(foundId);
    };

    checkSeats();
  }, [bookings, currentUser.uid]);

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
    if (bookings.length === 0) {
      setFiltered([]);
      return;
    }

    const userCity = (currentUser.city || "").toLowerCase();
    const userState = (currentUser.state || "").toLowerCase();
    const locAddr = (manualLocation || "").toLowerCase();

    let result = bookings.filter((b) => b.driverId !== currentUser.uid);

    // Filter logic
    result = result.filter((b) => {
      // ALWAYS include their active booking so they can manage it
      if (b.id === activeBookingId) return true;

      const bCity = (b.driverCity || "").toLowerCase();
      const bState = (b.driverState || "").toLowerCase();

      // 1. Locality match
      let stringLocalityMatch = false;

      if (locAddr.trim()) {
        // Strict match against the driver's set meeting point only
        const normInput = normalizeForSearch(locAddr);
        const normPoint = normalizeForSearch(b.meetingPoint || "");
        stringLocalityMatch = normPoint.includes(normInput);
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
    setVisibleCount(20); // Reset count on filter change
  }, [bookings, destination, currentUser, activeBookingId, manualLocation]);

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
                  onFocus={() => setShowDriverSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDriverSuggestions(false), 300)}
                  onChange={(e) => setManualLocation(e.target.value)}
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

        {/* Active booking notice */}
        <AnimatePresence>
          {hasActiveBooking && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5"
            >
              <FaInfoCircle className="text-amber-400 shrink-0 mt-0.5" size={12} />
              <div>
                <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest">
                  You have an active seat
                </p>
                <p className="text-gray-400 text-[9px] font-medium mt-0.5">
                  You're booked with <strong className="text-white">{activeBookingDriverName}</strong>.
                  Cancel that seat first before booking another driver.
                </p>
              </div>
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
    </>
  );
}
