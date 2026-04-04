"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  limit,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import {
  FaCar,
  FaHandshake,
  FaUsers,
  FaGlobe,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaChevronRight,
  FaClock,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
  FaLock,
  FaWhatsapp,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import CustomerLocationToggle from "@/components/map/CustomerLocationToggle";
import { toast } from "react-hot-toast";

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
      className={`relative overflow-hidden rounded-3xl group h-64 md:h-80 shadow-xl ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
          <h3 className="text-xl md:text-2xl font-black mb-1 truncate">
            {title}
          </h3>
          <p className="text-white/80 text-[10px] uppercase font-medium leading-tight opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 tracking-widest">
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
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user document for location sharing status
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser({ ...firebaseUser, ...data });
            setIsLocationSharing(data.isLocationActive === true);
          } else {
            setUser(firebaseUser);
          }
        });

        // Get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => console.log("Location error:", error)
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

  const quickToggleLocation = async () => {
    setToggleLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);

      if (isLocationSharing) {
        // Turn off location
        await updateDoc(userRef, {
          'location.isSharing': false,
          isLocationActive: false,
          locationLastUpdated: Timestamp.now()
        });
        setIsLocationSharing(false);
        toast.success('Location sharing turned off');
      } else {
        // Turn on location - get current position first
        if (!navigator.geolocation) {
          toast.error('Geolocation not supported on this device');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            try {
              const locationData = {
                lat: latitude,
                lng: longitude,
                accuracy,
                timestamp: Timestamp.now(),
                isSharing: true
              };

              await updateDoc(userRef, {
                location: locationData,
                isLocationActive: true,
                locationLastUpdated: Timestamp.now(),
                locationSharedAt: Timestamp.now()
              });

              setUserLocation({
                lat: latitude,
                lng: longitude
              });
              setIsLocationSharing(true);
              toast.success('📍 Location sharing turned on');
            } catch (error) {
              console.error('Error updating location:', error);
              toast.error('Failed to enable location');
            } finally {
              setToggleLoading(false);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            toast.error('Please enable location permission');
            setToggleLoading(false);
          }
        );
        return;
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      toast.error('Failed to toggle location');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleWhatsAppSOS = () => {
    if (!isLocationSharing) {
      toast.error('⚠️ Please turn on location first to send your location via WhatsApp');
      return;
    }

    if (!userLocation) {
      toast.error('Location data unavailable. Please try again.');
      return;
    }

    // Open WhatsApp with location
    const sosMessage = `🚨 EMERGENCY: I need immediate assistance! Location: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
    const whatsappUrl = `https://wa.me/23412345678?text=${encodeURIComponent(sosMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Top Premium Status Bar */}
      <section className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white shadow-sm">
              <FaShieldAlt className="text-blue-400 text-sm" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-none tracking-tighter">Security Hub</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isLocationSharing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <p className="text-[8px] text-gray-400 uppercase tracking-widest font-black">
                  {isLocationSharing ? 'Protected' : 'At Risk'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={quickToggleLocation}
              disabled={toggleLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isLocationSharing
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                } ${toggleLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {toggleLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : isLocationSharing ? (
                <FaEyeSlash size={10} />
              ) : (
                <FaEye size={10} />
              )}
              {isLocationSharing ? 'Turn Off Location' : 'Turn On Location'}
            </button>
            <button
              onClick={toggleSafetyPanel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
            >
              Manage
              {isSafetyExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSafetyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-950 border-b border-white/5 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                  {/* Location Section */}
                  <div className="p-5 bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-indigo-600/10 rounded-2xl border border-blue-400/30 shadow-lg">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/40">
                        <FaMapMarkerAlt size={18} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base text-white font-black uppercase tracking-wider">Live Location Tracking</h3>
                        <p className="text-[11px] text-blue-200 font-medium leading-relaxed mt-0.5">Real-time location verification enables transport scheduling, ensures driver safety, and unlocks all premium mobility features.</p>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="scale-[0.9] origin-top-left">
                        {user && <CustomerLocationToggle userId={user.uid} />}
                      </div>
                    </div>
                    {isLocationSharing ? (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Location Active</span>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Location Disabled</span>
                      </div>
                    )}
                  </div>

                  {/* Emergency Section */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                          <FaExclamationTriangle size={16} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm text-white font-black uppercase tracking-wider">Emergency SOS Contact</h3>
                          <p className="text-[10px] text-gray-400 font-medium leading-tight mb-3">Instant connection to Nomo Security Dispatch. Use only in high-risk situations.</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href="tel:+23412345678"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              <FaPhoneAlt size={10} />
                              Call Now
                            </a>
                            <button
                              onClick={handleWhatsAppSOS}
                              disabled={!isLocationSharing}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isLocationSharing
                                  ? 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 hover:text-green-300 cursor-pointer'
                                  : 'bg-green-600/10 border border-green-500/20 text-green-400/40 cursor-not-allowed opacity-50'
                                }`}
                            >
                              <FaWhatsapp size={10} />
                              WhatsApp
                            </button>
                          </div>
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

      <main className="max-w-7xl mx-auto px-4 pt-8">
        {/* Header Title */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
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
              title="Bookings"
              description="Nomo Hailing. Get a professional driver at your doorstep instantly."
              icon={<FaCar className="w-5 h-5" />}
              image="/cab.png"
              route="/user/car-hire"
              gradient="from-blue-600/90 to-indigo-800/90"
              delay={0.1}
              isLocked={!isLocationSharing}
            />
            <ServiceCard
              title="Car Hire"
              description="Ride Negotiation. Post your trip and let verified drivers bid for your business."
              icon={<FaHandshake className="w-5 h-5" />}
              image="/keke.jpeg"
              route="/user/car-hire"
              gradient="from-emerald-600/90 to-teal-800/90"
              delay={0.2}
              isLocked={!isLocationSharing}
            />
            <ServiceCard
              title="Load Booking"
              description="Shared Transit. Join other passengers going your way and split the fare."
              icon={<FaUsers className="w-5 h-5" />}
              image="/home_bg.jpg"
              route="/user/load-booking"
              gradient="from-amber-500/90 to-orange-700/90"
              delay={0.3}
              isLocked={!isLocationSharing}
            />
            <ServiceCard
              title="Transport Hub"
              description="Nigerian Price Scraper. Real-time prices for major road transport companies."
              icon={<FaGlobe className="w-5 h-5" />}
              image="/about.jpg"
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
                    className="p-6 bg-white rounded-xl shadow-lg shadow-gray-200/40 border border-gray-100 flex flex-col justify-between hover:border-blue-200 transition-all group cursor-pointer h-40"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FaCar size={12} />
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${trip.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {trip.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-gray-900 truncate">
                        {trip.driverName}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-bold truncate tracking-tight">{trip.vehicleName}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] font-black text-gray-500 truncate flex items-center gap-1.5">
                      <FaMapMarkerAlt size={10} className="text-blue-500" />
                      {trip.destination}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="md:col-span-3 py-10 bg-white rounded-xl shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-4">
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
