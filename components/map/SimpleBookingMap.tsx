'use client';

import { toast } from 'react-hot-toast'; // If using react-hot-toast
import { useEffect } from 'react';

interface SimpleBookingMapProps {
  pickupLocation: string;
  destination: string;
  driverLocation?: string;
  onLocationSelect: (type: 'pickup' | 'destination', value: string) => void;
}

export default function SimpleBookingMap({ 
  pickupLocation, 
  destination, 
  driverLocation,
  onLocationSelect 
}: SimpleBookingMapProps) {
  
  const handleLocationChange = (type: 'pickup' | 'destination', value: string) => {
    onLocationSelect(type, value);
    
    // Show toast notifications when locations are updated
    if (value.trim()) {
      if (type === 'pickup') {
        toast.success('Pickup location updated!');
      } else {
        toast.success('Destination updated!');
      }
    }
  };

  // Optional: Show success toast when both locations are filled
  useEffect(() => {
    if (pickupLocation && destination) {
      toast.success('Route set successfully! You can now proceed with booking.');
    }
  }, [pickupLocation, destination]);

  return (
    <div className="w-full bg-gray-50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-blue-600">📍</span> Trip Route
      </h3>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Simple location inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location
            </label>
            <input
              type="text"
              placeholder="Enter pickup address..."
              value={pickupLocation || ''}
              onChange={(e) => handleLocationChange('pickup', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <input
              type="text"
              placeholder="Where do you want to go?"
              value={destination || ''}
              onChange={(e) => handleLocationChange('destination', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Simple map visualization */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Pickup: {pickupLocation || 'Not set'}</span>
            </div>
            <div className="text-gray-500">→</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium">Destination: {destination || 'Not set'}</span>
            </div>
          </div>
          
          {driverLocation && (
            <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">
                  Driver Location: {driverLocation}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Success message (inline) */}
        {pickupLocation && destination && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-700 font-medium flex items-center gap-2">
              <span>✓</span>
              Route set successfully. You can now proceed with booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}