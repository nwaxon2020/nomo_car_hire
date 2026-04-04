"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebaseConfig";
import {
  collection, query, where, getDocs, doc, limit, orderBy, onSnapshot, setDoc, updateDoc, Timestamp
} from "firebase/firestore";
import {
  FaCar, FaHandshake, FaUsers, FaGlobe, FaShieldAlt, FaPhoneAlt, FaChevronRight, FaClock, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaLock, FaWhatsapp, FaMapMarkerAlt,
} from "react-icons/fa";
import CustomerLocationToggle from "@/components/map/CustomerLocationToggle";

// --- TYPES ---
interface TripHistory {
  id: string;
  driverName: string;
  vehicleName: string;
  status: string;
  timestamp: any;
  destination: string;
}

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  route: string;
  gradient: string;
  delay: number;
  isLocked: boolean;
}

const ServiceCard = ({ title, description, icon, image, route, gradient, delay, isLocked }: ServiceCardProps) => {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={!isLocked ? { y: -8, scale: 1.02 } : {}}
      onClick={() => !isLocked && router.push(route)}
      className={`relative overflow-hidden rounded-xl group h-64 md:h-72 shadow-lg ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title}
          fill
          className={`object-cover transition-transform duration-700 ${!isLocked && 'group-hover:scale-110'} ${isLocked && 'grayscale blur-[2px]'}`}
        />
        <div className={`absolute inset-0 opacity-80 bg-gradient-to-br ${gradient}`} />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-6 md:p-6 flex flex-col justify-between z-10 text-white">
        <div className="flex justify-between items-start">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
            {icon}
          </div>
          {!isLocked && (
            <motion.div
              whileHover={{ x: 5 }}
              className="p-1.5 bg-white/10 backdrop-blur-md rounded-full"
            >
              <FaChevronRight size={10} />
            </motion.div>
          )}
          {isLocked && <FaLock className="text-white/40 size-3" />}
        </div>

        <div>
          <h3 className="text-lg md:text-xl font-black mb-1 truncate">
            {title}
          </h3>
          <p className="text-white/80 text-[9px] uppercase font-bold leading-tight opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 tracking-widest">
            {description}
          </p>
        </div>
      </div>

      {/* Glassy Border Effect */}
      <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
    </motion.div>
  );
};

export default function MobilityView() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [recentTrips, setRecentTrips] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeEmergencyContact, setActiveEmergencyContact] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user document for location sharing status
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubDoc = onSnapshot(userDocRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser({ ...firebaseUser, ...data });
            setIsLocationSharing(data.isLocationActive === true);
            if (data.location?.lat && data.location?.lng) {
              setUserLocation({ lat: data.location.lat, lng: data.location.lng });
            }

            // Load active emergency contact from the data we just got
            const emergencyContacts = data.emergencyContact || [];
            let activeContact = null;

            if (emergencyContacts.length > 0) {
              // First priority: Find explicitly marked active contact
              activeContact = emergencyContacts.find((contact: any) => contact.isActive);

              // Fallback: Get the most recently added contact
              if (!activeContact) {
                const sortedByDate = emergencyContacts.sort(
                  (a: any, b: any) => (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0)
                );
                activeContact = sortedByDate[0];
              }
            }

            setActiveEmergencyContact(activeContact);
          } else {
            setUser(firebaseUser);
            setActiveEmergencyContact(null);
          }
        });

        // Get user's current location
        // Get user's current location once for SOS if not sharing yet
        if (navigator.geolocation && !isLocationSharing) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setUserLocation({ lat: latitude, lng: longitude });
            },
            (error) => console.log("Location error:", error),
            { enableHighAccuracy: true }
          );
        }

        fetchRecentActivity(firebaseUser.uid);
        return () => unsubDoc();
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const fetchRecentActivity = async (uid: string) => {
    try {
      const tripsRef = collection(db, "trips");
      const q = query(
        tripsRef,
        where("customerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(3)
      );

      const querySnapshot = await getDocs(q);
      const trips: TripHistory[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          driverName: data.driverName || "Nomo Driver",
          vehicleName: data.vehicleName || "Vehicle",
          status: data.status,
          destination: data.destination || "Various Locations",
          timestamp: data.createdAt
        };
      });

      setRecentTrips(trips);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSafetyPanel = () => {
    setIsSafetyExpanded(!isSafetyExpanded);
  };

  const handleWhatsAppSOS = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!activeEmergencyContact || !isLocationSharing || !user) return;

    try {
      // 1. Generate unique tracking token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const trackingLink = `${window.location.origin}/track/${user.uid}/${token}`;

      // 2. Store token in Firestore (valid for 24 hours)
      const tokenRef = doc(db, 'trackingTokens', token);
      await setDoc(tokenRef, {
        userId: user.uid,
        whatsappNumber: activeEmergencyContact.phoneNumber,
        lovedOneId: activeEmergencyContact.id || 'emergency-' + Date.now(),
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        isValid: true
      });

      // 3. Create WhatsApp message
      const userName = user.displayName || user.email?.split('@')[0] || 'A user';
      const addressText = userLocation ? ` My current location is: ${user.location?.address || 'Detecting...'}` : '';
      const message = `🚨 *EMERGENCY SOS ALERT* 🚨\n\n` +
        `*${userName}* is in an emergency and is sharing their live location with you!\n\n` +
        `📍 *Click to track live:* ${trackingLink}\n\n` +
        `📍 *Last Address:* ${user.location?.address || 'Available on map'}\n` +
        `⏰ Tracking link is valid for 24 hours\n\n` +
        `_Sent via Nomopoventures Safety System_`;

      const formattedNumber = activeEmergencyContact.phoneNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

      // 4. Open WhatsApp
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sending SOS WhatsApp:', error);
    }
  };

  const handleEmergencyContactClick = () => {
    if (!activeEmergencyContact) {
      // Open the panel if no contact exists
      setIsSafetyExpanded(true);
    } else if (activeEmergencyContact) {
      // Call directly if contact exists
      window.location.href = `tel:${activeEmergencyContact.phoneNumber.startsWith('+') ? activeEmergencyContact.phoneNumber : '+' + activeEmergencyContact.phoneNumber}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Top Premium Status Bar */}
      <section className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white shadow-sm">
              <FaShieldAlt className="text-blue-400 text-sm" />
            </div>
            <div className="flex-1">
              <h1 className="text-sm font-black text-gray-900 leading-none tracking-tighter">Security Hub</h1>
              <div className="relative flex justify-start items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLocationSharing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <p className="text-[8px] text-gray-400 uppercase tracking-widest font-black">
                  Emergency Contact Dialer
                </p>

                {/* Emergency Quick Buttons - Absolutely positioned */}
                <div className="absolute left-0 md:left-26 top-14 md:top-0 flex items-center gap-1.5" style={{ transform: 'translateX(5.5rem) translateY(-50%)' }}>
                  {/* Emergency Call Button */}
                  <button
                    onClick={handleEmergencyContactClick}
                    className={`p-3 rounded-md transition-all border flex items-center justify-center ${activeEmergencyContact
                      ? 'bg-blue-500 md:bg-blue-500/20 text-white md:text-blue-600 border-blue-500/30 hover:bg-blue-500/30'
                      : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 cursor-pointer'
                      }`}
                    title={activeEmergencyContact ? `Call ${activeEmergencyContact.displayPhoneNumber}` : 'Add Emergency Contact'}
                  >
                    <FaPhoneAlt size={10} />
                  </button>

                  {/* Emergency WhatsApp Button */}
                  <button
                    onClick={handleWhatsAppSOS}
                    disabled={!isLocationSharing || !activeEmergencyContact}
                    className={`p-3 rounded-md transition-all border flex items-center justify-center ${isLocationSharing && activeEmergencyContact
                      ? 'bg-green-500 md:bg-green-500/20 text-white md:text-green-600 border-green-500/30 hover:bg-green-500/30'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                      }`}
                    title={
                      !activeEmergencyContact
                        ? 'Add Emergency Contact first'
                        : !isLocationSharing
                          ? 'Turn on location sharing to send tracking link'
                          : `WhatsApp SOS to ${activeEmergencyContact?.displayPhoneNumber || 'contact'}`
                    }
                  >
                    <FaWhatsapp size={10} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={toggleSafetyPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm group"
          >
            Manage
            {isSafetyExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
          </button>
        </div>

        <AnimatePresence>
          {isSafetyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-950 border-b border-white/5 overflow-hidden"
            >
              <div className="max-w-4xl mx-auto md:px-4 px-3 md:py-8 py-14">
                <div className="grid grid-cols-1 gap-6">
                  {/* Location Section */}
                  <div className="p-3 bg-gray-900/50 rounded-xl border border-blue-500/20 shadow-xl">
                    <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
                      {user && <CustomerLocationToggle userId={user.uid} />}
                    </div>
                  </div>

                  {/* Emergency Section */}
                  <div className="p-3 md:p-5 bg-gray-900/50 rounded-md md:rounded-xl border border-red-500/20 shadow-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-600/20 text-red-500 rounded-lg flex items-center justify-center shrink-0 border border-red-500/20">
                        <FaExclamationTriangle size={16} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[11px] text-white font-black uppercase tracking-wider mb-1">Emergency SOS Dispatch</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mb-4">Direct link to 24/7 security response units</p>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Call Button */}
                            <a
                              href={activeEmergencyContact ? `tel:${activeEmergencyContact.phoneNumber.startsWith('+') ? activeEmergencyContact.phoneNumber : '+' + activeEmergencyContact.phoneNumber}` : "#"}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${activeEmergencyContact ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100/50 border-gray-200 grayscale opacity-50 cursor-not-allowed'}`}
                              onClick={(e) => !activeEmergencyContact && e.preventDefault()}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${activeEmergencyContact ? 'bg-green-500/20 text-green-500 border-green-500/20' : 'bg-gray-200 text-gray-400 border-gray-200'}`}>
                                  <FaPhoneAlt size={12} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase">Emergency Call</span>
                                  <span className={`text-[11px] font-black tracking-wider ${activeEmergencyContact ? 'text-green-500' : 'text-gray-400'}`}>{activeEmergencyContact?.displayPhoneNumber || 'Add Contact'}</span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white">Call</span>
                            </a>

                            {/* WhatsApp Button */}
                            <a
                              href={activeEmergencyContact && isLocationSharing ? `https://wa.me/${activeEmergencyContact.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`🚨 EMERGENCY ALERT: I need security assistance immediately!\n\n📍 My Live Location: https://maps.google.com/?q=${user?.location?.lat || userLocation?.lat},${user?.location?.lng || userLocation?.lng}`)}` : "#"}
                              target={(activeEmergencyContact && isLocationSharing) ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all group relative ${activeEmergencyContact && isLocationSharing
                                ? 'bg-green-600/10 hover:bg-green-600/20 border-green-500/30'
                                : 'bg-gray-100/50 border-gray-200 grayscale blur-[2px] cursor-not-allowed opacity-50'
                                }`}
                              onClick={(e) => (!activeEmergencyContact || !isLocationSharing) && e.preventDefault()}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${activeEmergencyContact && isLocationSharing ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-gray-200 text-gray-400 border-gray-200'}`}>
                                  <FaWhatsapp size={14} />
                                </div>
                                <span className={`text-[11px] font-black tracking-wider ${activeEmergencyContact && isLocationSharing ? 'text-green-400' : 'text-gray-400'}`}>WhatsApp SOS</span>
                              </div>
                              <FaChevronRight size={10} className={`transition-transform ${activeEmergencyContact && isLocationSharing ? 'text-gray-500 group-hover:translate-x-1' : 'text-gray-300'}`} />

                              {!isLocationSharing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                                  <span className="bg-gray-900/80 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.05em] backdrop-blur-sm">
                                    Enable Location
                                  </span>
                                </div>
                              )}
                              {!activeEmergencyContact && (
                                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10">
                                  <span className="bg-gray-900/80 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.05em] backdrop-blur-sm">
                                    Add Contact
                                  </span>
                                </div>
                              )}
                            </a>
                          </div>

                          {!activeEmergencyContact && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                              <p className="text-[9px] font-black text-yellow-500 uppercase tracking-wider">
                                ⚠️ No Emergency Contact Selected
                              </p>
                              <p className="text-[8px] font-bold text-gray-400 mt-1">Add a contact in the Security Control section above</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <main className="max-w-7xl mx-auto px-4 pt-14 md:pt-8">
        {/* Header Title */}
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
            Nomo <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tighter">Transport Hub</span>
          </h2>
          <p className="mt-1 text-xs text-gray-400 font-medium uppercase tracking-widest">Premium Mobility Services</p>
        </div>

        {/* 4 Premium Cards Grid */}
        <div className="relative">
          {/* Location Guard Overlay */}
          <AnimatePresence>
            {!isLocationSharing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 -inset-y-2 z-30 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 border-2 border-dashed border-gray-200"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="max-w-xs w-full bg-gray-900 p-6 rounded-xl shadow-xl text-center border border-white/5"
                >
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaMapMarkerAlt className="text-xl animate-bounce" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-1">Turn On Location</h3>
                  <p className="text-[10px] text-gray-500 font-medium mb-6 uppercase tracking-wider">Enable location access to unlock all mobility services and stay protected.</p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setIsSafetyExpanded(true)}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      Verify Now
                      <FaChevronRight size={8} />
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="w-full py-3 bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-all"
                    >
                      EXIT
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 transition-all duration-500 ${!isLocationSharing ? 'opacity-10 scale-[0.99] grayscale blur-[2px]' : ''}`}>
            <ServiceCard
              title="Load Booking"
              description="Shared Transit. Join other passengers going your way and split the fare."
              icon={<FaUsers className="w-5 h-5" />}
              image="/cab.png"
              route="/user/load-booking"
              gradient="from-amber-500/90 to-orange-700/90"
              delay={0.3}
              isLocked={!isLocationSharing}
            />

            <ServiceCard
              title="Bookings"
              description="Nomo Hailing. Get a professional driver at your doorstep instantly."
              icon={<FaCar className="w-5 h-5" />}
              image="/driverShareProfile.jpeg"
              route="/user/car-hire"
              gradient="from-blue-600/90 to-indigo-800/90"
              delay={0.1}
              isLocked={!isLocationSharing}
            />
            <ServiceCard
              title="Car Hire"
              description="Ride Negotiation. Post your trip and let verified drivers bid for your business."
              icon={<FaHandshake className="w-5 h-5" />}
              image="/carHire.webp"
              route="/user/car-hire"
              gradient="from-emerald-600/90 to-teal-800/90"
              delay={0.2}
              isLocked={!isLocationSharing}
            />

            <ServiceCard
              title="Transport Hub"
              description="Nigerian Price Scraper. Real-time prices for major road transport companies."
              icon={<FaGlobe className="w-5 h-5" />}
              image="/park.png"
              route="/user/transport-hub"
              gradient="from-slate-700/90 to-gray-900/90"
              delay={0.4}
              isLocked={!isLocationSharing}
            />
          </div>
        </div>

        {/* Recent Activity Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-6 h-6 bg-blue-600/10 text-blue-600 rounded flex items-center justify-center shrink-0">
                <FaClock size={12} />
              </div>
              Latest Status
            </h3>
            {user && (
              <button
                onClick={() => router.push(`/user/profile/${user.uid}`)}
                className="text-[10px] font-black text-blue-600 hover:tracking-widest transition-all uppercase"
              >
                Full Log
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatePresence mode="wait">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                ))
              ) : recentTrips.length > 0 ? (
                recentTrips.map((trip, index) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-white rounded-xl shadow-md shadow-gray-200/40 border border-gray-100 flex flex-col justify-between hover:border-blue-200 transition-all group cursor-pointer h-32"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FaCar size={10} />
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${trip.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {trip.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-gray-900 truncate">
                        {trip.driverName}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-bold truncate tracking-tight">{trip.vehicleName}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-50 text-[10px] font-black text-gray-500 truncate flex items-center gap-1">
                      <FaMapMarkerAlt size={8} className="text-blue-500" />
                      {trip.destination}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="min-h-[300px] md:col-span-3 py-10 bg-white rounded-xl shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-4">
                  <h4 className="text-xs font-black text-gray-900 uppercase">No active logs</h4>
                  <button
                    onClick={() => {
                      if (!isLocationSharing) setIsSafetyExpanded(true);
                      else router.push('/user/car-hire');
                    }}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95"
                  >
                    Start Trip
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>


      </main>
    </div>
  );
}
