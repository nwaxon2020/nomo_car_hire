"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCar, FaMapMarkerAlt, FaMoneyBillWave, FaClock,
  FaUsers, FaTimes, FaFlag, FaCheckCircle, FaChair,
  FaShieldAlt, FaInfoCircle, FaPhoneAlt, FaWhatsapp,
} from "react-icons/fa";
import {
  collection, onSnapshot, doc, updateDoc, getDoc,
  serverTimestamp, runTransaction, increment, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { LoadBooking, LoadSeat, getSeatLayout, getTodayString } from "./types";
import LoadFlagOverlay from "./LoadFlagOverlay";
import toast from "react-hot-toast";

interface SeatSelectionOverlayProps {
  booking: LoadBooking;
  currentUser: {
    uid: string;
    displayName: string;
    photoURL?: string;
    trustScore: number;
  };
  onClose: () => void;
  onBookingChanged: (action: "booked" | "cancelled") => void;
}

const formatTime = (t: string) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getTrustColor = (score: number) => {
  if (score >= 80) return "bg-green-500 text-white";
  if (score >= 60) return "bg-yellow-500 text-black";
  if (score >= 40) return "bg-orange-500 text-white";
  if (score >= 20) return "bg-red-500 text-white";
  return "bg-red-800 text-white";
};

export default function SeatSelectionOverlay({
  booking,
  currentUser,
  onClose,
  onBookingChanged,
}: SeatSelectionOverlayProps) {
  const [seats, setSeats] = useState<LoadSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null); // My current seat
  const [actionLoading, setActionLoading] = useState(false);
  const [flagBooking, setFlagBooking] = useState(false);
  const [globalSosNumber, setGlobalSosNumber] = useState<string>("+2348123456789");

  const layout = getSeatLayout(booking.totalSeats, booking.vehicleType);

  // Real-time seats subscription
  useEffect(() => {
    const seatsRef = collection(db, "loadBookings", booking.id, "seats");
    const unsub = onSnapshot(seatsRef, (snap) => {
      const data = snap.docs.map((d) => d.data() as LoadSeat);
      data.sort((a, b) => a.seatNumber - b.seatNumber);
      setSeats(data);

      // Find if I already have a seat
      const mySeat = data.find((s) => s.customerId === currentUser.uid);
      setSelectedSeat(mySeat?.seatNumber ?? null);

      setLoading(false);
    });

    // ✅ NEW: Fetch Global SOS Number
    const globalSosRef = doc(db, "site_configs", "mobility");
    const unsubGlobalSos = onSnapshot(globalSosRef, (snap) => {
      if (snap.exists() && snap.data().emergencySosPhone) {
        setGlobalSosNumber(snap.data().emergencySosPhone);
      }
    });

    return () => {
      unsub();
      unsubGlobalSos();
    };
  }, [booking.id, currentUser.uid]);

  const getSeat = (num: number) => seats.find((s) => s.seatNumber === num);

  const handleSeatClick = async (seatNum: number) => {
    const seat = getSeat(seatNum);
    if (!seat) return;

    // If I'm clicking the seat someone else booked → flag
    if (seat.status === "booked" && seat.customerId !== currentUser.uid) {
      setFlagBooking(true);
      return;
    }

    // If I'm clicking my own seat → cancel booking
    if (seat.customerId === currentUser.uid) {
      await handleCancelSeat(seatNum);
      return;
    }

    // If seat is available → book it (or move from current seat)
    await handleBookSeat(seatNum);
  };

  const handleBookSeat = async (seatNum: number) => {
    setActionLoading(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      
      const lastBookedCarId = userData.lastBookedCarId || null;
      let carSwitchCount = userData.carSwitchCount || 0;
      let trustScore = currentUser.trustScore;

      // Logic: if booking a DIFFERENT car than the last one, increment count
      // If booking the SAME car (e.g. they unselected and re-selected, or just moving seats), no penalty
      if (lastBookedCarId && lastBookedCarId !== booking.id) {
        carSwitchCount += 1;
        
        if (carSwitchCount >= 3) {
          trustScore = Math.max(0, trustScore - 20);
          carSwitchCount = 0; // Reset after penalty
          toast.error("Trust score reduced by 20% for switching cars 3 times!");
        } else {
          toast(`Car switch ${carSwitchCount}/3 before trust penalty`, { icon: '⚠️' });
        }
      }

      const bookingRef = doc(db, "loadBookings", booking.id);
      const newSeatRef = doc(db, "loadBookings", booking.id, "seats", String(seatNum));
      const newSeatSnap = await getDoc(newSeatRef);

      if (!newSeatSnap.exists() || newSeatSnap.data()?.status !== "available") {
        toast.error("This seat was just taken. Choose another.");
        return;
      }

      await runTransaction(db, async (tx) => {
        // Update user data (trust and switch tracking)
        tx.update(userRef, {
          lastBookedCarId: booking.id,
          carSwitchCount: carSwitchCount,
          trustScore: trustScore,
          updatedAt: serverTimestamp(),
        });

        // Release old seat if moving within the SAME car
        if (selectedSeat !== null) {
          const oldSeatRef = doc(db, "loadBookings", booking.id, "seats", String(selectedSeat));
          tx.update(oldSeatRef, {
            status: "available",
            customerId: null,
            customerName: null,
            customerImage: null,
            trustScore: null,
            bookedAt: null,
          });
          // No bookedCount change (same car, just moving)
        } else {
          // New booking — increment count
          tx.update(bookingRef, {
            bookedCount: increment(1),
            updatedAt: serverTimestamp(),
          });
        }

        // Book new seat
        tx.update(newSeatRef, {
          status: "booked",
          customerId: currentUser.uid,
          customerName: currentUser.displayName,
          customerImage: currentUser.photoURL || "",
          trustScore: trustScore,
          bookedAt: serverTimestamp(),
        });
      });

      toast.success(selectedSeat !== null ? `Moved to Seat ${seatNum}` : `Seat ${seatNum} booked!`);
      if (selectedSeat === null) onBookingChanged("booked");
    } catch (err) {
      console.error(err);
      toast.error("Failed to book seat. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSeat = async (seatNum: number) => {
    setActionLoading(true);
    try {
      const bookingRef = doc(db, "loadBookings", booking.id);
      const seatRef = doc(db, "loadBookings", booking.id, "seats", String(seatNum));

      await runTransaction(db, async (tx) => {
        tx.update(seatRef, {
          status: "available",
          customerId: null,
          customerName: null,
          customerImage: null,
          trustScore: null,
          bookedAt: null,
        });
        tx.update(bookingRef, {
          bookedCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      });

      toast.success("Booking cancelled");
      onBookingChanged("cancelled");
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const SeatBlock = ({ seatNum, rowLabel }: { seatNum: number; rowLabel?: string }) => {
    const seat = getSeat(seatNum);
    const isMyseat = seat?.customerId === currentUser.uid;
    const isTaken = seat?.status === "booked" && !isMyseat;
    const isAvailable = seat?.status === "available";

    const initials = seat?.customerName
      ? seat.customerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "";

    return (
      <button
        onClick={() => !actionLoading && handleSeatClick(seatNum)}
        disabled={actionLoading}
        className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border transition-all duration-200 w-16 h-20 group ${
          isMyseat
            ? "bg-green-500/20 border-green-500/50 shadow-green-500/20 shadow-lg"
            : isTaken
            ? "bg-gray-700/60 border-gray-600/40 cursor-pointer hover:border-red-500/40"
            : isAvailable
            ? "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-400/60 cursor-pointer"
            : "bg-gray-800 border-gray-700/30"
        }`}
      >
        {/* Seat number */}
        <span className={`text-[8px] font-black uppercase ${
          isMyseat ? "text-green-400" : isTaken ? "text-gray-500" : "text-purple-400"
        }`}>
          {seatNum}
        </span>

        {/* Seat icon / avatar */}
        {isTaken ? (
          <div className="w-8 h-8 rounded-full bg-gray-600 border border-gray-500 flex items-center justify-center overflow-hidden">
            {seat?.customerImage ? (
              <img src={seat.customerImage} className="w-full h-full object-cover" alt="customer" />
            ) : (
              <span className="text-white text-[9px] font-black">{initials || "?"}</span>
            )}
          </div>
        ) : isMyseat ? (
          <div className="w-8 h-8 rounded-full bg-green-500 border border-green-400 flex items-center justify-center">
            <FaCheckCircle className="text-white" size={12} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <FaChair className="text-purple-400" size={12} />
          </div>
        )}

        {/* Trust dot (visible on taken seat – only position, not score) */}
        {isTaken && seat?.trustScore !== undefined && (
          <div
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center border border-gray-900 ${getTrustColor(seat.trustScore)}`}
          >
            {Math.round(seat.trustScore / 10)}
          </div>
        )}

        {/* My trust on my seat */}
        {isMyseat && (
          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${getTrustColor(currentUser.trustScore)}`}>
            {currentUser.trustScore}%
          </span>
        )}

        {/* Flag hint on taken seat */}
        {isTaken && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Tap to flag
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-purple-700/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700/40 to-violet-700/30 border-b border-purple-500/20 p-4 flex items-center gap-3 shrink-0">
          <div className="flex-1">
            <h3 className="text-white font-black text-sm uppercase tracking-tight">
              Choose Your Seat
            </h3>
            <p className="text-purple-300 text-[9px] font-bold uppercase tracking-widest mt-0.5">
              {booking.driverName} · {booking.vehicleName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <FaTimes className="text-white" size={12} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Trip summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
              <FaMapMarkerAlt className="text-red-400 shrink-0" size={10} />
              <div className="min-w-0">
                <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest">To</p>
                <p className="text-white text-[10px] font-bold truncate">{booking.destination}</p>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
              <FaMapMarkerAlt className="text-green-400 shrink-0" size={10} />
              <div className="min-w-0">
                <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Meet at</p>
                <p className="text-white text-[10px] font-bold truncate">{booking.meetingPoint}</p>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-400 shrink-0" size={10} />
              <div>
                <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Fare</p>
                <p className="text-white text-[10px] font-bold">₦{booking.fare.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
              <FaClock className="text-blue-400 shrink-0" size={10} />
              <div>
                <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Departs</p>
                <p className="text-white text-[10px] font-bold">{formatTime(booking.departureTime)}</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-500/50 border border-purple-500/50" />
              <span className="text-[9px] text-gray-500 font-bold">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[9px] text-gray-500 font-bold">Your Seat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-600" />
              <span className="text-[9px] text-gray-500 font-bold">Taken (tap→flag)</span>
            </div>
          </div>

          {/* Seat Visual — Car Diagram */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-gray-950 border border-white/5 rounded-2xl p-5 relative">
              {/* Car roof indicator */}
              <div className="flex items-center justify-center mb-5">
                <div className="bg-gray-800 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                  <FaCar className="text-purple-400" size={14} />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Driver (Front)
                  </span>
                </div>
              </div>

              {/* Front passenger */}
              {layout.front.length > 0 && (
                <div className="mb-4">
                  <p className="text-[7px] text-gray-700 font-black uppercase tracking-widest text-center mb-2">
                    — Front Passenger —
                  </p>
                  <div className="flex justify-end pr-4">
                    {layout.front.map((n) => (
                      <SeatBlock key={n} seatNum={n} />
                    ))}
                  </div>
                </div>
              )}

              {/* Middle row */}
              {layout.middle.length > 0 && (
                <div className="mb-4">
                  <p className="text-[7px] text-gray-700 font-black uppercase tracking-widest text-center mb-2">
                    — Middle Row —
                  </p>
                  <div className="flex justify-center gap-2">
                    {layout.middle.map((n) => (
                      <SeatBlock key={n} seatNum={n} />
                    ))}
                  </div>
                </div>
              )}

              {/* Back row */}
              {layout.back.length > 0 && (
                <div>
                  <p className="text-[7px] text-gray-700 font-black uppercase tracking-widest text-center mb-2">
                    — Back Row —
                  </p>
                  <div className="flex justify-center gap-3">
                    {layout.back.map((n) => (
                      <SeatBlock key={n} seatNum={n} />
                    ))}
                  </div>
                </div>
              )}

              {/* Seat status */}
              <div className="mt-5 flex items-center justify-center gap-3">
                <span className="text-[9px] text-gray-600 font-bold">
                  {seats.filter(s => s.status === "booked").length}/{booking.totalSeats} booked
                </span>
                <div className="h-1 w-24 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500"
                    style={{ width: `${(seats.filter(s => s.status === "booked").length / booking.totalSeats) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
            <FaInfoCircle className="text-blue-400 shrink-0 mt-0.5" size={11} />
            <p className="text-[10px] text-blue-300 font-medium leading-relaxed">
              Tap an <strong>available seat</strong> to book it. Changing seat within this car will <strong>not</strong> reduce your trust score. Tap a <strong>taken seat</strong> to flag that customer. Tap <strong>your own seat</strong> to cancel.
            </p>
          </div>

          {/* Cancel booking */}
          {selectedSeat !== null && (
            <button
              onClick={() => handleCancelSeat(selectedSeat)}
              disabled={actionLoading}
              className="w-full py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600/30 transition-all flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Cancel Seat {selectedSeat} Booking</>
              )}
            </button>
          )}

          {/* Global SOS Controls */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <a
              href={`tel:${globalSosNumber}`}
              className="flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-900/20 active:scale-95 transition-all"
            >
              <FaPhoneAlt size={10} /> SOS Call
            </a>
            <a
              href={`https://wa.me/${globalSosNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`🚨 EMERGENCY ALERT 🚨\n\nI need assistance in Load Booking ${booking.id}!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
            >
              <FaWhatsapp size={12} /> SOS Chat
            </a>
          </div>

          {/* Flag driver button */}
          <button
            onClick={() => setFlagBooking(true)}
            className="w-full py-2.5 bg-gray-800/10 border border-gray-800 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-800 hover:text-red-400 transition-all flex items-center justify-center gap-2"
          >
            <FaFlag size={9} /> Flag Driver / Feedback
          </button>
        </div>
      </motion.div>

      {/* Flag driver overlay */}
      <AnimatePresence>
        {flagBooking && (
          <LoadFlagOverlay
            isOpen={true}
            onClose={() => setFlagBooking(false)}
            bookingId={booking.id}
            targetUser={{
              uid: booking.driverId,
              fullName: booking.driverName,
              type: "driver",
            }}
            reporterUser={{
              uid: currentUser.uid,
              fullName: currentUser.displayName,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
