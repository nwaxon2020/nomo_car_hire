'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, OverlayView } from '@react-google-maps/api';

// Defined outside component to prevent referential instability warning from useJsApiLoader
const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

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
  destination?: { lat: number; lng: number; address?: string };
  customerImage?: string;
  driverImage?: string;
  plateNumber?: string;
  viewerRole?: 'customer' | 'driver';
  destinationLabel?: string;
}

export default function BookingTrackingMap({
  pickup,
  driver,
  destination,
  customerImage,
  driverImage,
  plateNumber,
  viewerRole = 'customer',
  destinationLabel
}: BookingTrackingMapProps) {
  const [loadError, setLoadError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const pickupValid = pickup.lat !== 0 && pickup.lng !== 0;
  const driverValid = driver.lat !== 0 && driver.lng !== 0;
  const destValid = destination ? destination.lat !== 0 && destination.lng !== 0 : false;
  const mapCenter = destValid ? destination : pickupValid ? pickup : driverValid ? driver : null;

  // Labels depend on who is viewing
  const customerLabel = viewerRole === 'driver' ? 'Customer' : 'You';
  const driverLabel = viewerRole === 'customer' ? 'Driver' : 'You';

  const { isLoaded, loadError: googleLoadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Safety Timeout and Error Interception for Google Maps
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Google Maps JavaScript API error')) {
        setLoadError(true);
        setShowFallback(true);
        return; // Suppress the hard error overlay
      }
      originalConsoleError(...args);
    };

    // Increased to 15s — mobile connections load Maps slower than desktop
    const timer = setTimeout(() => {
      if (!isLoaded) setShowFallback(true);
    }, 15000);

    (window as any).gm_authFailure = () => {
      setLoadError(true);
      setShowFallback(true);
    };

    return () => {
      clearTimeout(timer);
      console.error = originalConsoleError;
    };
  }, [isLoaded]);

  // ✅ If Google Maps successfully loaded, clear any fallback triggered prematurely by the timeout
  useEffect(() => {
    if (isLoaded && !googleLoadError) {
      setShowFallback(false);
      setLoadError(false);
    }
  }, [isLoaded, googleLoadError]);

  useEffect(() => {
    if (googleLoadError) {
      setLoadError(true);
      setShowFallback(true);
    }
  }, [googleLoadError]);

  // Fit bounds when map is ready - Optimized to prevent flickering
  const fittedRef = useRef(false);
  useEffect(() => {
    if (map && isLoaded && !showFallback) {
      const bounds = new google.maps.LatLngBounds();
      let hasPoints = false;

      if (pickupValid) { bounds.extend(pickup); hasPoints = true; }
      if (driverValid) { bounds.extend(driver); hasPoints = true; }
      if (destValid && destination) { bounds.extend(destination); hasPoints = true; }

      if (hasPoints) {
        // Only fit bounds on first load or if driver moves significantly out of view
        const currentBounds = map.getBounds();
        const shouldFit = !fittedRef.current || (currentBounds && !currentBounds.contains(new google.maps.LatLng(driver.lat, driver.lng)));
        
        if (shouldFit) {
          map.fitBounds(bounds, 50); // Added padding
          fittedRef.current = true;
        }
      } else {
        map.setCenter({ lat: 9.0765, lng: 7.3986 });
        map.setZoom(10);
      }
    }
  }, [map, isLoaded, pickup, driver, destination, showFallback, pickupValid, driverValid, destValid]);

  // ─── Identity card shown in every state ───────────────────────────────────
  const IdentityCards = () => (
    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-10">
      {customerImage && (
        <div className="bg-slate-900/90 p-2 border-2 border-emerald-500/60 rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur gap-1">
          <span className="text-emerald-400 font-black text-[8px] uppercase tracking-widest leading-none">{customerLabel}</span>
          <img src={customerImage} alt={customerLabel} className="w-9 h-9 rounded-full border-2 border-emerald-500 object-cover bg-white" />
        </div>
      )}
      {(driverImage || plateNumber) && (
        <div className="bg-slate-900/90 p-2 border-2 border-amber-500/60 rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur gap-1">
          <span className="text-amber-400 font-black text-[8px] uppercase tracking-widest leading-none">{driverLabel}</span>
          {driverImage ? (
            <img src={driverImage} alt={driverLabel} className="w-10 h-10 rounded-full border-2 border-amber-500 object-cover bg-white" />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-amber-500 bg-slate-800 text-amber-500 flex items-center justify-center text-[10px] font-bold">CAR</div>
          )}
          {plateNumber && (
            <div className="bg-white text-black font-black text-[10px] px-2 py-0.5 rounded-xl uppercase tracking-widest mt-0.5">
              {plateNumber}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── No location yet ──────────────────────────────────────────────────────
  if (!mapCenter && !showFallback && !loadError) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center relative">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-[10px] text-emerald-400">Waiting for GPS Signal...</p>
        <p className="text-slate-500 text-[9px] mt-1">Location will appear once shared</p>
        <div className="mt-8 flex gap-6 justify-center">
          {customerImage && (
            <div className="flex flex-col items-center gap-2">
              <img src={customerImage} alt={customerLabel} className="w-12 h-12 rounded-full border-[3px] border-emerald-500 object-cover" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{customerLabel}</span>
            </div>
          )}
          {driverImage && (
            <div className="flex flex-col items-center gap-2">
              <img src={driverImage} alt={driverLabel} className="w-14 h-14 rounded-full border-[3px] border-amber-500 object-cover" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{driverLabel}</span>
              {plateNumber && (
                <div className="bg-white text-black font-black text-[10px] px-2.5 py-1 rounded-xl uppercase tracking-widest">{plateNumber}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Fallback: OpenStreetMap ──────────────────────────────────────────────
  if (showFallback || loadError) {
    const bbox = pickupValid && driverValid
      ? `${Math.min(pickup.lng, driver.lng) - 0.01}%2C${Math.min(pickup.lat, driver.lat) - 0.01}%2C${Math.max(pickup.lng, driver.lng) + 0.01}%2C${Math.max(pickup.lat, driver.lat) + 0.01}`
      : pickupValid
        ? `${pickup.lng - 0.02}%2C${pickup.lat - 0.02}%2C${pickup.lng + 0.02}%2C${pickup.lat + 0.02}`
        : driverValid
          ? `${driver.lng - 0.02}%2C${driver.lat - 0.02}%2C${driver.lng + 0.02}%2C${driver.lat + 0.02}`
          : null;

    const markerParam = pickupValid
      ? `&marker=${pickup.lat}%2C${pickup.lng}`
      : driverValid
        ? `&marker=${driver.lat}%2C${driver.lng}`
        : '';

    return (
      <div className="w-full h-full relative bg-slate-800 overflow-hidden">
        {bbox ? (
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParam}`}
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
            Waiting for location...
          </div>
        )}

        <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-black text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg flex items-center justify-between z-10">
          <span>Backup Map Active</span>
          <div className="flex gap-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600" /> {driverLabel}</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-600" /> {customerLabel}</div>
          </div>
        </div>

        <IdentityCards />
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-[10px]">Initializing Live Tracking...</p>
      </div>
    );
  }

  // ─── Google Maps ──────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter!}
        zoom={14}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: false,
        }}
        onLoad={m => setMap(m)}
      >
        {/* Customer / Pickup marker */}
        {pickupValid && (
          customerImage ? (
            <OverlayView position={pickup} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
              <div className="flex flex-col items-center -ml-5 -mt-12">
                <img src={customerImage} alt={customerLabel} className="w-10 h-10 rounded-full border-[3px] border-emerald-500 shadow-xl object-cover bg-white" />
                <span className="text-[8px] font-black text-emerald-400 bg-slate-900/80 px-1.5 py-0.5 rounded-full mt-1 uppercase tracking-widest whitespace-nowrap">{customerLabel}</span>
              </div>
            </OverlayView>
          ) : (
            <Marker
              position={pickup}
              label={{ text: customerLabel.toUpperCase(), color: "white", fontWeight: "black", fontSize: "10px" }}
            />
          )
        )}

        {/* Driver marker */}
        {driverValid && (
          <OverlayView position={driver} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="flex flex-col items-center -ml-6 -mt-14">
              {driverImage ? (
                <img src={driverImage} alt={driverLabel} className="w-12 h-12 rounded-full border-[3px] border-amber-500 shadow-2xl object-cover bg-slate-900" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-500 font-black flex items-center justify-center text-xs border-[3px] border-amber-500 shadow-2xl">CAR</div>
              )}
              <span className="text-[8px] font-black text-amber-400 bg-slate-900/80 px-1.5 py-0.5 rounded-full mt-1 uppercase tracking-widest whitespace-nowrap">{driverLabel}</span>
              {plateNumber && (
                <div className="mt-1 bg-white text-black font-black text-[10px] px-2.5 py-1 rounded-xl shadow-lg border border-amber-300/30 uppercase tracking-widest text-center whitespace-nowrap">
                  {plateNumber}
                </div>
              )}
            </div>
          </OverlayView>
        )}

        {/* Destination marker */}
        {destValid && destination && (
          <OverlayView position={destination} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="flex flex-col items-center -ml-5 -mt-12">
              <div className="w-10 h-10 rounded-full border-[3px] border-red-500 bg-red-600 text-white font-black flex items-center justify-center text-xs shadow-2xl">📍</div>
              <span className="text-[8px] font-black text-red-400 bg-slate-900/80 px-1.5 py-0.5 rounded-full mt-1 uppercase tracking-widest whitespace-nowrap">{destinationLabel || 'Destination'}</span>
            </div>
          </OverlayView>
        )}
      </GoogleMap>
    </div>
  );
}
