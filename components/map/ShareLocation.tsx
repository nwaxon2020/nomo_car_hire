'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import {
  FaWhatsapp,
  FaShare,
  FaCar,
  FaTimes,
  FaLocationArrow
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
  currentUserId,
}: ShareLocationProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [sharedSuccess, setSharedSuccess] = useState(false);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [isCustomerSharing, setIsCustomerSharing] = useState(false);
  const [driverPhoneNumber, setDriverPhoneNumber] = useState<string>('');
  const [isLoadingDriverData, setIsLoadingDriverData] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Format phone number for WhatsApp
  const formatPhoneForWhatsApp = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '234' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      return '234' + cleaned;
    } else if (cleaned.startsWith('234') && cleaned.length === 13) {
      return cleaned;
    } else if (cleaned.startsWith('+234') && cleaned.length === 14) {
      return cleaned.substring(1);
    }

    return cleaned;
  };

  // Validate phone number
  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = cleaned.length === 10 || cleaned.length === 11 || cleaned.length === 13;

    if (!isValid) {
      setPhoneError('Please enter a valid phone number (e.g., 08012345678)');
    } else {
      setPhoneError('');
    }

    return isValid;
  };

  // Generate tracking token
  const generateTrackingToken = async (): Promise<string> => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const tokenRef = doc(db, 'trackingTokens', token);

    await setDoc(tokenRef, {
      tripId,
      driverId,
      userId: currentUserId,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
      isValid: true
    });

    return token;
  };

  // Handle share location
  const handleShareLocation = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    setSharing(true);

    try {
      // Generate tracking token
      const token = await generateTrackingToken();
      const trackingLink = `${window.location.origin}/track/${tripId}/${token}`;

      // Get current location if sharing is active
      let locationText = '';
      if (driverLocation && driverLocation.lat && driverLocation.lng) {
        locationText = `\n📍 Current Location: https://maps.google.com/?q=${driverLocation.lat},${driverLocation.lng}`;
      }

      // Create WhatsApp message
      const whatsappMessage = `🚗 *Trip Details - Nomo Ventures* 🚗\n\n` +
        `*Driver:* ${driverName}\n` +
        `*Vehicle:* ${vehicleDetails}\n` +
        `*Pickup:* ${pickup || 'Not specified'}\n` +
        `*Destination:* ${destination || 'Not specified'}\n` +
        `${locationText}\n\n` +
        `🔗 *Live Tracking:* ${trackingLink}\n\n` +
        `${message ? `*Note:* ${message}\n\n` : ''}` +
        `_This link expires in 24 hours._\n` +
        `_Shared via Nomo Ventures Safety Feature_`;

      const formattedNumber = formatPhoneForWhatsApp(phoneNumber);
      const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(whatsappMessage)}`;

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');

      setSharedSuccess(true);
      toast.success('Trip shared successfully!');

      // Reset after 3 seconds
      setTimeout(() => {
        setShowShareModal(false);
        setTimeout(() => {
          setSharedSuccess(false);
          setPhoneNumber('');
          setMessage('');
        }, 300);
      }, 3000);

    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error('Failed to share location. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // Start customer location sharing
  const startCustomerLocationSharing = async () => {
    if (!currentUserId) return;

    try {
      const userRef = doc(db, 'users', currentUserId);

      // Get current position
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          await updateDoc(userRef, {
            'location': {
              lat: latitude,
              lng: longitude,
              timestamp: Timestamp.now(),
              isSharing: true
            },
            isLocationActive: true,
            locationLastUpdated: Timestamp.now()
          });

          setIsCustomerSharing(true);
          toast.success('Location sharing activated!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get your location. Please enable GPS.');
        }
      );
    } catch (error) {
      console.error('Error starting location sharing:', error);
      toast.error('Failed to activate location sharing');
    }
  };

  // Fetch driver data when modal opens
  useEffect(() => {
    if (showShareModal && driverId) {
      const fetchDriverData = async () => {
        setIsLoadingDriverData(true);
        try {
          const driverRef = doc(db, 'users', driverId);
          const driverDoc = await getDoc(driverRef);
          if (driverDoc.exists()) {
            const data = driverDoc.data();
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

  // Check if customer is already sharing location
  useEffect(() => {
    if (currentUserId) {
      const checkCustomerSharing = async () => {
        try {
          const userRef = doc(db, 'users', currentUserId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsCustomerSharing(data.isLocationActive === true);
          }
        } catch (error) {
          console.error('Error checking customer sharing:', error);
        }
      };
      checkCustomerSharing();
    }
  }, [currentUserId]);

  return (
    <>
      {/* Premium Dark Share Button */}
      <button
        onClick={() => setShowShareModal(true)}
        className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-black hover:bg-emerald-500 hover:text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-emerald-500/20"
      >
        <FaShare className="text-xs" />
        Share Trip & Location
      </button>

      {/* Share Modal - Dark Mode */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] max-w-md w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-500 tracking-[0.3em] uppercase mb-1">Safety First</span>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  Secure Share
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setPhoneError('');
                  setPhoneNumber('');
                  setMessage('');
                }}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                <FaTimes />
              </button>
            </div>

            {sharedSuccess ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <FaWhatsapp className="text-emerald-500 text-3xl" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Trip Shared</h4>
                <p className="text-slate-400 text-sm mb-6">Details and location sent to your contact.</p>
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Real-time tracking is now active.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Driver Info Card */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <FaCar className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Designated Driver</p>
                      <p className="text-white font-bold">{driverName || 'Authenticating...'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 uppercase tracking-tighter">Phone</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {driverPhoneNumber ? driverPhoneNumber : 'Not Verified'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 uppercase tracking-tighter">Vehicle</span>
                      <span className="text-white font-medium">{vehicleDetails}</span>
                    </div>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 mb-2 block">
                      Recipient's Number
                    </label>
                    <input
                      type="tel"
                      placeholder="080 1234 5678"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (phoneError) validatePhoneNumber(e.target.value);
                      }}
                      className="w-full bg-slate-900/50 border border-white/10 p-4 rounded-2xl text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                    {phoneError && <p className="text-red-500 text-[10px] mt-2 ml-2 font-bold uppercase">{phoneError}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 mb-2 block">
                      Personal Note (Optional)
                    </label>
                    <textarea
                      placeholder="Hey, I'm on my way..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-slate-900/50 border border-white/10 p-4 rounded-2xl text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/50 transition-all resize-none h-24"
                    />
                  </div>
                </div>

                {/* Tracking Status Badge */}
                <div className={`p-4 rounded-2xl border transition-all ${isCustomerSharing ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isCustomerSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                      <span className="text-xs font-bold text-white uppercase tracking-widest">
                        {isCustomerSharing ? 'Live GPS Active' : 'GPS Offline'}
                      </span>
                    </div>
                    {!isCustomerSharing && (
                      <button
                        onClick={startCustomerLocationSharing}
                        className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors flex items-center gap-1"
                      >
                        <FaLocationArrow size={8} />
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setPhoneError('');
                      setPhoneNumber('');
                      setMessage('');
                    }}
                    className="flex-1 py-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShareLocation}
                    disabled={!phoneNumber.trim() || sharing || !!phoneError}
                    className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10"
                  >
                    {sharing ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <FaWhatsapp className="text-lg" />}
                    Share on WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}