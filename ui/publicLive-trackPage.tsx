'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaArrowLeft,
  FaPhone,
  FaMapMarkerAlt,
  FaCrown,
  FaCheckCircle,
  FaStar,
  FaChild
} from 'react-icons/fa';

// The High-End Component we built earlier
import TripTracker from '@/components/map/TripTracker';

export default function PublicLiveTrackPage() {
  const params = useParams();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const { userId, token } = params;

    if (!userId || !token) {
      setError('Invalid tracking link');
      setLoading(false);
      return;
    }

    const verifyAndTrack = async () => {
      try {
        // 1. Validate Token Security
        const tokenRef = doc(db, 'trackingTokens', token as string);
        const tokenDoc = await getDoc(tokenRef);

        if (!tokenDoc.exists() || tokenDoc.data().userId !== userId) {
          setError('This tracking link has expired for security reasons.');
          setLoading(false);
          return;
        }

        setIsValidToken(true);

        // 2. Real-time User & Location Sync
        const userRef = doc(db, 'users', userId as string);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);

            // Only update location state if they are actually sharing
            if (data.location?.isSharing) {
              setLocation(data.location);
            } else {
              setLocation(null);
            }
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Tracking Error:", err);
        setError('System error: Unable to establish satellite link.');
        setLoading(false);
      }
    };

    verifyAndTrack();
  }, [params]);

  // Premium Name Formatting
  const displayName = useMemo(() => {
    if (!userData) return 'Chauffeur';
    return userData.firstName
      ? `${userData.firstName} ${userData.lastName || ''}`
      : userData.fullName || 'Nomo Chauffeur';
  }, [userData]);

  if (loading) return (
    <div className="min-h-screen bg-[#060b16] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 tracking-[0.3em]">SECURE LINK ESTABLISHING...</p>
      </div>
    </div>
  );

  if (error || !isValidToken) return (
    <div className="min-h-screen bg-[#060b16] flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-[#0b1222] border border-white/5 rounded-[2.5rem] p-8 text-center">
        <FaExclamationTriangle className="text-rose-500 text-3xl mx-auto mb-4" />
        <h2 className="text-white font-bold text-lg mb-2">Access Revoked</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 bg-white text-black font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Return to Hub
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060b16] text-white selection:bg-emerald-500/30">
      {/* Dynamic Glassmorphism Header */}
      <header className="sticky top-0 z-50 bg-[#060b16]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="hover:text-emerald-500 transition-colors">
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-[11px] font-black tracking-[0.2em] text-slate-500 uppercase">Live Intelligence</h1>
              <p className="text-sm font-bold text-white tracking-tight">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${location ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[9px] font-black tracking-widest text-emerald-500 uppercase">
              {location ? 'Active Relay' : 'Signal Lost'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-8 pb-20 space-y-8">

        {/* THE TRACKER ENGINE */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <TripTracker
            tripId={userData?.currentTripId || "active-session"}
            driverId={params.userId as string}
            customerId="external-viewer"
          />
        </section>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Status Card */}
          <div className="bg-[#0b1222] border border-white/5 p-6 rounded-[2rem] hover:border-emerald-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-black text-xl">
                <FaCrown />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Premium Chauffeur</h3>
                <p className="font-bold text-lg">{displayName}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="mt-1 text-emerald-500" />
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {location?.address || "Calibrating precise location..."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <FaShieldAlt className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Biometric Verified</span>
              </div>
            </div>
          </div>

          {/* Ad/Action Card */}
          <div className="bg-gradient-to-br from-emerald-600/10 to-transparent border border-emerald-500/10 p-6 rounded-[2rem] flex flex-col justify-between group">
            <div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <FaStar key={i} className="text-emerald-500 text-[10px]" />)}
              </div>
              <h3 className="text-xl font-bold mb-2 leading-tight">Need a professional ride like this?</h3>
              <p className="text-xs text-slate-400 font-medium">Experience the Nomo difference with real-time tracking on every trip.</p>
            </div>
            <button
              onClick={() => router.push('/user/car-hire')}
              className="mt-8 w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-2xl group-hover:bg-emerald-500 transition-all"
            >
              Book My Own Chauffeur →
            </button>
          </div>
        </div>

        {/* SECURITY FOOTER */}
        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
          <FaShieldAlt className="text-slate-500" />
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            This tracking link is unique to this session. Your location data is never stored on third-party servers and is wiped after the session expires.
          </p>
        </div>

      </main>
    </div>
  );
}