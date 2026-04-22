"use client";

import { motion } from "framer-motion";
import {
  FaCar, FaMapMarkerAlt, FaMoneyBillWave, FaClock,
  FaUsers, FaFlag, FaChevronRight, FaCheckCircle,
} from "react-icons/fa";
import { LoadBooking } from "./types";

interface DriverLoadCardProps {
  booking: LoadBooking;
  onSelect: (booking: LoadBooking) => void;
  onFlag: (booking: LoadBooking) => void;
  index?: number;
}

const formatTime = (t: string) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getSeatsColor = (booked: number, total: number) => {
  const avail = total - booked;
  if (avail === 0) return "text-red-400 bg-red-500/10 border-red-500/20";
  if (avail === 1) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  return "text-green-400 bg-green-500/10 border-green-500/20";
};

export default function DriverLoadCard({
  booking,
  onSelect,
  onFlag,
  index = 0,
}: DriverLoadCardProps) {
  const availableSeats = booking.totalSeats - booking.bookedCount;
  const isFullyBooked = availableSeats === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group ${
        isFullyBooked
          ? "border-gray-700/50 opacity-70"
          : "border-purple-700/30 hover:border-purple-500/50 hover:shadow-purple-900/20 hover:shadow-2xl"
      }`}
    >
      {/* Fully booked overlay */}
      {isFullyBooked && (
        <div className="absolute top-3 left-3 z-10 bg-red-600/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-red-400/30">
          Fully Booked
        </div>
      )}

      {/* Top: vehicle type banner */}
      <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600" />

      <div className="p-4">
        {/* Driver + Vehicle Info */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-gray-700">
            {booking.driverImage ? (
              <img src={booking.driverImage} alt={booking.driverName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
                <span className="text-white font-black text-base">
                  {booking.driverFirstName?.[0] || booking.driverName[0]}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-white font-black text-sm leading-tight truncate">
                {booking.driverName}
              </h3>
              {booking.isVerified && (
                <FaCheckCircle className="text-green-400 shrink-0" size={10} title="Verified Driver" />
              )}
              {(booking.vipLevel || 0) > 0 && (
                <div className="bg-amber-500/20 border border-amber-500/40 rounded-md px-1.5 py-0.5 flex items-center gap-1 shrink-0">
                  <span className="text-[7px] font-black text-amber-400 uppercase tracking-tighter">VIP</span>
                </div>
              )}
            </div>
            <p className="text-purple-300 text-[10px] font-bold uppercase tracking-widest">
              {booking.vehicleType}
            </p>
          </div>

          {/* Seats badge */}
          <div
            className={`shrink-0 text-center px-2 py-1 rounded-xl border text-[10px] font-black ${getSeatsColor(
              booking.bookedCount,
              booking.totalSeats
            )}`}
          >
            <span className="text-lg font-black leading-none block">{availableSeats}</span>
            <span className="text-[7px] uppercase tracking-widest">seats left</span>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 mb-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Make</p>
            <p className="text-white text-[10px] font-bold leading-tight truncate">{booking.vehicleName}</p>
          </div>
          <div>
            <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Color</p>
            <p className="text-white text-[10px] font-bold capitalize">{booking.vehicleColor}</p>
          </div>
          <div>
            <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Plate</p>
            <p className="text-white text-[10px] font-bold font-mono">{booking.vehiclePlate}</p>
          </div>
        </div>

        {/* Trip Info Row */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-red-400 shrink-0" size={9} />
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Going to: </span>
              <span className="text-white text-[10px] font-bold truncate">{booking.destination}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-green-400 shrink-0" size={9} />
            <div className="flex-1 min-w-0">
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Meet at: </span>
              <span className="text-white text-[10px] font-bold truncate">{booking.meetingPoint}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <FaClock className="text-blue-400 shrink-0" size={9} />
              <span className="text-white text-[10px] font-bold">{formatTime(booking.departureTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaMoneyBillWave className="text-emerald-400 shrink-0" size={9} />
              <span className="text-white text-[10px] font-bold">₦{booking.fare.toLocaleString()}/seat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaUsers className="text-purple-400 shrink-0" size={9} />
              <span className="text-white text-[10px] font-bold">
                {booking.bookedCount}/{booking.totalSeats}
              </span>
            </div>
          </div>
        </div>

        {/* Seat mini-bar */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: booking.totalSeats }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                i < booking.bookedCount ? "bg-red-500" : "bg-green-500/50"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onFlag(booking)}
            className="w-9 h-9 flex items-center justify-center bg-red-600/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-600/30 transition-colors"
          >
            <FaFlag size={11} />
          </button>
          <button
            onClick={() => !isFullyBooked && onSelect(booking)}
            disabled={isFullyBooked}
            className={`flex-1 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
              isFullyBooked
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-violet-700 text-white hover:from-purple-500 hover:to-violet-600 shadow-lg shadow-purple-900/30 active:scale-95"
            }`}
          >
            {isFullyBooked ? "No Seats" : (
              <>
                View Seats
                <FaChevronRight size={9} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
