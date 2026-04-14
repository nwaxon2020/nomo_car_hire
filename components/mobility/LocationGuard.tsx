"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { FaMapMarkerAlt, FaShieldAlt, FaChevronRight } from "react-icons/fa";

interface LocationGuardProps {
  children: React.ReactNode;
}

export default function LocationGuard({ children }: LocationGuardProps) {
  const router = useRouter();
  const [isLocationActive, setIsLocationActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        // Subscribe to user document
        const userDocRef = doc(db, "users", user.uid);
        const unsubDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setIsLocationActive(data.isLocationActive === true);
          } else {
            setIsLocationActive(false);
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // ✅ Auto-resume tracking if location is active! 
  // Prevents the GPS from freezing when users navigate away from the mobility hub.
  useEffect(() => {
    let watchId: number | null = null;
    let lastCoords: { lat: number; lng: number } | null = null;

    const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    if (isLocationActive && userId) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;

            if (lastCoords) {
              const dist = getDistanceInMeters(lastCoords.lat, lastCoords.lng, lat, lng);
              if (dist < 10) return; // Only update DB if moved > 10m to save writes
            }
            lastCoords = { lat, lng };

            const userRef = doc(db, "users", userId);
            try {
              await updateDoc(userRef, {
                'location.lat': lat,
                'location.lng': lng,
                'location.accuracy': accuracy,
                'location.timestamp': Timestamp.now(),
                locationLastUpdated: Timestamp.now()
              });
            } catch (error) {
              console.error("LocationGuard auto-tracking error:", error);
            }
          },
          (err) => console.warn("LocationGuard GPS error:", err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      }
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLocationActive, userId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLocationActive === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gray-900 p-8 rounded-2xl shadow-2xl text-center border border-white/5"
        >
          <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaMapMarkerAlt className="text-2xl animate-bounce" />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <FaShieldAlt className="text-blue-500 text-xs" />
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Location Required</h2>
          </div>
          
          <p className="text-xs text-gray-400 font-medium mb-8 leading-relaxed uppercase tracking-wider">
            Access to mobility services requires your live location for security, real-time coordination, and safety tracking.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/user/mobility?action=manage')}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
            >
              Turn On Location
              <FaChevronRight size={8} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/user/mobility')}
              className="w-full py-4 bg-white/5 text-gray-500 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              Back to Hub
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
