"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const [bookings, setBookings] = useState<LoadBooking[]>([]);
  const [filtered, setFiltered] = useState<LoadBooking[]>([]);
  const [destination, setDestination] = useState(initialSearch);
  const [manualLocation, setManualLocation] = useState(
    currentUser.location?.address || ""
  );
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<LoadBooking | null>(null);
  const [flagBooking, setFlagBooking] = useState<LoadBooking | null>(null);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeBookingDriverName, setActiveBookingDriverName] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [mapsReady, setMapsReady] = useState(false);

  const destInputRef = useRef<HTMLInputElement>(null);
  const destAcRef = useRef<google.maps.places.Autocomplete | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect Google Maps
  useEffect(() => {
    const checkReady = () => {
      if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
        setMapsReady(true);
      } else {
        setTimeout(checkReady, 500);
      }
    };
    checkReady();
  }, []);

  // Initialize Autocomplete directly on the input ref
  useEffect(() => {
    if (!mapsReady || !destInputRef.current || destAcRef.current) return;

    const ac = new google.maps.places.Autocomplete(destInputRef.current, {
      fields: ["formatted_address", "name", "geometry", "address_components"],
      componentRestrictions: { country: "ng" }, // Restrict to Nigeria
    });

    ac.addListener("place_changed", () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const place = ac.getPlace();
      const addr = place.formatted_address || place.name || "";
      setDestination(addr);
      if (destInputRef.current) destInputRef.current.value = addr;
    });

    destAcRef.current = ac;
  }, [mapsReady]);

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

      // 1. Locality match (String based)
      const stringLocalityMatch =
        (userCity && (bCity.includes(userCity) || userCity.includes(bCity))) ||
        (userState && (bState.includes(userState) || userState.includes(bState))) ||
        (locAddr && (bCity.includes(locAddr) || locAddr.includes(bCity) || bState.includes(locAddr) || locAddr.includes(bState)));

      // 2. Radius match (GPS based - 5km Discovery Radius)
      let radiusMatch = false;
      if (currentUser.location?.lat != null && currentUser.location?.lng != null && b.meetingPointLat != null && b.meetingPointLng != null) {
        const dist = getDistance(
          currentUser.location.lat,
          currentUser.location.lng,
          b.meetingPointLat,
          b.meetingPointLng
        );
        if (dist <= 5) radiusMatch = true; // 5km discovery for load bookings
      }

      const localityMatch = stringLocalityMatch || radiusMatch;

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
                  defaultValue={destination}
                  onChange={(e) => {
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    const val = e.target.value;
                    debounceTimerRef.current = setTimeout(() => {
                      setDestination(val);
                    }, 50);
                  }}
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
              {!mapsReady && (
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
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Enter your area (e.g. Ikeja, Lagos)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-purple-500 placeholder-gray-600 transition-colors pr-10"
                />
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
