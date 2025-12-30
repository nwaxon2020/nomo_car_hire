'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  doc, 
  updateDoc, 
  Timestamp, 
  getDoc, 
  onSnapshot,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { 
  FaMapMarkerAlt, 
  FaUserFriends,
  FaShareAlt,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTimes,
  FaUser,
  FaEnvelope,
  FaMap,
  FaCheckCircle,
  FaShieldAlt,
  FaWhatsapp,
  FaPhone,
  FaInfoCircle,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface CustomerLocationToggleProps {
  userId: string;
  tripId?: string;
}

interface LovedOne {
  id: string;
  whatsappNumber: string;
  name: string;
  formattedNumber: string;
  isAppUser: boolean;
}

export default function CustomerLocationToggle({ userId, tripId }: CustomerLocationToggleProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [newLovedOneNumber, setNewLovedOneNumber] = useState('');
  const [addingLovedOne, setAddingLovedOne] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sendingLinks, setSendingLinks] = useState<string[]>([]);

  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const MIN_DISTANCE_METERS = 10;

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | undefined;

    const loadUserData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const locationData = data.location || data.currentLocation || {};

          const isCurrentlySharing = locationData.isSharing || data.isLocationActive || false;
          setIsSharing(isCurrentlySharing);

          if (isCurrentlySharing && locationData.lat) {
            setCurrentLocation(locationData);
            lastCoordsRef.current = { lat: locationData.lat, lng: locationData.lng };

            if (locationData.timestamp) {
              setLastUpdate(locationData.timestamp.toDate());
            }
          }

          // Load loved ones (both app users and WhatsApp contacts)
          await loadLovedOnesDetails(data.lovedOnes || [], data.whatsappLovedOnes || []);
        }

        unsubscribe = onSnapshot(userRef, (docSnap) => {
          if (!docSnap.exists()) return;

          const data = docSnap.data();
          const locationData = data.location || data.currentLocation || {};
          const isCurrentlySharing = locationData.isSharing || data.isLocationActive || false;

          setIsSharing(isCurrentlySharing);

          if (isCurrentlySharing && locationData.lat) {
            setCurrentLocation(locationData);

            if (locationData.timestamp) {
              setLastUpdate(locationData.timestamp.toDate());
            }
          } else {
            setCurrentLocation(null);
          }
        });
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load location data');
      } finally {
        setLoading(false);
      }
    };

    const loadLovedOnesDetails = async (appUserIds: string[], whatsappContactIds: string[]) => {
      const lovedOnesData: LovedOne[] = [];

      // Load app users
      for (const lovedOneId of appUserIds) {
        try {
          const lovedOneRef = doc(db, 'users', lovedOneId);
          const lovedOneDoc = await getDoc(lovedOneRef);

          if (lovedOneDoc.exists()) {
            const lovedOneData = lovedOneDoc.data();
            const phoneNumber = lovedOneData.phoneNumber || '';
            
            lovedOnesData.push({
              id: lovedOneId,
              whatsappNumber: phoneNumber,
              name: lovedOneData.name || formatPhoneForDisplay(phoneNumber),
              formattedNumber: formatPhoneForDisplay(phoneNumber),
              isAppUser: true
            });
          }
        } catch (error) {
          console.error('Error loading loved one:', error);
        }
      }

      // Load WhatsApp contacts
      for (const contactId of whatsappContactIds) {
        try {
          const contactRef = doc(db, 'whatsappContacts', contactId);
          const contactDoc = await getDoc(contactRef);

          if (contactDoc.exists()) {
            const contactData = contactDoc.data();
            
            lovedOnesData.push({
              id: contactId,
              whatsappNumber: contactData.whatsappNumber || '',
              name: contactData.displayNumber || 'WhatsApp Contact',
              formattedNumber: formatPhoneForDisplay(contactData.whatsappNumber || ''),
              isAppUser: false
            });
          }
        } catch (error) {
          console.error('Error loading WhatsApp contact:', error);
        }
      }

      setLovedOnes(lovedOnesData);
    };

    loadUserData();

    return () => {
      if (unsubscribe) unsubscribe();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [userId]);

  // Format phone for WhatsApp search
  const formatPhoneForSearch = (phone: string): string => {
    if (!phone) return '';
    
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

  // Format phone for display
  const formatPhoneForDisplay = (phone: string): string => {
    if (!phone) return 'Unknown';
    
    if (phone.startsWith('+234') && phone.length === 14) {
      return '0' + phone.slice(4);
    } else if (phone.startsWith('234') && phone.length === 13) {
      return '0' + phone.slice(3);
    }
    
    return phone;
  };

  // Generate unique tracking token
  const generateToken = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Send WhatsApp tracking link
  const sendTrackingLink = async (lovedOne: LovedOne) => {
    try {
      setSendingLinks(prev => [...prev, lovedOne.id]);
      
      // Generate unique token
      const token = generateToken();
      const trackingLink = `${window.location.origin}/track/${userId}/${token}`;
      
      // Store token in Firestore (valid for 24 hours)
      const tokenRef = doc(db, 'trackingTokens', token);
      await setDoc(tokenRef, {
        userId,
        whatsappNumber: lovedOne.whatsappNumber,
        lovedOneId: lovedOne.id,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        isValid: true
      });
      
      // Create WhatsApp message
      const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Someone';
      const message = `🚗 *Nomopoventures Live Tracking*\n\n` +
        `${userName} is sharing their live location with you!\n\n` +
        `📍 *Click to track live:* ${trackingLink}\n\n` +
        `⏰ Link valid for 24 hours\n` +
        `📍 Updates every 30 seconds\n` +
        `🗺️ See real-time movement on map\n\n` +
        `_Shared via Nomopoventures Safety Feature_`;
      
      const formattedNumber = formatPhoneForSearch(lovedOne.whatsappNumber);
      const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      toast.success(`Tracking link sent to ${lovedOne.formattedNumber}`);
      
    } catch (error) {
      console.error('Error sending tracking link:', error);
      toast.error('Failed to send tracking link');
    } finally {
      setSendingLinks(prev => prev.filter(id => id !== lovedOne.id));
    }
  };

  // Send tracking links to all loved ones
  const sendLinksToAll = () => {
    lovedOnes.forEach(lovedOne => {
      if (!sendingLinks.includes(lovedOne.id)) {
        sendTrackingLink(lovedOne);
      }
    });
  };

  const startLocationSharing = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await reverseGeocode(latitude, longitude);

        try {
          const userRef = doc(db, 'users', userId);

          const locationData = {
            lat: latitude,
            lng: longitude,
            accuracy,
            address,
            timestamp: Timestamp.now(),
            isSharing: true
          };

          await updateDoc(userRef, {
            location: locationData,
            isLocationActive: true,
            locationLastUpdated: Timestamp.now(),
            locationSharedAt: Timestamp.now()
          });

          setIsSharing(true);
          setCurrentLocation(locationData);
          setLastUpdate(new Date());
          lastCoordsRef.current = { lat: latitude, lng: longitude };

          toast.success('📍 Live location sharing started!');

          // Auto-send tracking links to loved ones
          if (lovedOnes.length > 0) {
            toast.success('Sending tracking links to loved ones...');
            sendLinksToAll();
          }

          const id = navigator.geolocation.watchPosition(
            async (pos) => {
              const { latitude: lat, longitude: lng, accuracy } = pos.coords;

              if (lastCoordsRef.current) {
                const dist = getDistanceInMeters(
                  lastCoordsRef.current.lat,
                  lastCoordsRef.current.lng,
                  lat,
                  lng
                );

                if (dist < MIN_DISTANCE_METERS) return;
              }

              lastCoordsRef.current = { lat, lng };

              const newAddress = await reverseGeocode(lat, lng);

              await updateDoc(userRef, {
                'location.lat': lat,
                'location.lng': lng,
                'location.accuracy': accuracy,
                'location.address': newAddress,
                'location.timestamp': Timestamp.now(),
                locationLastUpdated: Timestamp.now()
              });
            },
            (error) => {
              console.error('Location watch error:', error);
              toast.error('Location tracking error');
              stopLocationSharing();
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000
            }
          );

          setWatchId(id);
        } catch (error) {
          console.error('Error starting sharing:', error);
          toast.error('Failed to start location sharing');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get your location');
        setLoading(false);
      }
    );
  };

  const stopLocationSharing = async () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'location.isSharing': false,
        isLocationActive: false,
        locationLastUpdated: Timestamp.now()
      });

      setIsSharing(false);
      setCurrentLocation(null);
      lastCoordsRef.current = null;
      toast.success('Location sharing stopped');
    } catch (error) {
      console.error('Error stopping sharing:', error);
      toast.error('Failed to stop location sharing');
    }
  };

  const addLovedOne = async (whatsappNumber: string) => {
    const cleanedNumber = whatsappNumber.replace(/\D/g, '');
    if (!(cleanedNumber.length === 10 || cleanedNumber.length === 11)) {
      toast.error('Enter valid Nigerian number (10 or 11 digits)');
      return;
    }

    setAddingLovedOne(true);

    try {
      // Check if it's an app user by phone number
      const formattedNumber = formatPhoneForSearch(whatsappNumber);
      const usersRef = collection(db, 'users');
      const possibleFormats = [
        formattedNumber,
        '0' + formattedNumber.slice(3),
        '+' + formattedNumber,
        formattedNumber.slice(3)
      ];

      let isAppUser = false;
      let lovedOneId = '';
      let lovedOneData: any = {};

      for (const phoneFormat of possibleFormats) {
        const q = query(usersRef, where('phoneNumber', '==', phoneFormat));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          isAppUser = true;
          lovedOneId = querySnapshot.docs[0].id;
          lovedOneData = querySnapshot.docs[0].data();
          break;
        }
      }

      if (!isAppUser) {
        // Create WhatsApp contact entry
        lovedOneId = `whatsapp_${formattedNumber}`;
        const contactRef = doc(db, 'whatsappContacts', lovedOneId);
        
        await setDoc(contactRef, {
          whatsappNumber: formattedNumber,
          displayNumber: formatPhoneForDisplay(whatsappNumber),
          createdAt: Timestamp.now(),
          isWhatsAppOnly: true
        });
      }

      // Check if already added
      if (lovedOnes.some(lo => lo.id === lovedOneId)) {
        toast.error('This contact is already added');
        return;
      }

      // Add to user's loved ones
      const userRef = doc(db, 'users', userId);
      
      if (isAppUser) {
        await updateDoc(userRef, {
          lovedOnes: arrayUnion(lovedOneId)
        });
      } else {
        await updateDoc(userRef, {
          whatsappLovedOnes: arrayUnion(lovedOneId)
        });
      }

      // Update local state
      setLovedOnes(prev => [...prev, {
        id: lovedOneId,
        whatsappNumber: formattedNumber,
        name: isAppUser ? (lovedOneData.name || formatPhoneForDisplay(whatsappNumber)) : formatPhoneForDisplay(whatsappNumber),
        formattedNumber: formatPhoneForDisplay(whatsappNumber),
        isAppUser
      }]);

      setNewLovedOneNumber('');
      toast.success(`${formatPhoneForDisplay(whatsappNumber)} added to loved ones`);
      
    } catch (error) {
      console.error('Error adding loved one:', error);
      toast.error('Failed to add contact');
    } finally {
      setAddingLovedOne(false);
    }
  };

  const removeLovedOne = async (lovedOneId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return;

      if (lovedOneId.startsWith('whatsapp_')) {
        const updated = (userDoc.data().whatsappLovedOnes || []).filter((id: string) => id !== lovedOneId);
        await updateDoc(userRef, { whatsappLovedOnes: updated });
      } else {
        const updated = (userDoc.data().lovedOnes || []).filter((id: string) => id !== lovedOneId);
        await updateDoc(userRef, { lovedOnes: updated });
      }

      setLovedOnes(prev => prev.filter(lo => lo.id !== lovedOneId));
      toast.success('Contact removed');
    } catch (error) {
      console.error('Error removing loved one:', error);
      toast.error('Failed to remove contact');
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      return data.display_name || 'On the way';
    } catch {
      return 'Location updated';
    }
  };

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const formatTimeSince = (date: Date | null): string => {
    if (!date) return 'Never';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 120) return '1 minute ago';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading location settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-2 md:p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isSharing ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
            <FaMapMarkerAlt className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Location Sharing</h2>
            <p className="text-gray-600">
              Share your real-time location with loved ones
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isSharing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <span className={`text-sm font-medium ${isSharing ? 'text-green-600' : 'text-gray-500'}`}>
            {isSharing ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Current Status */}
      {isSharing && currentLocation && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <FaCheckCircle className="text-green-600" />
            <h4 className="font-bold text-green-800">Currently Sharing Location</h4>
          </div>
          
          <div className="space-y-3">
            {currentLocation.address && (
              <div className="bg-white p-3 rounded-lg border border-green-100">
                <p className="text-gray-800 font-medium">📍 {currentLocation.address}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-green-100">
                <p className="text-xs text-gray-500">Coordinates</p>
                <p className="text-sm font-medium text-gray-800">
                  {currentLocation.lat?.toFixed(6)}, {currentLocation.lng?.toFixed(6)}
                </p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-green-100">
                <p className="text-xs text-gray-500">Last Update</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatTimeSince(lastUpdate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Toggle Button */}
      <div className="mb-6">
        <button
          onClick={isSharing ? stopLocationSharing : startLocationSharing}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all duration-300 flex items-center justify-center gap-2 ${
            isSharing 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </>
          ) : isSharing ? (
            <>
              <FaEyeSlash className="text-xl" />
              Stop Sharing
            </>
          ) : (
            <>
              <FaEye className="text-xl" />
              Start Sharing
            </>
          )}
        </button>
        
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSharing 
            ? '✅ Your location is updating in real-time'
            : 'Turn on to share your live location with loved ones'}
        </p>
      </div>

      {/* Add Loved One Section - UPDATED FOR WHATSAPP */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FaWhatsapp className="text-green-600" />
          Add WhatsApp Contacts
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="tel"
                placeholder="e.g., 08012345678"
                value={newLovedOneNumber}
                onChange={(e) => setNewLovedOneNumber(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                onKeyPress={(e) => e.key === 'Enter' && addLovedOne(newLovedOneNumber)}
              />
              <button
                onClick={() => addLovedOne(newLovedOneNumber)}
                disabled={addingLovedOne || !newLovedOneNumber.trim()}
                className="flex justify-center items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingLovedOne ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </>
                ) : (
                  <>
                    <FaPlus />
                    Add Number
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter Nigerian WhatsApp number (10 or 11 digits)
            </p>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 flex items-start gap-2">
              <FaInfoCircle className="text-green-600 mt-0.5" />
              <span>
                <strong>How it works:</strong> Add WhatsApp numbers of family/friends. 
                When you start sharing, they'll receive a link to track your live location in real-time!
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Send Tracking Links Button */}
      {isSharing && lovedOnes.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <FaShareAlt className="text-green-600" />
              Send Tracking Links
            </h4>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              {lovedOnes.length} contact{lovedOnes.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            Send live tracking links to all your loved ones. They'll be able to see your real-time movement.
          </p>
          
          <button
            onClick={sendLinksToAll}
            disabled={sendingLinks.length > 0}
            className="w-full py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {sendingLinks.length > 0 ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending Links...
              </>
            ) : (
              <>
                <FaWhatsapp className="text-lg" />
                Send Tracking Links via WhatsApp
              </>
            )}
          </button>
        </div>
      )}

      {/* Loved Ones List - UPDATED */}
      {lovedOnes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FaUserFriends className="text-blue-600" />
            Sharing With ({lovedOnes.length})
          </h3>
          
          <div className="space-y-2">
            {lovedOnes.map((lovedOne) => (
              <div 
                key={lovedOne.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    lovedOne.isAppUser ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {lovedOne.isAppUser ? (
                      <FaUser />
                    ) : (
                      <FaWhatsapp />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{lovedOne.name}</p>
                    <div className="flex items-center gap-1">
                      <FaPhone className="text-xs text-gray-500" />
                      <span className="text-sm text-gray-600">{lovedOne.formattedNumber}</span>
                      {!lovedOne.isAppUser && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">
                          WhatsApp Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isSharing && (
                    <button
                      onClick={() => sendTrackingLink(lovedOne)}
                      disabled={sendingLinks.includes(lovedOne.id)}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      title="Send tracking link"
                    >
                      {sendingLinks.includes(lovedOne.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <FaExternalLinkAlt className="text-sm" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => removeLovedOne(lovedOne.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {isSharing && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <FaMap className="text-green-600" />
                These contacts can track your live location in real-time
              </p>
            </div>
          )}
        </div>
      )}

      {/* How It Works - UPDATED */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
          <FaMap />
          How Real-time Tracking Works
        </h4>
        
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span>Your location updates every few seconds as you move</span>
          </div>
          <div className="flex items-center gap-2">
            <FaWhatsapp className="text-green-500" />
            <span>Loved ones receive a WhatsApp link to track you live</span>
          </div>
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-blue-500" />
            <span>They see your exact location moving on a map in real-time</span>
          </div>
          <div className="flex items-center gap-2">
            <FaExternalLinkAlt className="text-purple-500" />
            <span>No app needed - works directly in their browser</span>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-white rounded border border-blue-300">
          <p className="text-xs text-gray-700">
            <strong>Live tracking:</strong> When you start sharing, loved ones receive a WhatsApp link that opens a live tracking page showing your movement in real-time!
          </p>
        </div>
      </div>

      {/* Safety Note */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <FaShieldAlt className="text-yellow-600" />
          <h4 className="font-bold text-yellow-800">Safety & Privacy</h4>
        </div>
        <p className="text-sm text-yellow-700">
          • Only people you add can see your location<br />
          • You can stop sharing at any time<br />
          • Tracking links expire after 24 hours<br />
          • Location data is encrypted and secure<br />
          • Your location is never shared with unauthorized users
        </p>
      </div>
    </div>
  );
}