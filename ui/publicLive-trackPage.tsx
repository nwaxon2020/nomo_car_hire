'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { 
 
  FaCar, 
  FaClock, 
  FaUser,
  FaPhone,
  FaShieldAlt,
  FaExclamationTriangle,
  FaArrowLeft,
  FaRoad,
  FaCalendar,
  FaStar,
  FaCheckCircle,
  FaChild,
  FaCrown,
  FaPercent
} from 'react-icons/fa';
import LiveMap from '@/components/map/LiveMap';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: any;
  isSharing: boolean;
  speed?: number;
  accuracy?: number;
}

interface UserData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  location?: LocationData;
  currentTripId?: string;
  isDriver?: boolean;
  vehicleInfo?: string;
  carName?: string;
  carModel?: string;
}

export default function PublicLiveTrackPage() {
  const params = useParams();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);

  useEffect(() => {
    const { userId, token } = params;
    
    if (!userId || !token) {
      setError('Invalid tracking link');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        // Check if token is valid
        const tokenRef = doc(db, 'trackingTokens', token as string);
        const tokenDoc = await getDoc(tokenRef);
        
        if (!tokenDoc.exists() || tokenDoc.data().userId !== userId) {
          setError('This tracking link has expired or is invalid');
          setLoading(false);
          return;
        }
        
        setIsValidToken(true);
        
        // Load user data
        const userRef = doc(db, 'users', userId as string);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        const data = userDoc.data();
        setUserData(data);
        
        // Set up real-time location listener
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const locData = userData.location || userData.currentLocation || {};
            
            if (locData.isSharing && locData.lat) {
              const newLocation: LocationData = {
                lat: locData.lat,
                lng: locData.lng,
                address: locData.address || 'On the move',
                timestamp: locData.timestamp,
                isSharing: true,
                speed: locData.speed,
                accuracy: locData.accuracy
              };
              
              setLocation(newLocation);
              
              // Add to location history (last 20 locations)
              setLocationHistory(prev => {
                const newHistory = [newLocation, ...prev.slice(0, 19)];
                return newHistory;
              });
            } else {
              setLocation(null);
            }
          }
        });
        
        setLoading(false);
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error verifying token:', error);
        setError('Failed to load tracking');
        setLoading(false);
      }
    };

    verifyToken();
  }, [params]);

  // Helper function to get user name in correct priority
  const getUserName = (data: any): string => {
    if (!data) return 'Your loved one';
    
    // First try firstName + lastName
    if (data.firstName && data.lastName) {
      return `${data.firstName} ${data.lastName}`;
    }
    // Then try fullName
    if (data.fullName) {
      return data.fullName;
    }
    // Then try email username
    if (data.email) {
      return data.email.split('@')[0];
    }
    // Finally fallback
    return 'Your loved one';
  };

  const formatTimeSince = (timestamp: any): string => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 10) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 120) return '1 min ago';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  };

  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return 'Not available';
    
    if (phone.startsWith('+234')) {
      return `0${phone.slice(4)}`;
    } else if (phone.startsWith('234')) {
      return `0${phone.slice(3)}`;
    }
    return phone;
  };

  // Function to navigate to car hire page and scroll to search-results
    const navigateToCarHire = () => {
        router.push('/user/car-hire');
        
        // Wait for page to load, then scroll to search-results section
        setTimeout(() => {
            const searchResultsElement = document.getElementById('search-results');
            if (searchResultsElement) {
            searchResultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };
    // Function to navigate to booking page and scroll to book-now
    const navigateToBooking = () => {
        router.push('/user/car-hire');
        
        // Wait for page to load, then scroll to book-now section
        setTimeout(() => {
            const bookNowElement = document.getElementById('book-now');
            if (bookNowElement) {
            bookNowElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading live tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !isValidToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-600 text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tracking Link Expired</h2>
          <p className="text-gray-600 mb-6">{error || 'This tracking link is no longer valid'}</p>
          <p className="text-sm text-gray-500">
            Ask your loved one to share a new tracking link with you
          </p>
        </div>
      </div>
    );
  }

  const userName = getUserName(userData);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="font-bold text-gray-900">Live Location Tracking</h1>
                <p className="text-sm text-gray-600">
                  Tracking: <span className="font-semibold">{userName}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${location?.isSharing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={`text-sm font-medium ${location?.isSharing ? 'text-green-600' : 'text-gray-500'}`}>
                {location?.isSharing ? 'LIVE NOW' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Live Map */}
        <div className="mb-6">
          <LiveMap 
            location={location ? {
              lat: location.lat,
              lng: location.lng,
              address: location.address || 'On the move'
            } : null}
            userName={userName}
          />
        </div>

        {/* Stats & Info - Now 4 cards with responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Person Being Tracked Card */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <FaUser className="text-blue-600 text-sm sm:text-base" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Person Being Tracked</h3>
            </div>
            <div className="space-y-2">
              <p className="text-base sm:text-lg font-semibold text-gray-800 truncate">{userName}</p>
              {userData?.phoneNumber && (
                <div className="flex items-center gap-1 mt-1 sm:mt-2">
                  <FaPhone className="text-gray-500 text-xs sm:text-sm" />
                  <span className="text-xs sm:text-sm text-gray-600 truncate">
                    {formatPhoneNumber(userData.phoneNumber)}
                  </span>
                </div>
              )}
              {userData?.email && (
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  ✉️ {userData.email}
                </p>
              )}
            </div>
          </div>
          
          {/* Car Hire Advertisement Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white rounded-full">
                <FaCrown className="text-blue-600 text-sm sm:text-base" />
              </div>
              <h3 className="font-bold text-blue-900 text-sm sm:text-base">Premium Car Hire</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-blue-800">Need a reliable ride?</p>
                <p className="text-sm sm:text-base font-semibold text-blue-900 truncate">
                  Book Luxury Cars Today!
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <FaCheckCircle className="text-green-500 text-xs" />
                  <p className="text-xs text-blue-700">✓ Verified & Insured Drivers</p>
                </div>
                <div className="flex items-center gap-1">
                  <FaStar className="text-yellow-500 text-xs" />
                  <p className="text-xs text-blue-700">✓ 5-Star Rated Service</p>
                </div>
                <div className="flex items-center gap-1">
                  <FaChild className="text-blue-500 text-xs" />
                  <p className="text-xs text-blue-700">✓ 24/7 Safety Support</p>
                </div>
              </div>
              
              <button
                onClick={navigateToCarHire}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Book Premium Car →
              </button>
            </div>
          </div>
          
          {/* Quick Booking Ad Card */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white rounded-full">
                <FaCalendar className="text-green-600 text-sm sm:text-base" />
              </div>
              <h3 className="font-bold text-green-900 text-sm sm:text-base">Instant Booking</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs sm:text-sm text-green-800">Get a ride in minutes!</p>
                <p className="text-sm sm:text-base font-semibold text-green-900 truncate">
                  Same-Day Service Available
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <FaClock className="text-green-500 text-xs" />
                  <p className="text-xs text-green-700">⏱️ 10-min Response Time</p>
                </div>
                <div className="flex items-center gap-1">
                  <FaCar className="text-green-500 text-xs" />
                  <p className="text-xs text-green-700">🚗 Wide Range of Vehicles</p>
                </div>
                <div className="flex items-center gap-1">
                  <FaPercent className="text-green-500 text-xs" />
                  <p className="text-xs text-green-700">🎉 First Ride Discount</p>
                </div>
              </div>
              
              <button
                onClick={navigateToBooking}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Book Now & Save →
              </button>
            </div>
          </div>
          
          {/* Trip Status Card */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <FaRoad className="text-purple-600 text-sm sm:text-base" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Tracking Status</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${location?.isSharing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {location?.isSharing ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {location?.timestamp && (
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Last Update</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                    {formatTimeSince(location.timestamp)}
                  </span>
                </div>
              )}
              
              {location?.speed && location.speed > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Speed</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-800">
                    {(location.speed * 3.6).toFixed(1)} km/h
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Updates</span>
                <span className="text-xs sm:text-sm font-medium text-gray-800">
                  Every 30s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FaShieldAlt className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-blue-800 mb-1 text-sm sm:text-base">Live Safety Tracking</h4>
              <p className="text-xs sm:text-sm text-blue-700">
                You are viewing real-time location updates of <span className="font-semibold">{userName}</span>. 
                The map updates automatically every 30 seconds as they move. 
                This tracking session will remain active as long as location sharing is enabled.
              </p>
            </div>
          </div>
        </div>

        {/* Big Promo Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">🚗 Need a Safe & Reliable Ride?</h3>
                <p className="text-blue-100 mb-4">
                  Book with Nomopoventures for premium car hire services with real-time tracking, 
                  verified drivers, and 24/7 customer support.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-700 rounded-full text-xs font-medium">✓ GPS Tracking</span>
                  <span className="px-3 py-1 bg-blue-700 rounded-full text-xs font-medium">✓ Insured Vehicles</span>
                  <span className="px-3 py-1 bg-blue-700 rounded-full text-xs font-medium">✓ 24/7 Support</span>
                  <span className="px-3 py-1 bg-blue-700 rounded-full text-xs font-medium">✓ Cashless Payment</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={navigateToCarHire}
                  className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Book Your Ride Now →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaChild className="text-green-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Safety First</h4>
                <p className="text-sm text-gray-600">Verified drivers & 24/7 tracking</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaClock className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Fast Response</h4>
                <p className="text-sm text-gray-600">10-minute average wait time</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaStar className="text-purple-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Premium Service</h4>
                <p className="text-sm text-gray-600">Luxury cars & professional drivers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}