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
  FaMapMarkerAlt, FaUserFriends, FaShareAlt, FaEye, FaEyeSlash, FaPlus, FaTimes, FaUser, FaMap, FaCheckCircle, FaShieldAlt, FaWhatsapp, FaPhone, FaInfoCircle, FaExternalLinkAlt, FaChevronDown, FaChevronUp, FaLock
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import GPSPermissionModal from './GPSPermissionModal';
import { getGeohash } from '@/lib/geofire';

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
  isActive?: boolean;
}

export default function CustomerLocationToggle({ userId, tripId }: CustomerLocationToggleProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [newLovedOneNumber, setNewLovedOneNumber] = useState('');
  const [addingLovedOne, setAddingLovedOne] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const isStartingRef = useRef(false);
  const [sendingLinks, setSendingLinks] = useState<string[]>([]);
  const [showTracking, setShowTracking] = useState(false);
  const batteryToastShownRef = useRef(false);

  // GPS Permission Modal State
  const [gpsModalOpen, setGpsModalOpen] = useState(false);
  const [gpsErrorType, setGpsErrorType] = useState<"denied" | "unavailable" | "timeout" | "unknown" | "notSupported">("unknown");

  // Optimized tracking refs
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<any>(null);
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants for throttling
  const MIN_DISTANCE_METERS = 10;
  const MIN_UPDATE_INTERVAL_MS = 5000; // 5 seconds minimum for customers
  const ADDRESS_UPDATE_DISTANCE = 50; // Update address only if moved >50m

  // Network and device state
  const [isOnline, setIsOnline] = useState(true);
  const [batterySavingMode, setBatterySavingMode] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Network, Battery, and Visibility monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Battery monitoring for customers
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryStatus = () => {
          const isLow = battery.level < 0.15 && !battery.charging;
          setBatterySavingMode(battery.level < 0.2 && !battery.charging);
          
          if (isLow && isSharing && !batteryToastShownRef.current) {
            toast.error('Battery low - reducing location updates', { id: 'battery-low' });
            batteryToastShownRef.current = true;
          } else if (!isLow || battery.charging) {
            batteryToastShownRef.current = false;
          }
        };
        updateBatteryStatus();
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
      });
    }

    // Visibility monitoring - pause when app is in background
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSharing]);

  // Batch update processing
  useEffect(() => {
    if (!isSharing || !userId) return;

    const userRef = doc(db, 'users', userId);
    batchIntervalRef.current = setInterval(async () => {
      if (pendingUpdateRef.current) {
        try {
          await updateDoc(userRef, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } catch (error) {
          console.error('Failed to flush batch update:', error);
        }
      }
    }, 5000);

    return () => {
      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current);
        batchIntervalRef.current = null;
      }
    };
  }, [isSharing, userId]);

  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | undefined;

    const loadUserData = () => {
      try {
        const userRef = doc(db, 'users', userId);
        
        unsubscribe = onSnapshot(userRef, async (docSnap) => {
          if (!docSnap.exists()) return;

          const data = docSnap.data();
          const locationData = data.location || data.currentLocation || {};
          const isCurrentlySharing = locationData.isSharing || data.isLocationActive || false;

          setIsSharing(isCurrentlySharing);

          if (isCurrentlySharing && locationData.lat) {
            setCurrentLocation(locationData);
            lastCoordsRef.current = { lat: locationData.lat, lng: locationData.lng };

            if (locationData.timestamp) {
              setLastUpdate(locationData.timestamp.toDate());
            }
            
            // Auto resume tracking if it was left ON and not already watching/starting
            if (!watchIdRef.current && !isStartingRef.current) {
              startLocationSharing(false); // Pass false to suppress toast
            }
          } else {
            setCurrentLocation(null);
          }

          // Load loved ones (both app users and WhatsApp contacts)
          await loadLovedOnesDetails(data.lovedOnes || [], data.whatsappLovedOnes || [], data.emergencyContact || []);
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadLovedOnesDetails = async (appUserIds: string[], whatsappContactIds: string[], emergencycontacts?: any[]) => {
      const lovedOnesData: LovedOne[] = [];
      const emergencyContactMap: { [key: string]: any } = {};

      if (emergencycontacts && Array.isArray(emergencycontacts)) {
        emergencycontacts.forEach((ec: any) => {
          emergencyContactMap[ec.id] = ec;
        });
      }

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
              isAppUser: true,
              isActive: emergencyContactMap[lovedOneId]?.isActive || false
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
              isAppUser: false,
              isActive: emergencyContactMap[contactId]?.isActive || false
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
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (batchIntervalRef.current) clearInterval(batchIntervalRef.current);
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

      const token = generateToken();
      const trackingLink = `${window.location.origin}/track/${userId}/${token}`;

      const tokenRef = doc(db, 'trackingTokens', token);
      await setDoc(tokenRef, {
        userId,
        whatsappNumber: lovedOne.whatsappNumber,
        lovedOneId: lovedOne.id,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        isValid: true
      });

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

      window.open(whatsappUrl, '_blank');
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

  const startLocationSharing = async (showToast = true) => {
    if (watchIdRef.current || isStartingRef.current) return;
    isStartingRef.current = true;
    setLoading(true);
    if (!navigator.geolocation) {
      setGpsErrorType("notSupported");
      setGpsModalOpen(true);
      isStartingRef.current = false;
      setLoading(false);
      return;
    }

    if (!isOnline) {
      toast.error("No internet connection. Please check your network.");
      isStartingRef.current = false;
      setLoading(false);
      return;
    }



    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const address = await reverseGeocode(latitude, longitude);

        try {
          const userRef = doc(db, 'users', userId);

          const locationData = {
            lat: latitude,
            lng: longitude,
            geohash: getGeohash(latitude, longitude),
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
          lastUpdateTimeRef.current = Date.now();

          if (showToast) {
            toast.success('📍 Live location sharing started!');
          }

          // Optimized watchPosition with time + distance throttling
          const id = navigator.geolocation.watchPosition(
            async (pos) => {
              const { latitude: lat, longitude: lng, accuracy } = pos.coords;
              const now = Date.now();

              // Calculate dynamic interval based on battery saving mode
              let effectiveInterval = MIN_UPDATE_INTERVAL_MS;
              if (batterySavingMode) {
                effectiveInterval = MIN_UPDATE_INTERVAL_MS * 2; // 10 seconds in battery save mode
              }
              if (!isVisible) {
                effectiveInterval = MIN_UPDATE_INTERVAL_MS * 3; // 15 seconds in background
              }

              // Time throttle check
              const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
              if (timeSinceLastUpdate < effectiveInterval) {
                return;
              }

              // Distance check for customers
              let distanceMoved = 0;
              if (lastCoordsRef.current) {
                distanceMoved = getDistanceInMeters(
                  lastCoordsRef.current.lat,
                  lastCoordsRef.current.lng,
                  lat,
                  lng
                );
                if (distanceMoved < MIN_DISTANCE_METERS) {
                  return;
                }
              }

              // Update tracking state
              lastUpdateTimeRef.current = now;
              lastCoordsRef.current = { lat, lng };

              // Only reverse geocode if moved significantly
              let newAddress = currentLocation?.address || '';
              if (!currentLocation || distanceMoved > ADDRESS_UPDATE_DISTANCE) {
                newAddress = await reverseGeocode(lat, lng);
              }

              // Queue update for batching
              pendingUpdateRef.current = {
                'location.lat': lat,
                'location.lng': lng,
                'location.geohash': getGeohash(lat, lng),
                'location.accuracy': accuracy,
                'location.address': newAddress,
                'location.timestamp': Timestamp.now(),
                locationLastUpdated: Timestamp.now()
              };

              // Update UI immediately
              setCurrentLocation((prev: any) => prev ? {
                ...prev,
                lat,
                lng,
                address: newAddress,
                timestamp: Timestamp.now()
              } : null);
            },
            (error) => {
              console.error('Location watch error:', error);

              if (error.code === error.PERMISSION_DENIED) {
                setGpsErrorType("denied");
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                setGpsErrorType("unavailable");
              } else if (error.code === error.TIMEOUT) {
                setGpsErrorType("timeout");
              } else {
                setGpsErrorType("unknown");
              }

              setGpsModalOpen(true);
            },
            {
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 0
            }
          );

          setWatchId(id);
          watchIdRef.current = id;
        } catch (error) {
          console.error('Error starting sharing:', error);
          if (showToast) toast.error('Failed to start location sharing');
        } finally {
          setLoading(false);
          isStartingRef.current = false;
        }
      },
      (error) => {
        console.error('Geolocation error:', error);

        if (error.code === error.PERMISSION_DENIED) {
          setGpsErrorType("denied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsErrorType("unavailable");
        } else if (error.code === error.TIMEOUT) {
          setGpsErrorType("timeout");
        } else {
          setGpsErrorType("unknown");
        }

        setGpsModalOpen(true);
        setLoading(false);
        isStartingRef.current = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      }
    );
  };

  const stopLocationSharing = async () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      setWatchId(null);
      watchIdRef.current = null;
    }

    // Clear batch interval
    if (batchIntervalRef.current) {
      clearInterval(batchIntervalRef.current);
      batchIntervalRef.current = null;
    }

    // Flush any pending update
    if (pendingUpdateRef.current && userId) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      } catch (error) {
        console.error('Failed to flush final update:', error);
      }
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
      lastUpdateTimeRef.current = 0;
      toast.success('Location sharing stopped');
    } catch (error) {
      console.error('Error stopping sharing:', error);
      toast.error('Failed to stop location sharing');
    }
  };

  const addLovedOne = async (whatsappNumber: string) => {
    const cleanedNumber = whatsappNumber.replace(/\D/g, '');
    if (cleanedNumber.length < 10 || cleanedNumber.length > 15) {
      toast.error('Please enter a valid phone number (10-15 digits)');
      return;
    }

    setAddingLovedOne(true);

    try {
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
        lovedOneId = `whatsapp_${formattedNumber}`;
        const contactRef = doc(db, 'whatsappContacts', lovedOneId);

        await setDoc(contactRef, {
          whatsappNumber: formattedNumber,
          displayNumber: formatPhoneForDisplay(whatsappNumber),
          createdAt: Timestamp.now(),
          isWhatsAppOnly: true,
          addedBy: userId
        });
      }

      if (lovedOnes.some(lo => lo.id === lovedOneId)) {
        toast.success('Contact already added');
        return;
      }

      const userRef = doc(db, 'users', userId);
      const displayName = isAppUser ? (lovedOneData.name || formatPhoneForDisplay(whatsappNumber)) : formatPhoneForDisplay(whatsappNumber);

      const emergencyContactObj = {
        phoneNumber: formattedNumber,
        displayPhoneNumber: formatPhoneForDisplay(whatsappNumber),
        name: displayName,
        id: lovedOneId,
        isAppUser,
        isActive: lovedOnes.length === 0, // Make active if first contact
        addedAt: Timestamp.now()
      };

      if (isAppUser) {
        await updateDoc(userRef, {
          lovedOnes: arrayUnion(lovedOneId),
          emergencyContact: arrayUnion(emergencyContactObj)
        });
      } else {
        await updateDoc(userRef, {
          whatsappLovedOnes: arrayUnion(lovedOneId),
          emergencyContact: arrayUnion(emergencyContactObj)
        });
      }

      setLovedOnes(prev => [...prev, {
        id: lovedOneId,
        whatsappNumber: formattedNumber,
        name: displayName,
        formattedNumber: formatPhoneForDisplay(whatsappNumber),
        isAppUser,
        isActive: lovedOnes.length === 0
      }]);

      setNewLovedOneNumber('');
      toast.success(`${formatPhoneForDisplay(whatsappNumber)} added to emergency contacts`);

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

      const userData = userDoc.data();

      const wasActive = (userData.emergencyContact || []).some(
        (contact: any) => contact.id === lovedOneId && contact.isActive
      );

      let updatedEmergencyContacts = (userData.emergencyContact || []).filter(
        (contact: any) => contact.id !== lovedOneId
      );

      if (wasActive && updatedEmergencyContacts.length > 0) {
        updatedEmergencyContacts = updatedEmergencyContacts.sort(
          (a: any, b: any) => (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0)
        );
        updatedEmergencyContacts[0].isActive = true;
        toast.success(`Auto-selected ${updatedEmergencyContacts[0].name} as emergency contact`);
      }

      if (lovedOneId.startsWith('whatsapp_')) {
        const updated = (userData.whatsappLovedOnes || []).filter((id: string) => id !== lovedOneId);
        await updateDoc(userRef, {
          whatsappLovedOnes: updated,
          emergencyContact: updatedEmergencyContacts
        });
      } else {
        const updated = (userData.lovedOnes || []).filter((id: string) => id !== lovedOneId);
        await updateDoc(userRef, {
          lovedOnes: updated,
          emergencyContact: updatedEmergencyContacts
        });
      }

      setLovedOnes(prev => {
        const filtered = prev.filter(lo => lo.id !== lovedOneId);
        return filtered.map(lo => ({
          ...lo,
          isActive: updatedEmergencyContacts.some((ec: any) => ec.id === lo.id && ec.isActive)
        }));
      });

      toast.success('Contact removed');
    } catch (error) {
      console.error('Error removing loved one:', error);
      toast.error('Failed to remove contact');
    }
  };

  const setActiveContact = async (activeContactId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return;

      const userData = userDoc.data();

      const updatedEmergencyContacts = (userData.emergencyContact || []).map((contact: any) => ({
        ...contact,
        isActive: contact.id === activeContactId
      }));

      await updateDoc(userRef, {
        emergencyContact: updatedEmergencyContacts
      });

      setLovedOnes(prev => prev.map(lo => ({
        ...lo,
        isActive: lo.id === activeContactId
      })));

      toast.success('Emergency contact updated');
    } catch (error) {
      console.error('Error setting active contact:', error);
      toast.error('Failed to update emergency contact');
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Primary: Google Maps Geocoding API
    if (apiKey) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          // Find the most specific result (prefer street_address)
          const bestResult = data.results.find((r: any) => r.types.includes('street_address')) || data.results[0];
          return bestResult.formatted_address;
        }
      } catch (err) {
        console.warn('Google Geocoding failed, trying fallback:', err);
      }
    }

    // Fallback: BigDataCloud (free, no key needed)
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      const area = data.locality || data.city || '';
      const subArea = data.principalSubdivision || '';
      return `${area}${area && subArea ? ', ' : ''}${subArea}`.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (err) {
      // Last resort: OpenStreetMap (Nominatim)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } catch (e) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
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

  if (loading) {
    return (
      <div className="p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-xs text-gray-500 font-medium uppercase tracking-wider">Syncing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header Status */}
      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isSharing ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-200 text-gray-500'}`}>
            <FaShieldAlt size={12} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Security Hub</h3>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">Real-time Safety Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && isSharing && (
            <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
              Offline
            </span>
          )}
          {batterySavingMode && isSharing && (
            <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
              Power Save
            </span>
          )}
          <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${isSharing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
            <div className={`w-1 h-1 rounded-full ${isSharing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isSharing ? 'Live' : 'Off'}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Main Simple Button */}
        <button
          onClick={isSharing ? stopLocationSharing : () => startLocationSharing(true)}
          disabled={loading}
          className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 ${isSharing
            ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-900/20 active:scale-[0.98]'
            }`}
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isSharing ? (
            <>
              <FaEyeSlash size={9} />
              Turn Off Location
            </>
          ) : (
            <>
              <FaEye size={9} />
              Turn On Location
            </>
          )}
        </button>

        {/* Current Address Snippet */}
        {isSharing && currentLocation && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 bg-blue-50/50 rounded-lg border border-blue-100"
          >
            <p className="text-[8px] text-blue-800 font-black uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <FaMapMarkerAlt size={7} /> Current Broadcast
            </p>
            <p className="text-[9px] text-gray-600 font-medium leading-tight line-clamp-1">
              {currentLocation.address || 'Broadcasting coordinates...'}
            </p>
            <p className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5 opacity-60">
              {currentLocation.lat?.toFixed(4)}, {currentLocation.lng?.toFixed(4)}
            </p>
          </motion.div>
        )}

        {/* Emergency Contacts Management */}
        <div className="pt-1">
          <div className="flex gap-1.5 mb-2">
            <input
              type="tel"
              placeholder="080..."
              value={newLovedOneNumber}
              onChange={(e) => setNewLovedOneNumber(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs placeholder:text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
            <button
              onClick={() => addLovedOne(newLovedOneNumber)}
              disabled={addingLovedOne || !newLovedOneNumber}
              className="px-3 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
            >
              {addingLovedOne ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add'}
            </button>
          </div>

          {lovedOnes.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {lovedOnes.map((lovedOne) => (
                <div key={lovedOne.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${lovedOne.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} group`}>
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-100 text-blue-600">
                      <FaUser size={8} />
                    </div>
                    <div className="leading-none flex-1 min-w-0">
                      <p className="text-[9px] font-black text-gray-800 tracking-tight">{lovedOne.name}</p>
                      <p className="text-[7px] text-gray-400 font-bold uppercase">{lovedOne.formattedNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => setActiveContact(lovedOne.id)}
                      className={`px-2 py-1 rounded transition-all text-[8px] font-black uppercase tracking-widest ${lovedOne.isActive ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'}`}
                      title={lovedOne.isActive ? 'Active Emergency Contact' : 'Set as Emergency Contact'}
                    >
                      {lovedOne.isActive ? '✓ Active' : 'Select'}
                    </button>
                    {isSharing && (
                      <button
                        onClick={() => sendTrackingLink(lovedOne)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors hidden md:block"
                        title="Send Link"
                      >
                        <FaShareAlt size={8} />
                      </button>
                    )}
                    <button
                      onClick={() => removeLovedOne(lovedOne.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors hidden md:block"
                    >
                      <FaTimes size={8} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Tips */}
        <div className="pt-2 border-t border-gray-50">
          <button
            onClick={() => setShowTracking(!showTracking)}
            className="w-full py-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-blue-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FaShieldAlt className="text-amber-500" size={8} />
              Location Safety Tips
            </span>
            {showTracking ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
          </button>

          <AnimatePresence>
            {showTracking && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="py-2 space-y-2">
                  {[
                    { icon: <FaMapMarkerAlt size={10} />, text: "Updates your broadcast every 30 seconds" },
                    { icon: <FaWhatsapp size={10} />, text: "Automated tracking links for loved ones" },
                    { icon: <FaLock size={10} />, text: "Self-destructing links (valid for 24 hours)" },
                    { icon: <FaUserFriends size={10} />, text: "Only your selected group can track you" }
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-3.5 h-3.5 bg-gray-100 text-gray-400 rounded flex items-center justify-center shrink-0 mt-0.5">
                        {tip.icon}
                      </div>
                      <p className="text-xs text-gray-500 font-bold leading-tight">{tip.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <GPSPermissionModal
        isOpen={gpsModalOpen}
        onDismiss={() => setGpsModalOpen(false)}
        onRetry={startLocationSharing}
        errorType={gpsErrorType}
      />
    </div>
  );
}