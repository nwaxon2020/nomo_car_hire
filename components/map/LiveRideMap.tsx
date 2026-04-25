'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { subscribeToNearbyDrivers } from '@/lib/geofire';
import { FaUser, FaCar, FaLocationArrow, FaCrosshairs } from 'react-icons/fa';

const luxuryDarkStyle: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#747474' }] },
  { elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

interface Driver {
  id: string;
  firstName?: string;
  lastName?: string;
  location: {
    lat: number;
    lng: number;
    heading?: number;
  };
}

export default function LiveRideMap() {
  const [passengerLocation, setPassengerLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [isFollowing, setIsFollowing] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  // 1. Watch Passenger Location
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPassengerLocation(newPos);

        if (isFollowing && mapRef.current) {
          mapRef.current.panTo(newPos);
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isFollowing]);

  // 2. Subscribe to Nearby Drivers (50m radius)
  useEffect(() => {
    if (!passengerLocation) return;

    const unsub = subscribeToNearbyDrivers(
      [passengerLocation.lat, passengerLocation.lng],
      2000, // 2km radius for better availability in new markets
      (drivers) => {
        setNearbyDrivers(drivers);
      }
    );

    return () => unsub();
  }, [passengerLocation]);

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center">
        <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs">Loading Live Map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        zoom={14} // Adjusted zoom for 2km radius
        center={passengerLocation || { lat: 6.5244, lng: 3.3792 }}
        options={{
          styles: luxuryDarkStyle,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        }}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onDragStart={() => setIsFollowing(false)}
      >
        {/* Passenger Marker */}
        {passengerLocation && (
          <>
            <Marker
              position={passengerLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#10b981',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8,
              }}
              title="You (Passenger)"
            />
            {/* Visual 2km Radius Circle */}
            <Circle
              center={passengerLocation}
              radius={2000}
              options={{
                fillColor: '#10b981',
                fillOpacity: 0.05,
                strokeColor: '#10b981',
                strokeOpacity: 0.3,
                strokeWeight: 1,
                clickable: false,
              }}
            />
          </>
        )}

        {/* Driver Markers */}
        {nearbyDrivers.map((driver) => (
          <Marker
            key={driver.id}
            position={{ lat: driver.location.lat, lng: driver.location.lng }}
            icon={{
              url: '/car-icon.svg',
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
              rotation: driver.location.heading || 0,
            }}
            title={`${driver.firstName || 'Driver'}`}
          />
        ))}
      </GoogleMap>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/30 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-white tracking-widest">
            {nearbyDrivers.length} Drivers within 2km
          </span>
        </div>
      </div>

      {/* Recenter Button */}
      {!isFollowing && (
        <button
          onClick={() => {
            setIsFollowing(true);
            if (passengerLocation) mapRef.current?.panTo(passengerLocation);
          }}
          className="absolute bottom-6 right-6 z-10 p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-500 transition-all active:scale-95"
        >
          <FaCrosshairs className="text-xl" />
        </button>
      )}

      {/* Driver Info Toast (Bottom) */}
      {nearbyDrivers.length > 0 && (
        <div className="absolute bottom-6 left-6 right-20 z-10 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <FaCar className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase">Nearest Driver Found</p>
              <h4 className="text-white font-bold text-sm">
                {nearbyDrivers[0].firstName} {nearbyDrivers[0].lastName}
              </h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
