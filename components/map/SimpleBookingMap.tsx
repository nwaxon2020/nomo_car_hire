'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import { FaMapMarkerAlt } from 'react-icons/fa';

// Premium "Nomo" Dark Map Theme
const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#484e5b" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1621" }] }
];

interface SimpleBookingMapProps {
  pickupLocation: string;
  destination: string;
  driverLocation?: { lat: number; lng: number } | null; // Allow it to be an object or null
  onLocationSelect: (type: 'pickup' | 'destination', value: string) => void;
}

export default function SimpleBookingMap({
  pickupLocation,
  destination,
  driverLocation,
  onLocationSelect
}: SimpleBookingMapProps) {

  // Load Google Maps using your Public API Key
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Default center if no driver/pickup is set (Lagos, Nigeria)
  const center = driverLocation || { lat: 6.5244, lng: 3.3792 };

  // 1. Unified Input Handler with Toast Feedback
  const handleInputChange = (type: 'pickup' | 'destination', value: string) => {
    onLocationSelect(type, value);

    // Only toast once the user stops typing or reaches a meaningful length
    if (value.length > 5) {
      toast.success(`${type === 'pickup' ? 'Pickup' : 'Destination'} updated`, {
        id: type, // Prevents toast spamming
        style: {
          background: '#0f172a',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '11px',
          textTransform: 'uppercase'
        }
      });
    }
  };

  // 2. Effect to notify when route is fully defined
  useEffect(() => {
    if (pickupLocation?.length > 5 && destination?.length > 5) {
      toast.success('Route Optimized for Nomo Select', {
        icon: '💎',
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold'
        }
      });
    }
  }, [pickupLocation, destination]);

  return (
    <div className="w-full bg-[#0f172a] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl transition-all duration-500">

      {/* MAP HEADER */}
      <div className="h-[350px] w-full relative border-b border-white/10">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={13}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: false,
              gestureHandling: 'cooperative'
            }}
            onLoad={m => setMap(m)}
          >
            {/* LIVE DRIVER MARKER (Syncs with LiveTracking via props) */}
            {driverLocation && (
              <Marker
                position={driverLocation}
                icon={{
                  // Ensure this file exists in your /public/icons folder!
                  url: '/icons/luxury-car-top.png',
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-4 text-slate-500">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Initializing Nomo Grid...</span>
          </div>
        )}

        {/* STATUS OVERLAY */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[10px] text-white font-black uppercase tracking-widest">System Live</span>
          </div>
        </div>
      </div>

      {/* INPUT FORM SECTION */}
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pickup Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pickup Point</label>
            </div>
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-white/5 p-4 rounded-2xl text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-700"
              placeholder="Ex: Victoria Island, Lagos"
              value={pickupLocation}
              onChange={(e) => handleInputChange('pickup', e.target.value)}
            />
          </div>

          {/* Destination Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Destination</label>
            </div>
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-white/5 p-4 rounded-2xl text-white focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all placeholder:text-slate-700"
              placeholder="Where are you going?"
              value={destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
            />
          </div>
        </div>

        {/* BOOKING BUTTON */}
        <button
          onClick={() => toast.loading('Processing Luxury Request...', { duration: 2000 })}
          disabled={!pickupLocation || !destination}
          className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-[11px] transition-all duration-500 ${pickupLocation && destination
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:scale-[1.01]'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
        >
          Confirm Nomo Booking
        </button>

        {/* FOOTER INFO */}
        <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          Encrypted Booking • Real-Time GPS Tracking • Premium Fleet
        </p>
      </div>
    </div>
  );
}