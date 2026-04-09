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
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Fit bounds to show both markers
  useEffect(() => {
    if (map && isLoaded) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(driver);
      map.fitBounds(bounds);
    }
  }, [map, isLoaded, pickup, driver]);

  if (!isLoaded) return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black uppercase tracking-widest text-[10px]">
      Loading Live Tracking...
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
          url: '/icons/luxury-car-top.png',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        }}
      />
    </GoogleMap>
  );
}
