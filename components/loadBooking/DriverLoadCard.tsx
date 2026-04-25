"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCar, FaMapMarkerAlt, FaMoneyBillWave, FaClock,
  FaUsers, FaFlag, FaChevronRight, FaChevronLeft, FaCheckCircle, FaTimes,
} from "react-icons/fa";
import { LoadBooking } from "./types";

interface DriverLoadCardProps {
  booking: LoadBooking;
  onSelect: (booking: LoadBooking) => void;
  onFlag: (booking: LoadBooking) => void;
  index?: number;
  isInactive?: boolean;
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

const getTrustColor = (score: number) => {
  if (score >= 80) return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" };
  if (score >= 60) return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" };
  if (score >= 40) return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" };
  if (score >= 20) return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" };
  return { bg: "bg-red-800/20", text: "text-red-600", border: "border-red-800/30" };
};

const getTrustLabel = (score: number) => {
  if (score >= 80) return "Trusted";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Low";
  return "Poor";
};

export default function DriverLoadCard({
  booking,
  onSelect,
  onFlag,
  index = 0,
  isInactive = false,
}: DriverLoadCardProps) {
  const availableSeats = booking.totalSeats - booking.bookedCount;
  const isFullyBooked = availableSeats === 0;

  // Image Gallery State
  const [showGallery, setShowGallery] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Prepare images array - Side View is first to match the card view
  const galleryImages = [
    { url: booking.vehicleImages?.side || booking.vehicleSideImage, label: "Side View" },
    { url: booking.vehicleImages?.front, label: "Front View" },
    { url: booking.vehicleImages?.back, label: "Back View" },
    { url: booking.vehicleImages?.interior, label: "Interior" },
  ].filter(img => img.url); // Only show existing images

  const openGallery = () => {
    if (galleryImages.length > 0) {
      setCurrentImgIndex(0); // Always start with the first image (Side View)
      setShowGallery(true);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <>
      <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 group mb-10 lg:mb-8 ${isInactive
        ? "border-gray-800 opacity-50 cursor-not-allowed grayscale-[0.5]"
        : isFullyBooked
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
              <img 
                src={booking.driverImage} 
                alt={booking.driverName} 
                className="w-full h-full object-cover" 
                loading="lazy"
                decoding="async"
              />
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
            {/* Driver trust score badge */}
            {booking.driverTrustScore !== undefined && (() => {
              const t = getTrustColor(booking.driverTrustScore);
              return (
                <div className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${t.bg} ${t.text} ${t.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.bg.replace("/20", "")}`} />
                  Driver Trust: {booking.driverTrustScore}% · {getTrustLabel(booking.driverTrustScore)}
                </div>
              );
            })()}
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
        <div className="space-y-2 mb-4">
          <div className="flex flex-row flex-wrap items-center gap-y-2 gap-x-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <FaMapMarkerAlt className="text-red-400 shrink-0" size={10} />
              <div className="truncate">
                <span className="text-xs font-black text-red-300 uppercase tracking-widest">Going to: </span>
                <span className="text-white text-xs font-bold">{booking.destination}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <FaMapMarkerAlt className="text-green-400 shrink-0" size={10} />
              <div className="truncate">
                <span className="text-xs font-black text-green-300 uppercase tracking-widest">Meet at: </span>
                <span className="text-white text-xs font-bold">{booking.meetingPoint}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-4 pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-left">
              <FaClock className="text-blue-400 shrink-0" size={10} />
              <span className="text-white text-xs font-bold">{formatTime(booking.departureTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaMoneyBillWave className="text-emerald-400 shrink-0" size={10} />
              <span className="text-white text-xs font-bold">₦{booking.fare.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaUsers className="text-purple-400 shrink-0" size={10} />
              <span className="text-white text-xs font-bold">
                {booking.bookedCount}/{booking.totalSeats} seats
              </span>
            </div>
          </div>
        </div>

        {/* Seat mini-bar */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: booking.totalSeats }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${i < booking.bookedCount ? "bg-red-500" : "bg-green-500/50"
                }`}
            />
          ))}
        </div>

        {/* Car side-view image (Clickable to open Gallery) */}
        <div 
          onClick={openGallery}
          className={`rounded-xl overflow-hidden mb-4 relative bg-gray-900/60 border border-white/5 cursor-pointer hover:border-purple-500/50 transition-all ${galleryImages.length > 0 ? "group/img" : ""}`} 
          style={{ height: "100px" }}
        >
          {booking.vehicleSideImage ? (
            <>
              <img
                src={booking.vehicleSideImage}
                alt={`${booking.vehicleName} view`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Vehicle+Image';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20">
                 <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/30">View Gallery</span>
              </div>
              <span className="absolute bottom-1.5 left-2.5 text-[8px] font-black text-white/70 uppercase tracking-widest">
                {booking.vehicleName} · {booking.vehicleColor}
              </span>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
              <FaCar className="text-gray-700" size={28} />
              <p className="text-gray-700 text-[8px] font-black uppercase tracking-widest">
                {booking.vehicleName}
              </p>
            </div>
          )}
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
            onClick={() => !isFullyBooked && !isInactive && onSelect(booking)}
            disabled={isFullyBooked || isInactive}
            className={`flex-1 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${isFullyBooked || isInactive
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-violet-700 text-white hover:from-purple-500 hover:to-violet-600 shadow-lg shadow-purple-900/30 active:scale-95"
              }`}
          >
            {isFullyBooked ? "No Seats" : isInactive ? "Booking Active" : (
              <>
                View Seats
                <FaChevronRight size={9} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>

    {/* Full Screen Image Gallery Overlay */}
    <AnimatePresence>
      {showGallery && galleryImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
          onClick={() => setShowGallery(false)}
        >
          {/* Close Button */}
          <button 
            onClick={() => setShowGallery(false)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-[1001] border border-white/10"
          >
            <FaTimes size={20} />
          </button>

          {/* Navigation Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-4 md:left-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-[1001] border border-white/10"
              >
                <FaChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-4 md:right-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-[1001] border border-white/10"
              >
                <FaChevronRight size={20} />
              </button>
            </>
          )}

          {/* Main Image Container */}
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[60vh] md:h-[75vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900">
              <motion.img
                key={currentImgIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                src={galleryImages[currentImgIndex].url}
                alt="Vehicle view"
                className="w-full h-full object-contain"
                decoding="async"
              />
              
              {/* Image Label Badge */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                <p className="text-white font-black text-xs uppercase tracking-[0.2em]">
                  {galleryImages[currentImgIndex].label}
                </p>
              </div>

              {/* Progress dots */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
                {galleryImages.map((_, i) => (
                  <div 
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImgIndex ? "bg-purple-500 w-4" : "bg-white/30"}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <h4 className="text-white font-black text-xl uppercase tracking-tighter mb-1">
                {booking.vehicleName}
              </h4>
              <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em]">
                {booking.vehiclePlate} · {booking.vehicleColor}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
