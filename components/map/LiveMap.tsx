'use client';

import { FaMapMarkerAlt, FaExternalLinkAlt } from 'react-icons/fa';

interface SimpleMapProps {
  location: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  userName: string;
}

export default function SimpleMap({ location, userName }: SimpleMapProps) {
  if (!location) {
    return (
      <div className="h-80 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-8 border border-gray-200">
        <div className="text-gray-400 mb-4">
          <FaMapMarkerAlt className="text-4xl" />
        </div>
        <p className="text-gray-600 text-center font-medium">
          Location not available
        </p>
        <p className="text-sm text-gray-500 mt-2 text-center">
          Location sharing is not active or hasn't started yet
        </p>
      </div>
    );
  }

  const { lat, lng, address } = location;
  
  // Google Maps embed URL (no API key needed for basic embed)
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  
  // Direct link to open in Google Maps app
  const googleMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-300 shadow-lg bg-white">
      {/* Map Container */}
      <div className="relative h-80">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          className="border-0"
          title={`${userName}'s Location`}
          allowFullScreen
        />
        
        {/* Open in Google Maps Button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-lg border border-gray-300 flex items-center gap-2 transition-all duration-200 hover:shadow-xl"
          >
            <FaExternalLinkAlt className="text-blue-600" />
            <span>Open in Google Maps</span>
          </a>
        </div>
        
        {/* Live Status Badge */}
        <div className="absolute top-4 left-4">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">LIVE</span>
          </div>
        </div>
      </div>
      
      {/* Location Info Panel */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FaMapMarkerAlt className="text-red-500" />
              <h3 className="font-bold text-gray-900">{userName}</h3>
            </div>
            <p className="text-gray-700 text-sm">{address}</p>
            <p className="text-xs text-gray-500 mt-2">
              📍 Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Updates every 30s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}