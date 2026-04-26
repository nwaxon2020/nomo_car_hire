"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebaseConfig";
import {
  doc, onSnapshot, updateDoc, serverTimestamp,
  collection, query, where, getDocs, getDoc, Timestamp,
} from "firebase/firestore";
import {
  FaTruck, FaCar, FaShieldAlt, FaUsers, FaTools, FaClock,
} from "react-icons/fa";
import { logFeatureUsage } from "@/lib/analytics";

import SafetyNoteCard from "@/components/loadBooking/SafetyNoteCard";
import DriverSetupPanel from "@/components/loadBooking/DriverSetupPanel";
import DriverActiveSession from "@/components/loadBooking/DriverActiveSession";
import CustomerSearchPanel from "@/components/loadBooking/CustomerSearchPanel";
import TrustScoreCountdown from "@/components/loadBooking/TrustScoreCountdown";
import {
  LoadBooking, TrustInfo, DEFAULT_TRUST,
  getFirstOfCurrentMonth, getTodayString, getTomorrowString,
} from "@/components/loadBooking/types";
function isMaintenanceTime(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  const hour = now.getHours();
  // Sunday (0) and 0:00 to 17:59 (6pm is 18:00)
  return day === 0 && hour < 18;
}
/* ─────────────────────────── TRUST HELPERS ─────────────────────────── */

function isTrustResetNeeded(trustLastReset: any): boolean {
  if (!trustLastReset) return true;
  const resetDate = trustLastReset.toDate ? trustLastReset.toDate() : new Date(trustLastReset);
  return resetDate < getFirstOfCurrentMonth();
}

function isBlockedToday(trustInfo: TrustInfo): boolean {
  const today = getTodayString();
  // Exhausted today AND no once-chance given yet
  if (trustInfo.trustScore === 0 && trustInfo.trustExhaustedAt === today) {
    return !trustInfo.loadOnceAllowed;
  }
  // Used the once-chance today and cancelled → blocked until tomorrow
  if (
    trustInfo.loadBlockedUntil &&
    trustInfo.loadBlockedUntil === today
  ) {
    return true;
  }
  return false;
}

/* ─────────────────────────── TRUST BADGE ─────────────────────────── */

function TrustBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500"
      : score >= 60
        ? "bg-yellow-500"
        : score >= 40
          ? "bg-orange-500"
          : score >= 20
            ? "bg-red-500"
            : "bg-red-800";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${color} text-white text-[10px] font-black shadow-lg`}>
      <FaShieldAlt size={8} />
      Trust: {score}%
    </div>
  );
}

/* ─────────────────────────── BLOCKED SCREEN ─────────────────────────── */

function BlockedScreen({ trustScore, unblockDate }: { trustScore: number; unblockDate: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex items-center justify-center p-6"
    >
      <div className="max-w-sm w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/30">
          <FaShieldAlt className="text-red-400" size={32} />
        </div>
        <h2 className="text-white font-black text-xl uppercase tracking-tight mb-2">
          Booking Restricted
        </h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4 leading-relaxed">
          Your trust score has reached {trustScore}%. You cannot book load rides today.
        </p>
        <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-3 mb-4">
          <p className="text-red-400 text-[10px] font-black uppercase tracking-wider">
            Access restores: {unblockDate === getTomorrowString() ? "Tomorrow" : unblockDate}
          </p>
        </div>
        <p className="text-gray-700 text-[9px] font-bold uppercase tracking-widest">
          Trust score resets to 100% on the 1st of every month.
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── MAINTENANCE SCREEN ─────────────────────────── */

function MaintenanceScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full bg-gray-900 border border-purple-500/30 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[100px] rounded-full" />

        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-900/40 border border-white/10 rotate-3">
          <FaTools className="text-white animate-pulse" size={36} />
        </div>

        <h2 className="text-white font-black text-2xl uppercase tracking-tighter mb-3 leading-tight">
          System Maintenance
        </h2>

        <div className="space-y-4 relative z-10">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Our load booking servers are currently undergoing weekly optimization.
          </p>

          <div className="bg-gray-800/50 border border-white/5 rounded-2xl p-5 flex items-center justify-center gap-3">
            <FaClock className="text-purple-400" size={16} />
            <p className="text-white font-black text-sm uppercase tracking-tight">
              Re-opening by 6:00 PM Today
            </p>
          </div>

          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            Thank you for your patience as we work to improve your transport experience.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
          />
        </div>
      </div>
    </motion.div>
  );
}

const ActiveBookingBanner = ({ type, targetPath }: { type: string, targetPath: string }) => (
    <div className="max-w-md mx-auto mt-10 p-8 bg-gray-900 border border-purple-500/20 rounded-[2.5rem] shadow-2xl text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/20 shadow-inner">
            <FaCar className="text-purple-500 text-3xl" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Active Booking Found</h2>
        <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed px-4">
            You currently have an active {type} booking request. Please complete or cancel it before booking a shared seat.
        </p>
        <button
            onClick={() => window.location.href = targetPath}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
        >
            <FaCar size={14} />
            Return to Active Booking
        </button>
    </div>
);

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */

export default function LoadBookingUi() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDriver, setIsDriver] = useState(false);
  const [viewMode, setViewMode] = useState<"driver" | "customer">("customer");
  const [isMaintenance, setIsMaintenance] = useState(false);

  // NEW: Active Regular Booking Check
  const [hasActiveRegularBooking, setHasActiveRegularBooking] = useState(false);

  useEffect(() => {
    setIsMaintenance(isMaintenanceTime());
    logFeatureUsage("load-booking");
  }, []);

  // Driver states
  const [driverVehicles, setDriverVehicles] = useState<any[]>([]);
  const [activeBooking, setActiveBooking] = useState<LoadBooking | null>(null);
  const [lockedVehicleId, setLockedVehicleId] = useState<string | undefined>(undefined);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // Trust system
  const [trustInfo, setTrustInfo] = useState<TrustInfo>(DEFAULT_TRUST);
  const [showTrustCountdown, setShowTrustCountdown] = useState(false);
  const [trustCountdownPrev, setTrustCountdownPrev] = useState(100);
  const [trustCountdownNew, setTrustCountdownNew] = useState(80);
  const [cancelCount, setCancelCount] = useState(0); // local session cancel count for UI

  // Auth & data setup
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) return;
      setUser(firebaseUser);

      const userRef = doc(db, "users", firebaseUser.uid);
      const unsubDoc = onSnapshot(userRef, async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setUserData(data);
        setIsDriver(data.isDriver === true);
        if (data.isDriver === true) {
          // If there's a search query, force 'customer' view even for drivers
          if (search) {
            setViewMode("customer");
          } else {
            setViewMode(prev => prev === "customer" && !userData ? "driver" : prev);
          }
        }

        /* ── Monthly trust reset ── */
        const trust: TrustInfo = {
          trustScore: data.trustScore ?? 100,
          trustCancels: data.trustCancels ?? 0,
          trustLastReset: data.trustLastReset,
          trustExhaustedAt: data.trustExhaustedAt,
          loadOnceAllowed: data.loadOnceAllowed,
          loadOnceUsedDate: data.loadOnceUsedDate,
          loadBlockedUntil: data.loadBlockedUntil,
        };

        if (isTrustResetNeeded(trust.trustLastReset)) {
          // Reset trust in Firestore
          await updateDoc(userRef, {
            trustScore: 100,
            trustCancels: 0,
            trustLastReset: serverTimestamp(),
            trustExhaustedAt: null,
            loadOnceAllowed: false,
            loadOnceUsedDate: null,
            loadBlockedUntil: null,
          });
          setTrustInfo({ ...DEFAULT_TRUST });
        } else {
          setTrustInfo(trust);
        }

        /* ── Driver vehicle day-lock ── */
        const today = getTodayString();
        if (data.isDriver && data.bookingVehicleDate === today && data.bookingVehicleId) {
          setLockedVehicleId(data.bookingVehicleId);
        } else {
          setLockedVehicleId(undefined);
        }
        setLoading(false);
      });

      // NEW: Regular Booking Listener
      const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);
      const qReg = query(
        collection(db, "directOffers"),
        where("customerId", "==", firebaseUser.uid),
        where("status", "in", ["pending", "accepted"]),
        where("createdAt", ">=", Timestamp.fromDate(recentThreshold))
      );
      const unsubReg = onSnapshot(qReg, (regSnap) => {
        setHasActiveRegularBooking(!regSnap.empty);
      });

      return () => {
        unsubDoc();
        unsubReg();
      };
    });

    return () => unsub();
  }, []);

  /* ── Load driver vehicles ── */
  useEffect(() => {
    if (!user || !isDriver) return;
    setVehiclesLoading(true);

    const vehiclesRef = collection(db, "vehicleLog");
    const q = query(vehiclesRef, where("driverId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDriverVehicles(vehicles.filter((v: any) => v.isApproved));
      setVehiclesLoading(false);
    });

    return () => unsub();
  }, [user, isDriver]);

  /* ── Check if driver has an active load booking today ── */
  useEffect(() => {
    if (!user || !isDriver) return;

    const today = getTodayString();
    const q = query(
      collection(db, "loadBookings"),
      where("driverId", "==", user.uid),
      where("status", "in", ["active", "departed"]),
      where("date", "==", today)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveBooking({ id: snap.docs[0].id, ...snap.docs[0].data() } as LoadBooking);
      } else {
        setActiveBooking(null);
      }
    });

    return () => unsub();
  }, [user, isDriver]);

  /* ── Handle driver cancel (trust deduction already done inside DriverActiveSession) ── */
  const handleDriverCancelOccurred = useCallback(async () => {
    if (!user) return;
    // Re-read the user document to refresh trust info in the UI
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;
    const data = snap.data();
    // Update trust badge in the header
    setTrustInfo(prev => ({
      ...prev,
      trustScore: data.driverTrustScore ?? prev.trustScore,
    }));
  }, [user]);

  /* ── Handle customer cancel (trust deduction) ── */
  const handleCancelOccurred = useCallback(async () => {
    if (!user || isDriver) return;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentScore = data.trustScore ?? 100;
    const currentCancels = data.trustCancels ?? 0;
    const newCancels = currentCancels + 1;
    const today = getTodayString();

    // Every 3rd cancel → deduct 20%
    if (newCancels % 3 === 0) {
      const newScore = Math.max(0, currentScore - 20);
      const prev = currentScore;

      const updates: any = {
        trustScore: newScore,
        trustCancels: newCancels,
      };

      if (newScore === 0) {
        updates.trustExhaustedAt = today;
        updates.loadOnceAllowed = true; // Give them one more chance
      }

      await updateDoc(userRef, updates);

      // Show countdown animation
      setTrustCountdownPrev(prev);
      setTrustCountdownNew(newScore);
      setShowTrustCountdown(true);
    } else {
      await updateDoc(userRef, { trustCancels: newCancels });
    }

    // Handle "once-allowed" scenario
    if (data.loadOnceAllowed && !data.loadOnceUsedDate) {
      // They just cancelled their one-chance booking → block until tomorrow
      await updateDoc(userRef, {
        loadBlockedUntil: getTomorrowString(),
        loadOnceUsedDate: today,
      });
    }
  }, [user, isDriver]);

  /* ── Maintenance Mode ── */
  if (isMaintenance) {
    return <MaintenanceScreen />;
  }

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Loading…</p>
        </div>
      </div>
    );
  }

  const today = getTodayString();
  const tomorrow = getTomorrowString();

  /* ── Customer blocked ── */
  if (!isDriver && isBlockedToday(trustInfo)) {
    const unblockDate = trustInfo.loadBlockedUntil || tomorrow;
    return <BlockedScreen trustScore={trustInfo.trustScore} unblockDate={unblockDate} />;
  }

  const driverInfo = {
    driverId: user.uid,
    driverName: `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || user.displayName || "Driver",
    driverFirstName: userData?.firstName || user.displayName?.split(" ")[0] || "Driver",
    driverPhone: userData?.phoneNumber || "",
    driverImage: userData?.profileImage || user.photoURL || "",
    driverCity: userData?.city || "",
    driverState: userData?.state || "",
    driverLocation: userData?.location,
    vipLevel: userData?.vipLevel || 0,
    isVerified: userData?.isVerified || userData?.isDriverApproved || false,
    driverTrustScore: userData?.driverTrustScore ?? 100,
    whatsappPreferred: userData?.whatsappPreferred || false,
  };

  const customerInfo = {
    uid: user.uid,
    displayName: userData?.fullName || user.displayName || "Customer",
    photoURL: userData?.profileImage || user.photoURL || "",
    trustScore: trustInfo.trustScore,
    city: userData?.city,
    state: userData?.state,
    location: userData?.location,
  };

  return (
    <>
      {/* Trust Countdown Overlay */}
      <AnimatePresence>
        {showTrustCountdown && (
          <TrustScoreCountdown
            previousScore={trustCountdownPrev}
            newScore={trustCountdownNew}
            onComplete={() => setShowTrustCountdown(false)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#0B0B12] pb-20">
        {/* ── Page Header ── */}
        <div className="bg-gradient-to-b from-gray-900 to-[#0B0B12] border-b border-white/5 px-4 pt-6 pb-4 sticky top-0 z-30">
          <div className="flex flex-col w-full md:flex-row items-center justify-start gap-2 md:justify-between">
            <div className="w-full md:w-auto flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/30">
                {isDriver ? <FaTruck className="text-white" size={16} /> : <FaUsers className="text-white" size={16} />}
              </div>
              <div>
                <h1 className="text-white font-black text-base uppercase tracking-tight leading-none">
                  Load Booking
                </h1>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  {isDriver ? "Shared Transport Management" : "Find a Shared Ride"}
                </p>
              </div>
            </div>

            <div className="flex justify-start w-full md:w-auto items-center gap-2">
              {/* Role badge */}
              <span
                className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isDriver
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  }`}
              >
                {isDriver ? "Driver" : "Passenger"}
              </span>

              {/* Trust badge for both roles */}
              <TrustBadge score={trustInfo.trustScore} />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-3 pt-5 space-y-5">
          {/* Safety Note */}
          <SafetyNoteCard role={viewMode} />

          {/* DRIVER / CUSTOMER TOGGLE */}
          {isDriver && (
            <div className="flex bg-gray-900 border border-white/10 rounded-xl p-1 mb-4 max-w-sm">
              <button
                onClick={() => setViewMode("driver")}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "driver" ? "bg-amber-500 text-black shadow-md" : "text-gray-400 hover:text-white"
                  }`}
              >
                Create Trip
              </button>
              <button
                onClick={() => setViewMode("customer")}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "customer" ? "bg-purple-500 text-white shadow-md" : "text-gray-400 hover:text-white"
                  }`}
              >
                Book a Seat
              </button>
            </div>
          )}

          {/* ── DRIVER VIEW ── */}
          {viewMode === "driver" && (
            <div>
              {activeBooking ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                    <h2 className="text-white font-black text-sm uppercase tracking-tight">Active Session</h2>
                  </div>
                  <DriverActiveSession
                    booking={activeBooking}
                    driverId={user.uid}
                    driverName={driverInfo.driverName}
                    trustScore={trustInfo.trustScore}
                    onEndSession={() => setActiveBooking(null)}
                    onCancelOccurred={handleDriverCancelOccurred}
                  />
                </div>
              ) : vehiclesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                    <h2 className="text-white font-black text-sm uppercase tracking-tight">Set Up Your Trip</h2>
                  </div>
                  {/* Block driver if their trust is at 0 and they're blocked today */}
                  {userData?.driverLoadBlockedUntil && userData.driverLoadBlockedUntil >= getTodayString() ? (
                    <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center">
                      <div className="w-14 h-14 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                        <FaShieldAlt className="text-red-400" size={24} />
                      </div>
                      <h3 className="text-white font-black text-base uppercase mb-2">Trip Setup Blocked</h3>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                        You cancelled a trip with booked passengers and your driver trust hit 0%.
                      </p>
                      <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-3">
                        <p className="text-red-400 text-[10px] font-black uppercase tracking-wider">
                          Access restores: {userData.driverLoadBlockedUntil === getTomorrowString() ? "Tomorrow" : userData.driverLoadBlockedUntil}
                        </p>
                      </div>
                      <p className="text-gray-700 text-[9px] font-bold uppercase tracking-widest mt-3">
                        Driver trust score resets to 100% on the 1st of every month.
                      </p>
                    </div>
                  ) : (
                    <DriverSetupPanel
                      {...driverInfo}
                      vehicles={driverVehicles}
                      lockedVehicleId={lockedVehicleId}
                      onSessionCreated={(id) => {
                        // The onSnapshot listener will pick this up automatically
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── CUSTOMER VIEW ── */}
          {viewMode === "customer" && (
            <div>
              {hasActiveRegularBooking ? (
                <ActiveBookingBanner type="Private" targetPath="/user/mobility/bookings" />
              ) : (
                <>
                  {/* Once-allowed notice */}
                  {trustInfo.trustScore === 0 && trustInfo.loadOnceAllowed && !trustInfo.loadOnceUsedDate && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4 flex items-start gap-2.5"
                    >
                      <FaShieldAlt className="text-orange-400 shrink-0 mt-0.5" size={13} />
                      <div>
                        <p className="text-orange-400 font-black text-[10px] uppercase tracking-widest">
                          Final Booking Chance
                        </p>
                        <p className="text-gray-400 text-[9px] font-medium mt-0.5">
                          Your trust is at 0%. You have ONE more booking today. If you cancel, you'll be blocked until tomorrow.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 bg-purple-400 rounded-full" />
                    <h2 className="text-white font-black text-sm uppercase tracking-tight">Available Rides</h2>
                  </div>

                  <Suspense fallback={<div className="h-40 bg-gray-800/40 animate-pulse rounded-xl" />}>
                    <CustomerSearchPanel
                      currentUser={customerInfo}
                      onCancelOccurred={handleCancelOccurred}
                    />
                  </Suspense>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
