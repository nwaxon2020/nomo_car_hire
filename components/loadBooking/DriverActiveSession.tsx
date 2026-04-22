"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import {
  FaCar, FaUsers, FaMapMarkerAlt, FaMoneyBillWave, FaClock,
  FaFlag, FaCheckCircle, FaBell, FaStop,
} from "react-icons/fa";
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { LoadBooking, LoadSeat, getSeatLayout } from "./types";
import LoadFlagOverlay from "./LoadFlagOverlay";
import toast from "react-hot-toast";

const MAP_LIBRARIES: ("places")[] = ["places"];

interface DriverActiveSessionProps {
  booking: LoadBooking;
  driverId: string;
  driverName: string;
  onEndSession: () => void;
}

const getTrustColor = (score?: number) => {
  if (!score && score !== 0) return "bg-gray-500";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  if (score >= 20) return "bg-red-500";
  return "bg-red-800";
};

export default function DriverActiveSession({
  booking,
  driverId,
  driverName,
  onEndSession,
}: DriverActiveSessionProps) {
  const [seats, setSeats] = useState<LoadSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagTarget, setFlagTarget] = useState<{ seat: LoadSeat } | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const { isLoaded: mapLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const layout = getSeatLayout(booking.totalSeats, booking.vehicleType);
  const bookedSeats = seats.filter((s) => s.status === "booked").length;
  const isFullyBooked = bookedSeats >= booking.totalSeats;

  // Real-time seat listener
  useEffect(() => {
    const seatsRef = collection(db, "loadBookings", booking.id, "seats");
    const unsub = onSnapshot(seatsRef, (snap) => {
      const data = snap.docs.map((d) => d.data() as LoadSeat);
      data.sort((a, b) => a.seatNumber - b.seatNumber);
      setSeats(data);
      setLoading(false);
    });
    return () => unsub();
  }, [booking.id]);

  const handleEndSession = async () => {
    setEndingSession(true);
    try {
      await updateDoc(doc(db, "loadBookings", booking.id), {
        status: "departed",
        updatedAt: serverTimestamp(),
      });
      toast.success("Session ended. Have a safe trip!");
      onEndSession();
    } catch {
      toast.error("Failed to end session");
    } finally {
      setEndingSession(false);
      setShowEndConfirm(false);
    }
  };

  const mapCenter = {
    lat: booking.meetingPointLat || 6.5244,
    lng: booking.meetingPointLng || 3.3792,
  };

  const hasValidCoords = (booking.meetingPointLat || 0) !== 0 && (booking.meetingPointLng || 0) !== 0;

  const formatTime = (t: string) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hour = Number(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {/* Fully Booked Banner */}
      <AnimatePresence>
        {isFullyBooked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-600/30 to-emerald-600/20 border border-green-500/40 rounded-xl p-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <FaBell className="text-white" size={12} />
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-black text-[11px] uppercase tracking-widest">
                🎉 Car Fully Booked!
              </p>
              <p className="text-green-400/70 text-[9px] font-bold uppercase tracking-wider">
                All {booking.totalSeats} seats have been taken. Ready to depart!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip Info Card */}
      <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-black text-sm uppercase tracking-tight">Active Session</h3>
          <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900/50 rounded-lg p-2.5">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
              <FaMapMarkerAlt className="text-red-400" size={7} /> Destination
            </p>
            <p className="text-white font-bold text-[11px] leading-tight">{booking.destination}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2.5">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
              <FaMoneyBillWave className="text-green-400" size={7} /> Fare / Seat
            </p>
            <p className="text-white font-bold text-[11px]">₦{booking.fare.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2.5">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
              <FaClock className="text-blue-400" size={7} /> Departure
            </p>
            <p className="text-white font-bold text-[11px]">{formatTime(booking.departureTime)}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2.5">
            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
              <FaUsers className="text-purple-400" size={7} /> Seats Booked
            </p>
            <p className="text-white font-bold text-[11px]">
              {bookedSeats} / {booking.totalSeats}
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Point Map */}
      <div className="bg-gray-800/50 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <FaMapMarkerAlt className="text-green-400" size={12} />
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Your Meeting Point</p>
            <p className="text-white text-[11px] font-bold leading-tight mt-0.5">{booking.meetingPoint}</p>
          </div>
        </div>
        <div className="h-44 relative">
          {mapLoaded && hasValidCoords ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={mapCenter}
              zoom={15}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
                  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
                  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d44" }] },
                  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                ],
              }}
            >
              <Marker
                position={mapCenter}
                icon={{
                  url: "data:image/svg+xml;base64," + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                      <ellipse cx="16" cy="36" rx="8" ry="3" fill="rgba(0,0,0,0.3)"/>
                      <path d="M16 0C9.4 0 4 5.4 4 12c0 9 12 24 12 24s12-15 12-24C28 5.4 22.6 0 16 0z" fill="#f59e0b"/>
                      <circle cx="16" cy="12" r="5" fill="white"/>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(32, 40),
                  anchor: new window.google.maps.Point(16, 40),
                }}
              />
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              {mapLoaded && !hasValidCoords ? (
                <div className="text-center">
                  <FaMapMarkerAlt className="text-gray-600 mx-auto mb-2" size={24} />
                  <p className="text-gray-600 text-[10px] font-bold">Location coordinates unavailable</p>
                </div>
              ) : (
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Seat Manager */}
      <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5">
            <FaCar className="text-amber-400" size={11} /> Seat Status
          </h4>
          <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
            Tap a booked seat to flag customer
          </p>
        </div>

        {loading ? (
          <div className="flex gap-2">
            {Array.from({ length: booking.totalSeats }).map((_, i) => (
              <div key={i} className="flex-1 h-14 bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Car layout visual */}
            <div className="relative bg-gray-900 rounded-2xl p-4 border border-white/5">
              {/* Dashboard indicator */}
              <div className="flex items-center justify-center mb-3">
                <div className="bg-gray-700 rounded-lg px-4 py-1.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Driver Seat</span>
                </div>
              </div>

              {/* Front row */}
              {layout.front.length > 0 && (
                <div className="mb-2">
                  <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest text-center mb-1.5">Front</p>
                  <div className="flex justify-end gap-2 px-4">
                    {layout.front.map((n) => <SeatButton key={n} seatNum={n} seats={seats} onFlag={setFlagTarget} />)}
                  </div>
                </div>
              )}

              {/* Middle row */}
              {layout.middle.length > 0 && (
                <div className="mb-2">
                  <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest text-center mb-1.5">Middle</p>
                  <div className="flex justify-center gap-2">
                    {layout.middle.map((n) => <SeatButton key={n} seatNum={n} seats={seats} onFlag={setFlagTarget} />)}
                  </div>
                </div>
              )}

              {/* Back row */}
              {layout.back.length > 0 && (
                <div>
                  <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest text-center mb-1.5">Back</p>
                  <div className="flex justify-center gap-2">
                    {layout.back.map((n) => <SeatButton key={n} seatNum={n} seats={seats} onFlag={setFlagTarget} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Booked customer list */}
            {seats.filter(s => s.status === "booked").length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Booked Customers</p>
                {seats.filter(s => s.status === "booked").map((seat) => (
                  <div key={seat.seatNumber} className="flex items-center gap-2.5 bg-gray-900/50 border border-white/5 rounded-lg p-2">
                    <div className="w-7 h-7 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 font-black text-[10px]">
                      {seat.seatNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[11px] font-bold truncate">{seat.customerName || "Customer"}</p>
                    </div>
                    {/* Trust badge */}
                    {seat.trustScore !== undefined && seat.trustScore !== null && (
                      <div className={`w-8 h-8 rounded-full ${getTrustColor(seat.trustScore)} flex items-center justify-center text-white text-[9px] font-black shadow-sm`}>
                        {seat.trustScore}%
                      </div>
                    )}
                    <button
                      onClick={() => setFlagTarget({ seat })}
                      className="w-7 h-7 flex items-center justify-center bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <FaFlag size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* End Session */}
      <div className="pt-2">
        {showEndConfirm ? (
          <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-black text-[11px] uppercase tracking-widest mb-3 text-center">
              End session and mark as departed?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                disabled={endingSession}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-all"
              >
                {endingSession ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaStop size={9} /> End</>}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowEndConfirm(true)}
            className="w-full py-3 bg-gray-800 border border-red-500/30 text-red-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
          >
            <FaStop size={9} /> End Session / Departed
          </button>
        )}
      </div>

      {/* Flag Overlay */}
      <AnimatePresence>
        {flagTarget && (
          <LoadFlagOverlay
            isOpen={true}
            onClose={() => setFlagTarget(null)}
            bookingId={booking.id}
            seatNumber={flagTarget.seat.seatNumber}
            targetUser={{
              uid: flagTarget.seat.customerId || "",
              fullName: flagTarget.seat.customerName || "Customer",
              type: "customer",
            }}
            reporterUser={{ uid: driverId, fullName: driverName }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Seat button sub-component
function SeatButton({
  seatNum,
  seats,
  onFlag,
}: {
  seatNum: number;
  seats: LoadSeat[];
  onFlag: (target: { seat: LoadSeat }) => void;
}) {
  const seat = seats.find((s) => s.seatNumber === seatNum);
  const isBooked = seat?.status === "booked";
  const initials = seat?.customerName
    ? seat.customerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

  return (
    <button
      onClick={() => isBooked && seat && onFlag({ seat })}
      className={`relative w-14 h-16 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
        isBooked
          ? "bg-red-500/20 border-red-500/40 cursor-pointer hover:border-red-400"
          : "bg-green-500/10 border-green-500/20 cursor-default"
      }`}
    >
      <span className="text-[8px] font-black text-gray-500 uppercase">{seatNum}</span>
      {isBooked ? (
        <>
          <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center text-white text-[9px] font-black">
            {initials || "?"}
          </div>
          <FaFlag className="text-red-400" size={7} />
        </>
      ) : (
        <FaCheckCircle className="text-green-400" size={14} />
      )}
    </button>
  );
}
