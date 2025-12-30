'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { 
  FaMapMarkerAlt, 
  FaLocationArrow, 
  FaStopCircle, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaClock, 
  FaSignal,
  FaCar,
  FaPhone
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface DriverLocationToggleProps {
  driverId: string;
  vehicleId?: string;
  tripId?: string;
}

export default function DriverLocationToggle({ 
  driverId, 
  vehicleId,
  tripId,
}: DriverLocationToggleProps) {
  const [isLocationOn, setIsLocationOn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number, 
    lng: number, 
    accuracy?: number,
    address?: string
  } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTime, setActiveTime] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Check if current user is this driver
  const isCurrentDriver = currentUser?.uid === driverId;

  // Load driver data
  useEffect(() => {
    if (!driverId) return;

    const loadDriverData = async () => {
      try {
        const driverRef = doc(db, 'users', driverId);
        const driverDoc = await getDoc(driverRef);
        
        if (driverDoc.exists()) {
          const data = driverDoc.data();
          
          // DIRECT ACCESS - phoneNumber field as you specified
          const driverPhone = data.phoneNumber;
          setPhoneNumber(driverPhone || '');
          
          console.log('Loaded driver data:', {
            driverId,
            phoneNumber: driverPhone,
            hasPhoneNumber: !!driverPhone
          });

          // Check if location sharing is active
          const isSharing = data.location?.isSharing || data.isLocationActive || false;
          setIsLocationOn(isSharing);
          
          // Load current location if available
          if (data.location) {
            setCurrentLocation({
              lat: data.location.latitude || data.location.lat,
              lng: data.location.longitude || data.location.lng,
              accuracy: data.location.accuracy,
              address: data.location.address
            });
            if (data.location.timestamp) {
              setLastUpdate(data.location.timestamp.toDate());
            }
          }

          // Auto-restart location if it was previously on
          const savedStatus = localStorage.getItem(`driverLocation_${driverId}`);
          if (savedStatus === 'on' && !isSharing) {
            console.log('Auto-starting location from localStorage');
            startLocationTracking();
          }
        } else {
          console.error('Driver document not found');
          toast.error('Driver profile not found');
        }
      } catch (error) {
        console.error('Error loading driver data:', error);
      }
    };

    loadDriverData();
  }, [driverId]);

  // Timer for active time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isLocationOn) {
      interval = setInterval(() => {
        setActiveTime(prev => prev + 1);
      }, 60000);
    } else {
      setActiveTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocationOn]);

  // Function to update trip with driver location
  const updateTripWithDriverLocation = async (locationData: any) => {
    if (!tripId) return;
    
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        driverLocation: {
          lat: locationData.lat,
          lng: locationData.lng,
          accuracy: locationData.accuracy,
          address: locationData.address,
          timestamp: Timestamp.now(),
          isSharing: true
        },
        lastLocationUpdate: Timestamp.now(),
        driverId: driverId
      });
      console.log('Trip document updated with driver location');
    } catch (error) {
      console.error('Error updating trip with driver location:', error);
    }
  };

  // Function to clear driver location from trip
  const clearTripDriverLocation = async () => {
    if (!tripId) return;
    
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        'driverLocation.isSharing': false,
        lastLocationUpdate: Timestamp.now()
      });
    } catch (error) {
      console.error('Error clearing trip driver location:', error);
    }
  };

  const startLocationTracking = async () => {
    console.log('Starting location tracking check:', {
      isCurrentDriver,
      hasPhoneNumber: !!phoneNumber,
      phoneNumber,
      tripId
    });

    // Check if we're the driver
    if (!isCurrentDriver) {
      toast.error('Only the driver can start location sharing');
      return;
    }

    // SIMPLE CHECK - phoneNumber field should exist
    if (!phoneNumber) {
      console.error('Phone number missing:', { driverId, phoneNumber });
      
      // Let's double-check by fetching fresh data
      try {
        const driverRef = doc(db, 'users', driverId);
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          const freshData = driverDoc.data();
          const freshPhone = freshData.phoneNumber;
          console.log('Fresh fetch - phoneNumber:', freshPhone);
          
          if (!freshPhone) {
            toast.error(
              `Phone number is required. Please update your profile. Current value: "${freshPhone}"`,
              { duration: 5000 }
            );
            return;
          } else {
            // Update state with fresh data
            setPhoneNumber(freshPhone);
          }
        }
      } catch (error) {
        console.error('Error fetching fresh data:', error);
      }
      
      toast.error('Please add your phone number in profile settings');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    
    // Get current location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        
        const locationData = { lat: latitude, lng: longitude, accuracy, address };
        setCurrentLocation(locationData);
        setLastUpdate(new Date());
        
        try {
          const userRef = doc(db, 'users', driverId);
          
          await updateDoc(userRef, {
            location: {
              latitude,
              longitude,
              accuracy,
              address,
              timestamp: Timestamp.now(),
              isSharing: true,
              vehicleId: vehicleId || null
            },
            isLocationActive: true,
            locationSharedAt: Timestamp.now(),
            lastLocationUpdate: Timestamp.now()
          });

          console.log('Location sharing started successfully');
          toast.success('📍 Location sharing started!');
          
          // UPDATE TRIP WITH DRIVER LOCATION
          await updateTripWithDriverLocation(locationData);
          
        } catch (error: any) {
          console.error('Error updating location:', error);
          toast.error(`Failed to save location: ${error.message}`);
          setIsLoading(false);
          return;
        }

        // Start continuous tracking
        setIsLocationOn(true);
        setIsLoading(false);
        localStorage.setItem(`driverLocation_${driverId}`, 'on');

        const id = navigator.geolocation.watchPosition(
          async (watchPosition) => {
            const { latitude: lat, longitude: lng, accuracy: acc } = watchPosition.coords;
            const newAddress = await reverseGeocode(lat, lng);
            
            const newLocationData = { lat, lng, accuracy: acc, address: newAddress };
            setCurrentLocation(newLocationData);
            setLastUpdate(new Date());
            
            try {
              const userRef = doc(db, 'users', driverId);
              await updateDoc(userRef, {
                'location.latitude': lat,
                'location.longitude': lng,
                'location.accuracy': acc,
                'location.address': newAddress,
                'location.timestamp': Timestamp.now(),
                lastLocationUpdate: Timestamp.now()
              });
              
              // UPDATE TRIP WITH NEW LOCATION
              await updateTripWithDriverLocation(newLocationData);
            } catch (error) {
              console.error('Error updating location:', error);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            handleGeolocationError(error);
            stopLocationTracking();
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );

        setWatchId(id);
      },
      (error) => {
        setIsLoading(false);
        handleGeolocationError(error);
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      return data.display_name || 'On the way';
    } catch (error) {
      return 'Location updated';
    }
  };

  const handleGeolocationError = (error: any) => {
    let errorMessage = 'Failed to get location';
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location services in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
      default:
        errorMessage = 'An unknown error occurred.';
    }
    toast.error(errorMessage);
  };

  const stopLocationTracking = async () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsLocationOn(false);
    setIsLoading(false);
    localStorage.removeItem(`driverLocation_${driverId}`);
    
    try {
      const userRef = doc(db, 'users', driverId);
      await updateDoc(userRef, {
        'location.isSharing': false,
        isLocationActive: false,
        lastLocationUpdate: Timestamp.now()
      });
      
      // CLEAR DRIVER LOCATION FROM TRIP
      await clearTripDriverLocation();
      
      toast.success('📍 Location sharing stopped');
    } catch (error) {
      console.error('Error stopping location:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Only show for the driver
  if (!isCurrentDriver) {
    return null;
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isLocationOn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
            <FaCar className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Location Sharing</h2>
            <p className="text-gray-600 text-sm">
              Share your real-time location with customers
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
          <div className={`w-2 h-2 rounded-full ${isLocationOn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className={`text-sm font-medium ${isLocationOn ? 'text-green-700' : 'text-gray-700'}`}>
            {isLocationOn ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Trip Info Display (only when tripId exists) */}
      {tripId && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <FaMapMarkerAlt className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Trip Tracking</h4>
                <p className="text-blue-700 text-sm">
                  Your location will be shown to the customer in real-time
                </p>
              </div>
            </div>
            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Trip #{tripId.substring(0, 8)}...
            </div>
          </div>
        </div>
      )}

      {/* Phone Number Display */}
      <div className={`mb-4 p-4 rounded-lg border ${phoneNumber ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${phoneNumber ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <FaPhone />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">Phone Number</h4>
              {phoneNumber ? (
                <p className="text-green-700">
                  ✓ Verified: <span className="font-semibold">{phoneNumber}</span>
                </p>
              ) : (
                <p className="text-red-700">
                  ❌ Required for location sharing
                </p>
              )}
            </div>
          </div>
          {phoneNumber && (
            <button 
              onClick={() => window.location.href = '/profile/edit'}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Change
            </button>
          )}
        </div>
      </div>

      {/* Location Status */}
      {isLocationOn && currentLocation && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <FaCheckCircle className="text-blue-600" />
            <h4 className="font-bold text-blue-800">Location is Live</h4>
          </div>
          
          <div className="space-y-3">
            {currentLocation.address && (
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaMapMarkerAlt className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Current Address</span>
                </div>
                <p className="text-gray-800 text-sm">{currentLocation.address}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaClock className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Active Time</span>
                </div>
                <p className="text-gray-800 font-semibold">{formatActiveTime(activeTime)}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <FaSignal className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Accuracy</span>
                </div>
                <p className="text-gray-800 font-semibold">{getAccuracyLevel(currentLocation.accuracy)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Control Button */}
      <button
        onClick={isLocationOn ? stopLocationTracking : startLocationTracking}
        disabled={isLoading || (!phoneNumber && !isLocationOn)}
        className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
          isLoading 
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
            : !phoneNumber && !isLocationOn
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : isLocationOn 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
        }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Starting...
          </>
        ) : isLocationOn ? (
          <>
            <FaStopCircle />
            Stop Sharing Location
          </>
        ) : (
          <>
            <FaLocationArrow />
            Start Sharing Location
          </>
        )}
      </button>
    </div>
  );
}

// Helper functions
function formatActiveTime(minutes: number): string {
  if (minutes < 1) return 'Just started';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 120) return '1 hour';
  return `${Math.floor(minutes / 60)} hours`;
}

function getAccuracyLevel(accuracy?: number): string {
  if (!accuracy) return 'Unknown';
  if (accuracy < 10) return 'High';
  if (accuracy < 50) return 'Good';
  if (accuracy < 100) return 'Moderate';
  return 'Low';
}