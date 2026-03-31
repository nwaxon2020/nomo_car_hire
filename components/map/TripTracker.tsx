'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import {
  FaCar,
  FaRoute,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaUser,
  FaShieldAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';

interface TripTrackerProps {
  tripId: string;
  driverId: string;
  customerId: string;
}

export default function TripTracker({ tripId, driverId, customerId }: TripTrackerProps) {
  const [tripData, setTripData] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: Format any timestamp type safely
  const formatTime = (ts: any) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: Calculate Real Distance (KM) using Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in KM
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Memoized Trip Analytics
  const analytics = useMemo(() => {
    // Default values if data is missing
    if (!driverLocation || !customerLocation) {
      return { distNum: 0, distDisplay: "0", eta: 0, progress: "10%" };
    }

    const rawDist = calculateDistance(
      driverLocation.lat, driverLocation.lng,
      customerLocation.lat, customerLocation.lng
    );

    // 1. Keep a numeric version for logic
    const distNum = rawDist;

    // 2. Create a string version for display (1 decimal place)
    const distDisplay = rawDist.toFixed(1);

    // 3. ETA Calculation (20km/h average + 2 min buffer)
    const etaMinutes = Math.ceil((rawDist / 20) * 60) + 2;

    // 4. Progress bar percentage
    const progressPercent = Math.min(100, Math.max(10, 100 - (rawDist * 10)));

    return {
      distNum,
      distDisplay,
      eta: etaMinutes,
      progress: `${progressPercent}%`
    };
  }, [driverLocation, customerLocation]);

  useEffect(() => {
    if (!tripId) return;

    const unsubTrip = onSnapshot(doc(db, 'trips', tripId), (s) => {
      if (s.exists()) { setTripData(s.data()); setIsLoading(false); }
    });

    const unsubDriver = driverId && onSnapshot(doc(db, 'users', driverId), (s) => {
      const data = s.data()?.location;
      if (data?.isSharing) setDriverLocation(data);
      else setDriverLocation(null);
    });

    const unsubCustomer = customerId && onSnapshot(doc(db, 'users', customerId), (s) => {
      const data = s.data()?.location;
      if (data?.isSharing) setCustomerLocation(data);
      else setCustomerLocation(null);
    });

    return () => {
      unsubTrip();
      unsubDriver && unsubDriver();
      unsubCustomer && unsubCustomer();
    };
  }, [tripId, driverId, customerId]);

  if (isLoading) return null;

  return (
    <div className="w-full bg-[#0b1222]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700">

      {/* Header Section */}
      <div className="p-8 flex items-center justify-between cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className={`p-4 rounded-2xl border transition-all duration-500 ${driverLocation ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-slate-800/50 border-white/10'}`}>
              <FaCar className={`${driverLocation ? 'text-emerald-400' : 'text-slate-500'} text-xl`} />
            </div>
            {driverLocation && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-[#0b1222] animate-pulse" />}
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Mission Control</h3>
            <p className="text-white font-bold text-base tracking-tight">
              {analytics.distNum < 0.2 ? 'Chauffeur has Arrived' : `Driver is ${analytics.distDisplay}km away`}
            </p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all border border-white/5">
          {expanded ? <FaChevronUp className="text-emerald-500" /> : <FaChevronDown className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-8 pb-10 space-y-10 animate-in fade-in zoom-in-95 duration-500">

          {/* Dynamic Progress Engine */}
          <div className="relative pt-2">
            <div className="flex justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Origin</span>
                <span className="text-xs text-white font-medium">Pickup Point</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Target</span>
                <span className="text-xs text-white font-medium">Your Location</span>
              </div>
            </div>
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all duration-[3000ms] cubic-bezier(0.4, 0, 0.2, 1)"
                style={{ width: analytics.progress }}
              />
            </div>
          </div>

          {/* Precision Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Driver Detail */}
            <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-emerald-500/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="text-emerald-500 text-xs" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Chauffeur</span>
                </div>
                <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md">{formatTime(driverLocation?.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {driverLocation?.address || 'Scanning for GPS signal...'}
              </p>
            </div>

            {/* Arrival Statistics */}
            <div className="p-5 rounded-[1.5rem] bg-emerald-500/[0.02] border border-emerald-500/10 flex items-center justify-around">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Est. Arrival</p>
                <div className="flex items-center justify-center gap-2">
                  <FaClock className="text-emerald-500 text-xs" />
                  <span className="text-xl font-black text-white">{analytics.eta}<span className="text-[10px] ml-1 text-emerald-500">MINS</span></span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Distance</p>
                <span className="text-xl font-black text-white">{analytics.distDisplay}<span className="text-[10px] ml-1 text-emerald-500">KM</span></span>
              </div>
            </div>
          </div>

          {/* Security Footer */}
          <div className="py-4 px-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaShieldAlt className="text-emerald-500" />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Encrypted Session Active</span>
            </div>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}