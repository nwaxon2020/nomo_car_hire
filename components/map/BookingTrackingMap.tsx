'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#484e5b" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1621" }] }
];

interface BookingTrackingMapProps {
  pickup: { lat: number; lng: number; address?: string };
  driver: { lat: number; lng: number; address?: string };
}

export default function BookingTrackingMap({ pickup, driver }: BookingTrackingMapProps) {
  const [loadError, setLoadError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const { isLoaded, loadError: googleLoadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Safety Timeout for Google Maps
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setShowFallback(true);
      }
    }, 7000); // 7 seconds timeout

    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Handle Google Maps specific load errors
  useEffect(() => {
    if (googleLoadError) {
      setLoadError(true);
      setShowFallback(true);
    }
  }, [googleLoadError]);

  // Fit bounds to show both markers (Google Maps)
  useEffect(() => {
    if (map && isLoaded && !showFallback && pickup.lat !== 0 && driver.lat !== 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(driver);
      map.fitBounds(bounds);
    }
  }, [map, isLoaded, pickup, driver, showFallback]);

  const isValidLocation = (loc: { lat: number; lng: number }) => {
    return loc.lat !== 0 && loc.lng !== 0;
  };

  // State for blank map protection
  const isConnecting = !isValidLocation(pickup) || !isValidLocation(driver);

  // Backyard Map (OpenStreetMap Fallback) or Connecting State
  if (showFallback || loadError || isConnecting) {
    if (isConnecting) {
        return (
            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-2 border-emerald-500/20 rounded-full animate-ping absolute inset-0" />
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center relative backdrop-blur-sm border border-emerald-500/30">
                        <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
                    </div>
                </div>
                <h4 className="text-xl font-black uppercase tracking-[0.2em] mb-3">Syncing Location</h4>
                <p className="text-gray-400 text-xs font-medium max-w-[240px] leading-relaxed">
                    {!isValidLocation(pickup) 
                        ? "Establishing secure connection to your GPS device..." 
                        : "Waiting for driver to initiate live tracking signal..."}
                </p>
                
                {/* Visual Connection Bar */}
                <div className="mt-8 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-progress-indefinite" />
                </div>
            </div>
        );
    }

    const centerLat = (pickup.lat + driver.lat) / 2;
    const centerLng = (pickup.lng + driver.lng) / 2;
    // Simple OSM iframe as "backyard" fallback
    return (
      <div className="w-full h-full relative bg-slate-800 overflow-hidden">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(pickup.lng, driver.lng) - 0.01}%2C${Math.min(pickup.lat, driver.lat) - 0.01}%2C${Math.max(pickup.lng, driver.lng) + 0.01}%2C${Math.max(pickup.lat, driver.lat) + 0.01}&layer=mapnik&marker=${pickup.lat}%2C${pickup.lng}`}
        />
        <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-black text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg flex items-center justify-between">
            <span>Backyard Map Active (Google Maps Unavailable)</span>
            <div className="flex gap-2">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-600" /> Driver
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-600" /> You
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) return (
    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-black uppercase tracking-widest text-[10px]">Initializing Live Tracking...</p>
    </div>
  );

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={pickup}
      zoom={14}
      options={{
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: false,
      }}
      onLoad={m => setMap(m)}
    >
      <Marker 
        position={pickup} 
        label={{ text: "YOU", color: "white", fontWeight: "black", fontSize: "10px" }}
      />
      <Marker 
        position={driver} 
        icon={{
          url: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', // Fallback icon URL
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        }}
      />
    </GoogleMap>
  );
}
