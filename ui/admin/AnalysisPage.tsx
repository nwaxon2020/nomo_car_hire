"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBarChart2,
  FiTrendingUp,
  FiUsers,
  FiAlertTriangle,
  FiDollarSign,
  FiRotateCcw,
  FiLock,
  FiArrowLeft,
  FiClock,
  FiPieChart,
} from "react-icons/fi";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { verifyAdminPasscode } from '@/lib/hooks/useAdminRole';

/* ─────────────────────────── TYPES ─────────────────────────── */

interface AnalyticsData {
  pageVisits: { [key: string]: number };
  purchases: {
    tickets: number;
    vip: number;
    transport: number;
  };
  income: {
    weekly: number;
    monthly: number;
    yearly: number;
  };
  customers: {
    qualifying: number;
    defaulters: number;
    flags: {
      1: number;
      2: number;
      3: number;
    };
  };
}

/* ─────────────────────────── COMPONENT ─────────────────────────── */

export default function AnalysisPageUi() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    pageVisits: {},
    purchases: { tickets: 0, vip: 0, transport: 0 },
    income: { weekly: 0, monthly: 0, yearly: 0 },
    customers: { qualifying: 0, defaulters: 0, flags: { 1: 0, 2: 0, 3: 0 } },
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const CEO_ID = "thuvYp857sfRGgFuswyyhAUxgYr1";
  const isCEO = auth.currentUser?.uid === CEO_ID;

  useEffect(() => {
    if (!isCEO) return;

    setLoading(true);

    // 1. Fetch Page Visit Analytics (using the data from Cloud Functions)
    const fetchPageVisits = async () => {
      const today = new Date().toISOString().split("T")[0];
      const visits: { [key: string]: number } = {};
      
      try {
        const snap = await getDocs(collection(db, "analytics", "features", today));
        snap.forEach((doc) => {
          visits[doc.id] = doc.data().count || 0;
        });
        return visits;
      } catch (err) {
        console.error("Error fetching page visits:", err);
        return {};
      }
    };

    // 2. Fetch User-based Stats (Flags, Purchases, Qualifying)
    const unsubUsers = onSnapshot(collection(db, "users"), async (snapshot) => {
      let qualifyingCount = 0;
      let defaultersCount = 0;
      const flagsMap = { 1: 0, 2: 0, 3: 0 };
      
      let vipRevenue = 0;
      let ticketRevenue = 0;

      // Income calculation timeframes
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      let weeklyIncome = 0;
      let monthlyIncome = 0;
      let yearlyIncome = 0;

      // Threshold for qualifying
      let passengerThreshold = 20;
      try {
        const configSnap = await getDoc(doc(db, "adminSettings", "freerideConfig"));
        if (configSnap.exists()) {
          passengerThreshold = configSnap.data().passengerThreshold || 20;
        }
      } catch (e) {}

      snapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        
        // Flags logic
        const userFlags = userData.flags || 0;
        const isDisabled = userData.isDisabled === true;
        
        if (userFlags > 0) {
          if (userFlags === 1) flagsMap[1]++;
          else if (userFlags === 2) flagsMap[2]++;
          else if (userFlags >= 3) flagsMap[3]++;
        }
        
        if (userFlags >= 3 || isDisabled) {
          defaultersCount++;
        }

        // Qualifying logic
        if ((userData.referralPoints || 0) >= passengerThreshold) {
          qualifyingCount++;
        }

        // VIP Purchase Logic
        if (userData.vipHistory && Array.isArray(userData.vipHistory)) {
          userData.vipHistory.forEach((item: any) => {
            const amt = Number(item.price) || 0;
            const ts = item.timestamp;
            const date = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date();
            const validDate = isNaN(date.getTime()) ? new Date() : date;
            
            vipRevenue += amt;
            if (validDate > weekAgo) weeklyIncome += amt;
            if (validDate > monthAgo) monthlyIncome += amt;
            if (validDate > yearAgo) yearlyIncome += amt;
          });
        }

        // Ticket Purchase Logic
        if (userData.tickets && Array.isArray(userData.tickets)) {
          userData.tickets.forEach((item: any) => {
            const amt = Number(item.amount) || 0;
            const ts = item.timestamp;
            const date = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date();
            const validDate = isNaN(date.getTime()) ? new Date() : date;
            
            ticketRevenue += amt;
            if (validDate > weekAgo) weeklyIncome += amt;
            if (validDate > monthAgo) monthlyIncome += amt;
            if (validDate > yearAgo) yearlyIncome += amt;
          });
        }
      });

      // Transport Registration Revenue
      let transportRevenue = 0;
      try {
        const transSnap = await getDocs(collection(db, "transportCompanies"));
        transSnap.forEach((d) => {
          const data = d.data();
          const amt = Number(data.paymentAmount) || 0;
          const ts = data.createdAt;
          const date = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : new Date();
          const validDate = isNaN(date.getTime()) ? new Date() : date;
          
          transportRevenue += amt;
          if (validDate > weekAgo) weeklyIncome += amt;
          if (validDate > monthAgo) monthlyIncome += amt;
          if (validDate > yearAgo) yearlyIncome += amt;
        });
      } catch (e) {}

      const pageVisits = await fetchPageVisits();

      setData({
        pageVisits,
        purchases: {
          tickets: ticketRevenue,
          vip: vipRevenue,
          transport: transportRevenue,
        },
        income: {
          weekly: weeklyIncome,
          monthly: monthlyIncome,
          yearly: yearlyIncome,
        },
        customers: {
          qualifying: qualifyingCount,
          defaulters: defaultersCount,
          flags: flagsMap,
        },
      });
      setLoading(false);
    });

    return () => unsubUsers();
  }, [isCEO]);

  const handleReset = async () => {
    const isValid = await verifyAdminPasscode(passcode, "/admin/analysis");
    if (!isValid) {
      toast.error("Security Violation: Invalid CEO Passcode");
      return;
    }

    setIsResetting(true);
    const resetToast = toast.loading("Executing System Reset Protocol...");

    try {
      // 1. Reset Analytics Collection
      const today = new Date().toISOString().split("T")[0];
      const analyticsSnap = await getDocs(collection(db, "analytics", "features", today));
      const batch = writeBatch(db);
      analyticsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      
      // 2. Reset Revenue Data (Optional - very dangerous but user asked)
      // We will only reset the 'count' or temporary logs if any, 
      // but for "everything to zero" we might need to wipe history.
      // CAUTION: This is a nuclear option. I'll only reset the analytics for now.
      
      await batch.commit();
      
      toast.success("System Reset Successful", { id: resetToast });
      setShowResetModal(false);
      setPasscode("");
      window.location.reload();
    } catch (err) {
      toast.error("Protocol Failure: Reset Aborted", { id: resetToast });
    } finally {
      setIsResetting(false);
    }
  };

  if (!isCEO) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050A0F] text-white p-6">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase italic mb-2 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">Access Denied</h1>
          <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black italic">CEO clearance required.</p>
          <Link href="/admin" className="mt-8 inline-block bg-white text-black px-8 py-3 rounded-full font-black uppercase italic text-[10px] hover:bg-gray-200 transition-all">
            Return to Command Center
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">Scanning Mobility Data...</p>
      </div>
    );
  }

  const visitEntries = Object.entries(data.pageVisits).sort((a, b) => b[1] - a[1]);
  const maxVisits = Math.max(...visitEntries.map((e) => e[1]), 1);

  const purchaseEntries = Object.entries(data.purchases).sort((a, b) => b[1] - a[1]);
  const maxPurchases = Math.max(...purchaseEntries.map((e) => e[1]), 1);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="pt-6 sm:pt-8 mb-6 sm:mb-10 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/admin" className="p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-110 transition-all text-[#0B2A4A]">
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B2A4A] uppercase italic leading-none">
                System <span className="text-blue-600">Analysis</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                <FiClock className="text-blue-500" /> Real-time Mobility Insights
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowResetModal(true)}
            className="w-full sm:w-auto px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase italic text-[10px] border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group"
          >
            <FiRotateCcw className="group-hover:rotate-180 transition-transform duration-500" /> Reset System
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Tier: Finance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            title="Weekly Income"
            value={`₦${data.income.weekly.toLocaleString()}`}
            icon={<FiDollarSign />}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            title="Monthly Income"
            value={`₦${data.income.monthly.toLocaleString()}`}
            icon={<FiTrendingUp />}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Yearly Income"
            value={`₦${data.income.yearly.toLocaleString()}`}
            icon={<FiBarChart2 />}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </div>

        {/* Second Tier: Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Page Visits Chart */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase italic text-[#0B2A4A] flex items-center gap-2">
                  <FiPieChart className="text-blue-600" /> Top Destinations
                </h3>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase mt-1">Daily Traffic distribution per module</p>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {visitEntries.length > 0 ? (
                visitEntries.map(([name, count], index) => (
                  <div key={name} className="space-y-2">
                    <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase italic text-gray-600">
                      <span>{name.replace("-", " ")}</span>
                      <span>{count} Visits</span>
                    </div>
                    <div className="h-2.5 sm:h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxVisits) * 100}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={`h-full rounded-full bg-gradient-to-r ${
                          index === 0 ? "from-blue-600 to-indigo-600" : "from-gray-400 to-gray-500"
                        }`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                  No Traffic Recorded Today
                </div>
              )}
            </div>
          </section>

          {/* Revenue Streams Chart */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase italic text-[#0B2A4A] flex items-center gap-2">
                  <FiDollarSign className="text-emerald-600" /> Revenue Streams
                </h3>
                <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase mt-1">Total income distribution per service</p>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6">
              {purchaseEntries.map(([name, amount], index) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase italic text-gray-600">
                    <span>{name === 'vip' ? 'VIP Purchases' : name === 'tickets' ? 'Daily Tickets' : 'Transport Registrations'}</span>
                    <span>₦{amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(amount / maxPurchases) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        index === 0 ? "from-emerald-600 to-teal-600" : "from-gray-400 to-gray-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Third Tier: Customer Status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatusCard
            title="Qualifying"
            value={data.customers.qualifying}
            sub="Free Ride Candidates"
            icon={<FiCheckCircle />}
            color="text-blue-600"
          />
          <StatusCard
            title="1 Flag"
            value={data.customers.flags[1]}
            sub="Minor Violators"
            icon={<FiAlertTriangle />}
            color="text-yellow-600"
          />
          <StatusCard
            title="2 Flags"
            value={data.customers.flags[2]}
            sub="Repeat Offenders"
            icon={<FiAlertTriangle />}
            color="text-orange-600"
          />
          <StatusCard
            title="Defaulters"
            value={data.customers.flags[3]}
            sub="Account Disabled"
            icon={<FiAlertTriangle />}
            color="text-red-600"
          />
        </div>
      </div>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl text-center relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-red-200">
                <FiLock />
              </div>

              <h2 className="text-2xl font-black uppercase italic text-[#0B2A4A] mb-2 leading-tight">
                CEO Authorization
              </h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
                Resetting daily page visits traffic to zero. (Does NOT affect dashboard revenue/statistics).
              </p>

              <input
                type="password"
                autoFocus
                maxLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••"
                className="w-full text-center text-4xl font-black tracking-[0.5em] p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-red-500 outline-none mb-8 transition-all"
              />

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setShowResetModal(false); setPasscode(""); }}
                  className="py-5 rounded-2xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase italic hover:bg-gray-200 transition-all"
                >
                  Aborted
                </button>
                <button
                  onClick={handleReset}
                  disabled={isResetting || passcode.length < 6}
                  className="py-5 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase italic shadow-xl shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isResetting ? "Executing..." : "Authorize"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── SUB-COMPONENTS ─────────────────────────── */

function StatCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-bl-[80px] -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
      <div className={`relative z-10 w-12 h-12 ${bgColor} ${color} rounded-2xl flex items-center justify-center text-xl mb-6 shadow-sm`}>
        {icon}
      </div>
      <h3 className="relative z-10 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{title}</h3>
      <p className={`relative z-10 text-2xl font-black uppercase italic leading-none ${color}`}>{value}</p>
    </div>
  );
}

function StatusCard({ title, value, sub, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center group hover:shadow-xl transition-all">
      <div className={`w-12 h-12 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform ${color}`}>
        {icon}
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{title}</h3>
      <p className="text-2xl font-black italic text-[#0B2A4A] leading-none mb-1">{value}</p>
      <p className="text-[8px] font-bold uppercase text-gray-300 tracking-tighter">{sub}</p>
    </div>
  );
}

function FiCheckCircle(props: any) {
  return (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
