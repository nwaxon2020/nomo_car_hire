'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  FaStar,
  FaCar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaMapMarkerAlt,
  FaClock
} from 'react-icons/fa';

interface TripHistoryCardProps {
  trip: {
    id: string;
    driverId?: string;
    driverName: string;
    driverImage?: string;
    vehicleName: string;
    vehicleModel: string;
    pickupLocation: string;
    destination: string;
    status: 'active' | 'completed' | 'cancelled';
    startTime: any;
    endTime?: any;
    rating?: number;
    review?: string;
    driverRating?: number;
  };
  onRateDriver?: (driverId: string, rating: number) => void;
  onRemoveTrip?: (tripId: string) => void;
}

export default function TripHistoryCard({ trip, onRateDriver, onRemoveTrip }: TripHistoryCardProps) {
  const [showReview, setShowReview] = useState(false);

  // Refined formatting utility
  const formatDateTime = (timestamp: any, type: 'date' | 'time') => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);

    return type === 'date'
      ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const isCompleted = trip.status === 'completed';

  return (
    <div className="group mb-6 bg-[#0f172a] rounded-xl border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 shadow-xl">

      {/* Premium Status Header */}
      <div className={`px-6 py-3 flex items-center justify-between border-b border-white/5 ${isCompleted ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isCompleted ? 'text-emerald-500' : 'text-rose-400'}`}>
            {trip.status} Trip
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
          <FaCalendarAlt className="text-[9px]" />
          {formatDateTime(trip.startTime, 'date')}
        </span>
      </div>

      <div className="p-6">
        {/* Driver & Chauffeur Details */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Image
              src={trip.driverImage || "/per.png"}
              alt={trip.driverName}
              width={56}
              height={56}
              className="rounded-2xl border border-white/10 object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            />
            {isCompleted && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-[#0f172a]">
                <FaCheckCircle className="text-white text-[10px]" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h4 className="text-white font-bold text-sm tracking-tight">{trip.driverName}</h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-1">
              <FaCar className="text-emerald-500/70" />
              <span>{trip.vehicleName} • {trip.vehicleModel}</span>
            </div>

            {/* Driver Rating Stars */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    size={10}
                    className={star <= (trip.driverRating || 0) ? "text-amber-400" : "text-slate-700"}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-600 font-black">{(trip.driverRating || 0).toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* The Route Timeline */}
        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-emerald-500 before:to-rose-500 before:opacity-20">
          <div className="relative">
            <div className="absolute -left-[23px] top-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Departure</p>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">{trip.pickupLocation}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{formatDateTime(trip.startTime, 'time')}</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-[23px] top-1 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Arrival</p>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">{trip.destination}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{formatDateTime(trip.endTime || trip.startTime, 'time')}</span>
            </div>
          </div>
        </div>

        {/* Rating & Action Section */}
        {isCompleted && (
          <div className="mt-8 pt-6 border-t border-white/5 relative">
            
            {onRemoveTrip && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTrip(trip.id);
                }}
                className="absolute right-0 top-6 text-rose-500/70 hover:text-rose-500 transition-colors p-1"
                title="Remove Trip from History"
              >
                <FaTimesCircle size={14} />
              </button>
            )}

            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {trip.rating ? "Your Rating" : "Rate Driver"}
                </span>
                <div className="flex gap-1 group/stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => trip.driverId && onRateDriver?.(trip.driverId, star)}
                      className={`transition-colors duration-200 focus:outline-none ${
                        star <= (trip.rating || 0) 
                          ? "text-emerald-400 hover:text-emerald-300" 
                          : "text-slate-800 hover:text-emerald-500/50"
                      }`}
                    >
                      <FaStar size={16} />
                    </button>
                  ))}
                </div>
              </div>
              
              {trip.review && (
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                >
                  {showReview ? 'Hide Details' : 'View Review'}
                </button>
              )}
            </div>

            {showReview && trip.review && (
              <div className="mt-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <p className="text-xs text-slate-400 italic leading-relaxed">"{trip.review}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}