'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { 
  FaWhatsapp, 
  FaUser, 
  FaMapMarkerAlt, 
  FaShare, 
  FaLock, 
  FaLocationArrow,
  FaPhone,
  FaCar,
  FaClock,
  FaRoad,
  FaExclamationCircle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface ShareLocationProps {
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleDetails: string;
  pickup: string;
  destination: string;
  currentUserId: string;
}

export default function ShareLocation({ 
  tripId, 
  driverId,
  driverName, 
  vehicleDetails, 
  pickup, 
  destination,
  currentUserId
}: ShareLocationProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [sharedSuccess, setSharedSuccess] = useState(false);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [isCustomerSharing, setIsCustomerSharing] = useState(false);
  const [driverPhoneNumber, setDriverPhoneNumber] = useState<string>('');
  const [driverData, setDriverData] = useState<any>(null);
  const [isLoadingDriverData, setIsLoadingDriverData] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [tempPhoneInput, setTempPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string>('');

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Fetch driver's data including phone number
  useEffect(() => {
    if (showShareModal && driverId) {
      const fetchDriverData = async () => {
        setIsLoadingDriverData(true);
        try {
          const driverRef = doc(db, 'users', driverId);
          const driverDoc = await getDoc(driverRef);
          if (driverDoc.exists()) {
            const data = driverDoc.data();
            setDriverData(data);
            
            // Get driver phone number from the "phoneNumber" field
            const driverPhone = data.phoneNumber;
            setDriverPhoneNumber(driverPhone || '');
            
            if (data.location?.isSharing) {
              setDriverLocation(data.location);
            }
          }
        } catch (error) {
          console.error('Error fetching driver data:', error);
        } finally {
          setIsLoadingDriverData(false);
        }
      };

      fetchDriverData();
    }
  }, [showShareModal, driverId]);

  // Fetch customer's location sharing status
  useEffect(() => {
    if (showShareModal && currentUserId) {
      const fetchCustomerLocation = async () => {
        try {
          const userRef = doc(db, 'users', currentUserId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsCustomerSharing(data.location?.isSharing || false);
            if (data.location?.isSharing) {
              setCustomerLocation(data.location);
            }
          }
        } catch (error) {
          console.error('Error fetching customer location:', error);
        }
      };

      fetchCustomerLocation();
    }
  }, [showShareModal, currentUserId]);

  const generateTrackingLink = () => {
    return `${window.location.origin}/track/${tripId}?share=true&driver=${driverId}`;
  };

  const generateLiveLocationLink = () => {
    if (customerLocation) {
      return `https://www.google.com/maps?q=${customerLocation.lat || customerLocation.latitude},${customerLocation.lng || customerLocation.longitude}`;
    } else if (driverLocation) {
      return `https://www.google.com/maps?q=${driverLocation.lat || driverLocation.latitude},${driverLocation.lng || driverLocation.longitude}`;
    }
    return generateTrackingLink();
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    
    // Check if empty
    if (!cleanPhone) {
      setPhoneError('Phone number is required');
      return false;
    }
    
    // Check length for Nigerian numbers (10 or 11 digits)
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setPhoneError('Please enter a valid 10 or 11 digit phone number');
      return false;
    }
    
    // Check if starts with 0 for Nigerian numbers
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('0')) {
      setPhoneError('Nigerian numbers should start with 0');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handleShareLocation = () => {
    // Validate phone number before proceeding
    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    // Check if driver phone number is available
    if (!driverPhoneNumber) {
      setShowPhonePrompt(true);
      return;
    }

    setSharing(true);
    
    // Format phone number for WhatsApp
    let formattedNumber = phoneNumber.trim().replace(/\D/g, '');
    
    // Nigerian number formatting
    if (formattedNumber.startsWith('0') && formattedNumber.length === 11) {
      formattedNumber = '234' + formattedNumber.substring(1);
    } else if (formattedNumber.length === 10) {
      formattedNumber = '234' + formattedNumber;
    }
    
    const trackingLink = generateTrackingLink();
    const liveLocationLink = generateLiveLocationLink();
    
    // Build driver contact information
    let driverContactInfo = '';
    if (driverPhoneNumber) {
      driverContactInfo = `📞 *Driver Contact:* ${driverPhoneNumber}\n`;
      if (driverPhoneNumber.startsWith('+234') || driverPhoneNumber.startsWith('234') || driverPhoneNumber.startsWith('0')) {
        const whatsappNumber = driverPhoneNumber.replace(/\D/g, '').replace(/^0/, '234');
        driverContactInfo += `📱 *WhatsApp:* https://wa.me/${whatsappNumber}\n`;
      }
    }
    
    // FIXED: Handle undefined vehicleDetails
    const vehicleInfo = vehicleDetails && vehicleDetails !== 'undefined undefined' ? ` (${vehicleDetails})` : '';
    
    // FIXED: Build the message properly
    let shareMessage = '';
    
    if (message.trim()) {
      // If custom message is provided, use it as the main message
      shareMessage = `${message.trim()}\n\n`;
      
      // Then add the trip details
      shareMessage += `🚗 *Nomopoventures Trip Sharing*\n\n`;
      shareMessage += `📍 *From:* ${pickup}\n`;
      shareMessage += `🎯 *To:* ${destination}\n`;
      shareMessage += `⏰ *Time:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
      shareMessage += `📅 *Date:* ${new Date().toLocaleDateString()}\n\n`;
      
      if (driverName && driverName !== 'Driver') {
        shareMessage += `👤 *Driver:* ${driverName}${vehicleInfo}\n`;
      }
      
      if (driverContactInfo) {
        shareMessage += driverContactInfo;
      }
      
      // Add location status
      if (isCustomerSharing && customerLocation) {
        shareMessage += `\n📍 *Live Location:* ${liveLocationLink}\n`;
        shareMessage += `   ${customerLocation.address || 'Live location enabled'}\n`;
      } else if (driverLocation) {
        shareMessage += `\n🚗 *Driver Location:* ${liveLocationLink}\n`;
        shareMessage += `   ${driverLocation.address || 'Driver location enabled'}\n`;
      }
    } else {
      // If no custom message, use the default format
      shareMessage = `🚗 *Nomopoventures Trip Sharing*\n\n`;
      
      if (driverName && driverName !== 'Driver') {
        shareMessage += `I'm traveling with ${driverName}${vehicleInfo}\n\n`;
      }
      
      shareMessage += `📍 *From:* ${pickup}\n`;
      shareMessage += `🎯 *To:* ${destination}\n`;
      shareMessage += `⏰ *Time:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
      shareMessage += `📅 *Date:* ${new Date().toLocaleDateString()}\n\n`;
      
      if (driverContactInfo) {
        shareMessage += driverContactInfo;
      }
      
      // Add location status
      if (isCustomerSharing && customerLocation) {
        shareMessage += `\n📍 *My Live Location:* ${liveLocationLink}\n`;
        shareMessage += `   ${customerLocation.address || 'Live location enabled'}\n`;
      } else if (driverLocation) {
        shareMessage += `\n🚗 *Driver Live Location:* ${liveLocationLink}\n`;
        shareMessage += `   ${driverLocation.address || 'Driver location enabled'}\n`;
      }
    }
    
    shareMessage += `\n_Shared via Nomopoventures Safety Feature_\n`;
    shareMessage += `📍 _Real-time location tracking enabled_`;
    
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(shareMessage)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Also start customer location sharing if not already sharing
    if (!isCustomerSharing) {
      startCustomerLocationSharing();
    }
    
    setSharing(false);
    setSharedSuccess(true);
    
    // Reset after 5 seconds
    setTimeout(() => {
      setShowShareModal(false);
      setSharedSuccess(false);
      setPhoneNumber('');
      setMessage('');
      setPhoneError('');
    }, 5000);
  };

  const handlePromptContinue = () => {
    if (!tempPhoneInput.trim()) {
      toast.error('Please enter the driver\'s phone number');
      return;
    }
    
    // Update the driver phone number for this share
    setDriverPhoneNumber(tempPhoneInput);
    setShowPhonePrompt(false);
    
    // Continue with sharing
    setTimeout(() => {
      handleShareLocation();
    }, 100);
  };

  const startCustomerLocationSharing = async () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        
        try {
          const userRef = doc(db, 'users', currentUserId);
          await updateDoc(userRef, {
            location: {
              lat: latitude,
              lng: longitude,
              accuracy,
              address,
              timestamp: Timestamp.now(),
              isSharing: true
            },
            lastLocationUpdate: Timestamp.now()
          });

          setIsCustomerSharing(true);
          setCustomerLocation({
            lat: latitude,
            lng: longitude,
            accuracy,
            address
          });
        } catch (error) {
          console.error('Error starting location sharing:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
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

  const formatDriverPhoneNumber = (phone: string) => {
    if (!phone) return 'Not available';
    
    // Format for display
    if (phone.startsWith('+234')) {
      return `0${phone.slice(4)}`;
    } else if (phone.startsWith('234')) {
      return `0${phone.slice(3)}`;
    }
    return phone;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    
    // Clear error when user starts typing
    if (phoneError && value.trim()) {
      setPhoneError('');
    }
  };

  return (
    <>
      {/* Share Button (in trip banner/modal) */}
      <button
        onClick={() => setShowShareModal(true)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
      >
        <FaShare />
        Share Trip & Location
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaLock className="text-green-600" />
                Share Trip & Location
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Phone Prompt Modal */}
            {showPhonePrompt && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <FaPhone className="text-yellow-600" />
                  Driver Phone Number Required
                </h4>
                <p className="text-yellow-700 mb-4 text-sm">
                  Driver's phone number is not available. Please enter it below to include in the message.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver's Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g., 08012345678"
                      value={tempPhoneInput}
                      onChange={(e) => setTempPhoneInput(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will only be used for this share
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPhonePrompt(false);
                        setTempPhoneInput('');
                      }}
                      className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePromptContinue}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Continue Sharing
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sharedSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaWhatsapp className="text-green-600 text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Shared Successfully!</h4>
                <p className="text-gray-600 mb-4">
                  Trip details and location shared via WhatsApp.
                </p>
                {isCustomerSharing && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <FaLocationArrow />
                      Your real-time location is now being shared
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!showPhonePrompt && (
                  <>
                    <div className="mb-6">
                      <p className="text-gray-700 mb-4">
                        Share your trip details and live location with family/friends for safety.
                      </p>
                      
                      {/* Driver Information Card */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          <FaCar />
                          Driver Information
                        </h4>
                        
                        {isLoadingDriverData ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading driver info...</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Driver Name:</span>
                              <span className="font-semibold text-gray-900">{driverName || 'Not specified'}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <FaPhone className="text-gray-500" />
                                Driver Phone:
                              </span>
                              <div className="text-right">
                                {driverPhoneNumber ? (
                                  <>
                                    <span className="font-semibold text-green-700">
                                      {formatDriverPhoneNumber(driverPhoneNumber)}
                                    </span>
                                    <p className="text-xs text-gray-500">
                                      Included in WhatsApp message
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-yellow-700 font-medium">
                                    Not available
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Vehicle:</span>
                              <span className="font-semibold text-gray-900">
                                {vehicleDetails && vehicleDetails !== 'undefined undefined' 
                                  ? vehicleDetails 
                                  : 'Not specified'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Location Status */}
                      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                          <FaMapMarkerAlt />
                          Location Status
                        </h4>
                        
                        {isCustomerSharing ? (
                          <div className="space-y-2">
                            <p className="text-green-700 text-sm flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              Your live location is being shared
                            </p>
                            {customerLocation?.address && (
                              <p className="text-sm text-gray-700 flex items-center gap-2">
                                <FaRoad className="text-gray-500" />
                                {customerLocation.address}
                              </p>
                            )}
                          </div>
                        ) : driverLocation ? (
                          <div className="space-y-2">
                            <p className="text-blue-700 text-sm flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              Driver location is available
                            </p>
                            {driverLocation.address && (
                              <p className="text-sm text-gray-700 flex items-center gap-2">
                                <FaRoad className="text-gray-500" />
                                {driverLocation.address}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-yellow-700 text-sm flex items-center gap-2">
                            <FaClock className="text-yellow-600" />
                            Live location not available. Trip tracking link will be shared.
                          </p>
                        )}
                        
                        {!isCustomerSharing && (
                          <button
                            onClick={startCustomerLocationSharing}
                            className="mt-2 w-full py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <FaLocationArrow />
                            Enable My Live Location
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaUser className="inline mr-2" />
                            Recipient's WhatsApp Number
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g., 08012345678"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            onBlur={() => {
                              if (phoneNumber.trim()) {
                                validatePhoneNumber(phoneNumber);
                              }
                            }}
                            className={`w-full p-3 border ${phoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} rounded-lg focus:ring-2`}
                          />
                          
                          {/* Phone Number Error Message */}
                          {phoneError && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-red-700">
                                  {phoneError}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-1">
                            Enter Nigerian WhatsApp number (10 or 11 digits starting with 0)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaMapMarkerAlt className="inline mr-2" />
                            Custom Message (Optional)
                          </label>
                          <textarea
                            placeholder="Add a personal message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            If provided, your message will appear first, followed by trip details
                          </p>
                        </div>

                        {/* Trip Info Preview */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <FaCar className="text-gray-600" />
                            Trip Summary
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Pickup:</span>
                              <span className="text-sm font-medium text-gray-800">{pickup}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Destination:</span>
                              <span className="text-sm font-medium text-gray-800">{destination}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Time:</span>
                              <span className="text-sm font-medium text-gray-800">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <p className="text-xs text-gray-500">
                              {isCustomerSharing 
                                ? "✅ Your live location included" 
                                : driverLocation 
                                ? "✅ Driver's location included" 
                                : driverPhoneNumber
                                  ? "✅ Driver phone number included"
                                  : "📍 Trip details will be shared"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                      <button
                        onClick={() => setShowShareModal(false)}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleShareLocation}
                        disabled={!phoneNumber.trim() || sharing || !!phoneError}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sharing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Sharing...
                          </>
                        ) : (
                          <>
                            <FaWhatsapp className="text-lg" />
                            Share via WhatsApp
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}