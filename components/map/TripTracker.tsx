'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import {  
  FaCar, 
  FaRoute, 
  FaClock, 
  FaChevronDown, 
  FaChevronUp,
  FaUser,
  FaWalking
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
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    let unsubscribeTrip: (() => void) | undefined;
    let unsubscribeDriver: (() => void) | undefined;
    let unsubscribeCustomer: (() => void) | undefined;

    const setupListeners = () => {
      try {
        // Listen to trip data
        unsubscribeTrip = onSnapshot(doc(db, 'trips', tripId), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTripData(data);
            setIsLoading(false);
          }
        });

        // Listen to driver location if driverId exists
        if (driverId) {
          unsubscribeDriver = onSnapshot(doc(db, 'users', driverId), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const locationData = data.location || {};
              
              if (locationData.isSharing && (locationData.lat || locationData.latitude)) {
                setDriverLocation({
                  lat: locationData.lat || locationData.latitude,
                  lng: locationData.lng || locationData.longitude,
                  accuracy: locationData.accuracy,
                  address: locationData.address,
                  timestamp: locationData.timestamp,
                  isSharing: true
                });
              } else {
                setDriverLocation(null);
              }
            }
          });
        }

        // Listen to customer location if customerId exists
        if (customerId) {
          unsubscribeCustomer = onSnapshot(doc(db, 'users', customerId), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const locationData = data.location || {};
              
              if (locationData.isSharing && (locationData.lat || locationData.latitude)) {
                setCustomerLocation({
                  lat: locationData.lat || locationData.latitude,
                  lng: locationData.lng || locationData.longitude,
                  accuracy: locationData.accuracy,
                  address: locationData.address,
                  timestamp: locationData.timestamp,
                  isSharing: true
                });
              } else {
                setCustomerLocation(null);
              }
            }
          });
        }

      } catch (error) {
        console.error('Error setting up listeners:', error);
        setIsLoading(false);
      }
    };

    setupListeners();

    return () => {
      unsubscribeTrip?.();
      unsubscribeDriver?.();
      unsubscribeCustomer?.();
    };
  }, [tripId, driverId, customerId]);

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 text-sm mt-2">Loading tracker...</p>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">No trip data found</p>
      </div>
    );
  }

  // Calculate progress based on who is sharing location
  const calculateProgress = () => {
    // If both are sharing, show more progress
    if (driverLocation && customerLocation) return '75%';
    // If only driver is sharing
    if (driverLocation) return '65%';
    // If only customer is sharing
    if (customerLocation) return '35%';
    // Starting
    return '10%';
  };

  const getETA = () => {
    if (driverLocation && customerLocation) return '10-15 mins';
    if (driverLocation) return '15-20 mins';
    if (customerLocation) return 'Driver assigned soon';
    return 'Starting soon';
  };

  const getStatusMessage = () => {
    if (driverLocation && customerLocation) return 'Both locations active';
    if (driverLocation) return 'Driver en route';
    if (customerLocation) return 'Customer ready';
    return 'Awaiting location';
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Tracker Header */}
      <div 
        className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-full">
            <FaCar className="text-white text-sm" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Live Trip Tracker</h3>
            <p className="text-blue-600 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Active • {getStatusMessage()}
            </p>
          </div>
        </div>
        <button className="text-blue-600">
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {/* Collapsible Content */}
      {expanded && (
        <div className="p-4 space-y-4 animate-slideDown">
          {/* Dual Location Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Driver Location Card */}
            <div className={`rounded-lg p-3 border ${driverLocation ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1 rounded ${driverLocation ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  <FaCar className="text-sm" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm">Driver Location</h4>
              </div>
              {driverLocation ? (
                <>
                  <p className="text-gray-700 text-sm truncate">
                    {driverLocation.address || 'On the way'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {driverLocation.timestamp 
                        ? new Date(driverLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recently updated'
                      }
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${driverLocation.isSharing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {driverLocation.isSharing ? 'Live' : 'Paused'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 text-sm text-center py-2">
                  <FaClock className="inline mr-1 text-gray-400" />
                  Waiting for driver...
                </p>
              )}
            </div>

            {/* Customer Location Card */}
            <div className={`rounded-lg p-3 border ${customerLocation ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1 rounded ${customerLocation ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  <FaUser className="text-sm" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm">Customer Location</h4>
              </div>
              {customerLocation ? (
                <>
                  <p className="text-gray-700 text-sm truncate">
                    {customerLocation.address || 'Ready for pickup'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {customerLocation.timestamp 
                        ? new Date(customerLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recently updated'
                      }
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${customerLocation.isSharing ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {customerLocation.isSharing ? 'Live' : 'Paused'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 text-sm text-center py-2">
                  <FaWalking className="inline mr-1 text-gray-400" />
                  Customer location not shared
                </p>
              )}
            </div>
          </div>

          {/* Route Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaRoute className="text-blue-600" />
                <h4 className="font-semibold text-gray-800 text-sm">Route Progress</h4>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {getStatusMessage()}
              </span>
            </div>

            {/* Progress Bar with dual indicators */}
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 via-blue-400 to-red-500 transition-all duration-1000"
                style={{ width: calculateProgress() }}
              ></div>
              
              {/* Progress Points */}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              </div>
              
              {/* Customer Indicator (if sharing) */}
              {customerLocation && (
                <div className="absolute left-1/3 top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center">
                    <FaUser className="text-white text-xs" />
                  </div>
                </div>
              )}
              
              {/* Driver Indicator (if sharing) */}
              {driverLocation && (
                <div className="absolute left-2/3 top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                  <div className="w-5 h-5 rounded-full bg-green-600 border-2 border-white shadow-md flex items-center justify-center">
                    <FaCar className="text-white text-xs" />
                  </div>
                </div>
              )}
              
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
              </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs">
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-1"></div>
                <span className="text-gray-600 font-medium">Pickup</span>
                <p className="text-gray-500 truncate max-w-[80px]">{tripData.pickupLocation}</p>
              </div>
              
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-1"></div>
                <span className="text-gray-600 font-medium">Customer</span>
                <p className="text-gray-500">
                  {customerLocation ? 'Live' : 'Ready'}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-green-600 mx-auto mb-1"></div>
                <span className="text-gray-600 font-medium">Driver</span>
                <p className="text-gray-500">
                  {driverLocation ? 'En Route' : 'Coming'}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-1"></div>
                <span className="text-gray-600 font-medium">Destination</span>
                <p className="text-gray-500 truncate max-w-[80px]">{tripData.destination}</p>
              </div>
            </div>
          </div>

          {/* ETA Card */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-3 text-white">
            <div className="flex items-center justify-center gap-2">
              <FaClock className="text-blue-300" />
              <div className="text-center">
                <p className="text-sm text-gray-300">Estimated Arrival</p>
                <p className="text-lg font-bold">
                  {getETA()}
                </p>
              </div>
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tracking Status:</span>
              <div className="flex items-center gap-2">
                {driverLocation && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <FaCar className="text-xs" /> Driver Live
                  </span>
                )}
                {customerLocation && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                    <FaUser className="text-xs" /> Customer Live
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {driverLocation && customerLocation 
                ? 'Both locations are being tracked in real-time' 
                : driverLocation 
                  ? 'Driver location is being tracked' 
                  : customerLocation 
                    ? 'Customer location is being tracked'
                    : 'Awaiting location sharing'
              }
            </p>
          </div>

          {/* Safety Info */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <p className="text-yellow-800 text-xs flex items-center gap-2">
              <span className="text-yellow-600">🛡️</span>
              Your trip is being tracked for safety. Location updates automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}