"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import {
  FaCar, FaUsers, FaMapMarkerAlt, FaMoneyBillWave, FaClock,
  FaFlag, FaCheckCircle, FaBell, FaStop,
} from "react-icons/fa";
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDoc, deleteDoc, arrayUnion
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { LoadBooking, LoadSeat, getSeatLayout, getTodayString, getTomorrowString } from "./types";
import LoadFlagOverlay from "./LoadFlagOverlay";
import toast from "react-hot-toast";

const MAP_LIBRARIES: ("places")[] = ["places"];

interface DriverActiveSessionProps {
  booking: LoadBooking;
  driverId: string;
  driverName: string;
  trustScore?: number;
  onEndSession: () => void;
  onCancelOccurred?: () => void;
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
  trustScore,
  onEndSession,
  onCancelOccurred,
}: DriverActiveSessionProps) {
  const [seats, setSeats] = useState<LoadSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagTarget, setFlagTarget] = useState<{ seat: LoadSeat } | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [tripStarted, setTripStarted] = useState(booking.status === "departed");
  const [arriving, setArriving] = useState(false);
  const [tripIds, setTripIds] = useState<string[]>([]);

  // Cancel flow state
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  // Handle cancel session
  const handleCancelSession = async () => {
    setCancelling(true);
    try {
      const today = getTodayString();

      // 1. Mark the booking as cancelled
      await updateDoc(doc(db, "loadBookings", booking.id), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. If there were booked passengers, apply trust penalty
      if (bookedSeats > 0) {
        const driverRef = doc(db, "users", driverId);
        const snap = await getDoc(driverRef);
        if (snap.exists()) {
          const data = snap.data();
          const currentScore = data.driverTrustScore ?? 100;
          const newScore = Math.max(0, currentScore - 25);

          const updates: any = {
            driverTrustScore: newScore,
            driverTrustCancels: (data.driverTrustCancels ?? 0) + 1,
          };

          if (newScore === 0) {
            updates.driverTrustExhaustedAt = today;
            updates.driverLoadBlockedUntil = getTomorrowString();
          }

          await updateDoc(driverRef, updates);
        }
        onCancelOccurred?.();
        toast.error("Session cancelled. Trust score reduced by 25%.");
      } else {
        toast.success("Session cancelled.");
      }

      setShowCancelWarning(false);
      onEndSession();
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel session.");
    } finally {
      setCancelling(false);
    }
  };

  // Start Trip: Creates ACTIVE trips for all passengers, marks booking as departed
  const handleStartTrip = async () => {
    setEndingSession(true);
    try {
      // 1. Update Load Booking status to departed
      await updateDoc(doc(db, "loadBookings", booking.id), {
        status: "departed",
        departedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create ACTIVE trip documents for each booked seat (not completed yet)
      const bookedSeatsList = seats.filter(s => s.status === "booked" && s.customerId);
      const createdTripIds: string[] = [];

      for (const seat of bookedSeatsList) {
        const tripData = {
          driverId,
          driverName,
          vehicleId: booking.vehicleId || "",
          customerId: seat.customerId,
          customerName: seat.customerName || "Customer",
          pickupLocation: booking.meetingPoint,
          destination: booking.destination,
          fare: booking.fare,
          status: 'active', // Active until driver arrives at destination
          startTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          type: 'load_booking',
          loadBookingId: booking.id,
        };
        const tripDoc = await addDoc(collection(db, 'trips'), tripData);
        createdTripIds.push(tripDoc.id);
      }

      setTripIds(createdTripIds);

      // 3. Update driver's customersCarried count
      const driverRef = doc(db, 'users', driverId);
      const driverDoc = await getDoc(driverRef);
      const driverData = driverDoc.data() || {};
      const currentCustomers = driverData.customersCarried || [];
      
      const newTripEntries = bookedSeatsList.map(seat => `${seat.customerId}_${booking.id}`);
      const updatedCustomers = [...currentCustomers, ...newTripEntries];

      await updateDoc(driverRef, {
        customersCarried: updatedCustomers,
        updatedAt: serverTimestamp()
      });

      setTripStarted(true);
      toast.success("Trip started! Navigate to destination.");
    } catch (error) {
      console.error("Error starting trip:", error);
      toast.error("Failed to start trip");
    } finally {
      setEndingSession(false);
      setShowEndConfirm(false);
    }
  };

  // Arrive at Destination: Completes ALL active trips, updates trip history for ALL passengers
  const handleArriveDestination = async () => {
    setArriving(true);
    try {
      const endTime = serverTimestamp();

      // If we don't have tripIds from this session, query them from Firestore
      let idsToComplete = tripIds;
      if (idsToComplete.length === 0) {
        const { query, where, getDocs } = await import("firebase/firestore");
        const tripsRef = collection(db, 'trips');
        const q = query(tripsRef,
          where('loadBookingId', '==', booking.id),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        idsToComplete = snap.docs.map(d => d.id);
      }

      // Mark ALL trips as completed and update profile histories
      for (const tripId of idsToComplete) {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (tripSnap.exists()) {
          const tripData = tripSnap.data();
          const historyItem = {
            tripId,
            driverId: tripData.driverId,
            driverName: tripData.driverName || "Driver",
            customerId: tripData.customerId,
            pickupLocation: tripData.pickupLocation,
            destination: tripData.destination,
            fare: tripData.fare,
            status: 'completed',
            startTime: tripData.startTime,
            endTime,
            createdAt: tripData.createdAt,
            updatedAt: serverTimestamp(),
            type: 'load_booking'
          };

          await updateDoc(tripRef, {
            status: 'completed',
            endTime,
            updatedAt: serverTimestamp(),
          });

          // Push to customer history
          if (tripData.customerId) {
            await updateDoc(doc(db, 'users', tripData.customerId), {
              tripHistory: arrayUnion(historyItem)
            });
          }
          
          // Push to driver history (optional but good for bookkeeping)
          if (tripData.driverId) {
            await updateDoc(doc(db, 'users', tripData.driverId), {
              tripHistory: arrayUnion(historyItem)
            });
          }
        }
      }

      // Update load booking as completed
      await updateDoc(doc(db, "loadBookings", booking.id), {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Trip completed! All passengers' trip history updated.");
      onEndSession();
    } catch (error) {
      console.error("Error completing trip:", error);
      toast.error("Failed to complete trip");
    } finally {
      setArriving(false);
    }
  };


  const mapCenter = (tripStarted && booking.destinationLat && booking.destinationLng) 
    ? { lat: booking.destinationLat, lng: booking.destinationLng }
    : {
        lat: booking.meetingPointLat || 6.5244,
        lng: booking.meetingPointLng || 3.3792,
      };

  const hasValidCoords = tripStarted 
    ? (booking.destinationLat || 0) !== 0 && (booking.destinationLng || 0) !== 0
    : (booking.meetingPointLat || 0) !== 0 && (booking.meetingPointLng || 0) !== 0;

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
          <div className="flex items-center gap-3">
            {booking.vehicleSideImage && (
              <div className="w-10 h-8 rounded-lg overflow-hidden border border-white/10 bg-gray-900 shrink-0">
                <img
                  src={booking.vehicleSideImage}
                  alt="Vehicle"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h3 className="text-white font-black text-sm uppercase tracking-tight">Active Session</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
            {trustScore !== undefined && (
              <span className={`${getTrustColor(trustScore)} text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg`}>
                Trust: {trustScore}%
              </span>
            )}
          </div>
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
          <FaMapMarkerAlt className={tripStarted ? "text-red-400" : "text-green-400"} size={12} />
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              {tripStarted ? "Destination Point" : "Your Meeting Point"}
            </p>
            <p className="text-white text-[11px] font-bold leading-tight mt-0.5">
              {tripStarted ? booking.destination : booking.meetingPoint}
            </p>
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
                      <path d="M16 0C9.4 0 4 5.4 4 12c0 9 12 24 12 24s12-15 12-24C28 5.4 22.6 0 16 0z" fill="${tripStarted ? "#ef4444" : "#f59e0b"}"/>
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

      {/* Start/Arrive Button Section */}
      <div className="pt-2">
        {!tripStarted ? (
          isFullyBooked ? (
            showEndConfirm ? (
              <div className="bg-amber-600/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 font-black text-[11px] uppercase tracking-widest mb-3 text-center">
                  Ready to depart with {bookedSeats} passengers?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Wait
                  </button>
                  <button
                    onClick={handleStartTrip}
                    disabled={endingSession}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5"
                  >
                    {endingSession ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Start Trip"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
              >
                <FaCheckCircle size={9} /> Start Trip / Departed
              </button>
            )
          ) : (
            /* Waiting for all seats to be booked */
            <div className="bg-gray-800/60 border border-white/10 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <p className="text-amber-400 font-black text-[11px] uppercase tracking-widest">
                  Waiting for passengers
                </p>
              </div>
              <p className="text-gray-500 text-[10px] font-bold">
                {booking.totalSeats - bookedSeats} seat{booking.totalSeats - bookedSeats !== 1 ? "s" : ""} remaining before you can start the trip.
              </p>
              <div className="flex gap-1 mt-3">
                {Array.from({ length: booking.totalSeats }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${i < bookedSeats ? "bg-amber-500" : "bg-gray-700"}`}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <button
            onClick={handleArriveDestination}
            disabled={arriving}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
          >
            {arriving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FaFlag size={9} /> I Have Arrived / End Trip</>
            )}
          </button>
        )}
      </div>

      {/* Cancel Session Button — only before trip starts */}
      {!tripStarted && (
        <div className="pt-1">
          <button
            onClick={() => setShowCancelWarning(true)}
            className="w-full py-2.5 bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
          >
            <FaStop size={8} /> Cancel Session
          </button>
        </div>
      )}

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

      {/* Cancel Warning Modal */}
      <AnimatePresence>
        {showCancelWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-950 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaStop className="text-red-400" size={18} />
              </div>

              {bookedSeats > 0 ? (
                <>
                  <p className="text-red-400 font-black text-[11px] uppercase tracking-widest text-center mb-1">Trust Penalty Warning</p>
                  <p className="text-white font-bold text-sm text-center mb-3">
                    {bookedSeats} passenger{bookedSeats !== 1 ? "s have" : " has"} already booked!
                  </p>
                  <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-3 mb-4">
                    <p className="text-red-300 text-[10px] font-bold text-center">
                      Cancelling now will reduce your driver trust score by <span className="text-red-400 font-black">25%</span>.
                      {(trustScore ?? 100) <= 25 ? " Your trust will hit 0% and you won't be able to set up another trip today." : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelWarning(false)}
                      className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Keep Session
                    </button>
                    <button
                      onClick={handleCancelSession}
                      disabled={cancelling}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5"
                    >
                      {cancelling ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Cancel Anyway"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white font-bold text-sm text-center mb-2">Cancel this session?</p>
                  <p className="text-gray-500 text-[10px] font-bold text-center mb-4">
                    No passengers have booked yet. Your trust score won't be affected.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelWarning(false)}
                      className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Keep Session
                    </button>
                    <button
                      onClick={handleCancelSession}
                      disabled={cancelling}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5"
                    >
                      {cancelling ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Yes, Cancel"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
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
