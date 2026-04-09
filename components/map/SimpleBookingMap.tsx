'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaMapMarkerAlt, FaLocationArrow } from 'react-icons/fa';

interface SimpleBookingMapProps {
  pickupLocation: string;
  destination: string;
  driverLocation?: { lat: number; lng: number } | null;
  onLocationSelect: (type: 'pickup' | 'destination', value: string) => void;
}

export default function SimpleBookingMap({
  pickupLocation,
  destination,
  onLocationSelect
}: SimpleBookingMapProps) {

  // Notify when both locations are set
  useEffect(() => {
    if (pickupLocation?.length > 5 && destination?.length > 5) {
      toast.success('Route Ready!', {
        icon: '🗺️',
        duration: 2000,
        style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
      });
    }
  }, [pickupLocation, destination]);

  return (
    <div className="w-full bg-[#0f172a] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-black/30">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-[10px] text-white font-black uppercase tracking-widest">System Live</span>
      </div>

      {/* INPUT FORM */}
      <div className="p-6 space-y-5">

        {/* Pickup Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pickup Point</label>
          </div>
          <div className="relative">
            <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-sm" />
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-white/5 pl-10 pr-4 py-4 rounded-xl text-white text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
              placeholder="e.g. Victoria Island, Lagos"
              value={pickupLocation}
              onChange={(e) => onLocationSelect('pickup', e.target.value)}
            />
          </div>
        </div>

        {/* Destination Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Destination</label>
          </div>
          <div className="relative">
            <FaLocationArrow className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 text-sm" />
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-white/5 pl-10 pr-4 py-4 rounded-xl text-white text-sm focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all placeholder:text-slate-600"
              placeholder="Where are you going?"
              value={destination}
              onChange={(e) => onLocationSelect('destination', e.target.value)}
            />
          </div>
        </div>

        {/* Route preview pill */}
        {pickupLocation && destination && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider truncate">
              {pickupLocation} → {destination}
            </p>
          </div>
        )}

        {/* FOOTER INFO */}
        <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] pt-1">
          Encrypted Booking • Real-Time GPS Tracking • Premium Fleet
        </p>
      </div>
    </div>
  );
}