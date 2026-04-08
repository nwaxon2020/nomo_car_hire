"use client";
import { useState, useEffect } from "react";
import {
  collection, query, onSnapshot, orderBy, doc, updateDoc, getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import {
  FaFlag, FaTimes, FaWhatsapp, FaPhone, FaEnvelope, FaUser,
  FaExclamationTriangle, FaChevronDown, FaIdCard, FaCar, FaInfoCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Complaint {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  reason?: string;
  targetType?: "driver" | "customer";
  targetId?: string;
  targetName?: string;
  targetEmail?: string;
  targetPhone?: string;
  targetUid?: string;
  reporterName?: string;
  reporterUid?: string;
  reportedBy?: string; // 'customer' | 'driver'
  createdAt?: any;
  status?: string;
  quickMessage?: string;
}

const PRESET_REASONS = [
  "Customer Complaint", "Reckless Driving", "Vehicle Condition Issues",
  "Late Pickup/Dropoff", "Unprofessional Behavior", "Security Policy Breach",
  "Harassment", "Fraud Attempt"
];

function ComplaintCard({ complaint, onFlagDriver }: { complaint: Complaint; onFlagDriver: (driverId: string, flags: number, reason: string) => void }) {
  const isDriverComplaint = complaint.targetType === "driver" || complaint.reportedBy === "customer";
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [pendingFlags, setPendingFlags] = useState(0);
  const [driverData, setDriverData] = useState<any>(null);

  // Fetch driver data if it's a driver complaint to get current flag count
  useEffect(() => {
    const targetId = complaint.targetId || complaint.targetUid;
    if (isDriverComplaint && targetId) {
      getDoc(doc(db, "users", targetId)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setDriverData(d);
          setPendingFlags(d.flags || 0);
        }
      });
    }
  }, [complaint.targetId, complaint.targetUid, isDriverComplaint]);

  const formatDate = (ts: any) => {
    if (!ts) return "Recently";
    try {
      if (ts.toDate) return ts.toDate().toLocaleDateString("en-GB");
      return new Date(ts).toLocaleDateString("en-GB");
    } catch { return "Recently"; }
  };

  const displayName = complaint.targetName || complaint.name || "Unknown";
  const displayPhone = complaint.targetPhone || complaint.phone || "";
  const displayEmail = complaint.targetEmail || complaint.email || "";
  const displayUid = complaint.targetUid || complaint.targetId || "";
  const reporterName = complaint.reporterName || complaint.name || "Anonymous";

  const formatWhatsApp = (phone: string) => {
    if (!phone) return "";
    let p = phone.replace(/\D/g, "");
    if (p.startsWith("0") && p.length === 11) p = "+234" + p.substring(1);
    else if (p.length === 10) p = "+234" + p;
    else if (!p.startsWith("+")) p = "+" + p;
    return p;
  };

  const cardBg = isDriverComplaint
    ? "from-red-50 to-rose-50 border-red-200"
    : "from-purple-50 to-violet-50 border-purple-200";
  const headerBg = isDriverComplaint
    ? "from-red-600 to-rose-700"
    : "from-purple-600 to-violet-700";
  const badgeColor = isDriverComplaint ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700";
  const accentColor = isDriverComplaint ? "text-red-600" : "text-purple-600";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${cardBg} border-2 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all`}
    >
      {/* Card Header */}
      <div className={`bg-gradient-to-r ${headerBg} p-4`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              {isDriverComplaint ? <FaCar className="text-white" /> : <FaUser className="text-white" />}
            </div>
            <div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isDriverComplaint ? "bg-red-800/40 text-red-100" : "bg-purple-800/40 text-purple-100"} mb-1 inline-block`}>
                {isDriverComplaint ? "Driver Flagged" : "Customer Flagged"}
              </span>
              <h3 className="text-white font-black text-sm leading-tight">{displayName}</h3>
            </div>
          </div>
          <span className="text-white/60 text-[9px] font-bold">{formatDate(complaint.createdAt)}</span>
        </div>
      </div>

      {/* Target Details */}
      <div className="p-4 space-y-3">
        {/* UID */}
        {displayUid && (
          <div className="flex items-start gap-2">
            <FaIdCard className={`${accentColor} mt-0.5 flex-shrink-0`} size={12} />
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">UID</p>
              <p className="text-[10px] font-mono text-gray-700 break-all">{displayUid}</p>
            </div>
          </div>
        )}

        {/* Phone */}
        {displayPhone && (
          <div className="flex items-center gap-2">
            <FaPhone className={`${accentColor} flex-shrink-0`} size={12} />
            <div className="flex-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
              <div className="flex items-center gap-2">
                <a href={`tel:${displayPhone}`} className={`text-sm font-bold ${accentColor} hover:underline`}>
                  {displayPhone}
                </a>
                {displayPhone && (
                  <a
                    href={`https://wa.me/${formatWhatsApp(displayPhone)}`}
                    target="_blank"
                    className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                  >
                    <FaWhatsapp className="text-white text-xs" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        {displayEmail && (
          <div className="flex items-center gap-2">
            <FaEnvelope className={`${accentColor} flex-shrink-0`} size={12} />
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</p>
              <a href={`mailto:${displayEmail}`} className={`text-sm font-bold ${accentColor} hover:underline break-all`}>
                {displayEmail}
              </a>
            </div>
          </div>
        )}

        {/* Reported By */}
        <div className="flex items-start gap-2 pt-1 border-t border-gray-200">
          <FaUser className="text-gray-400 flex-shrink-0 mt-0.5" size={11} />
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reported by</p>
            <p className="text-[11px] font-bold text-gray-700">{reporterName}</p>
          </div>
        </div>

        {/* Message / Reason */}
        <div className={`p-3 rounded-xl ${isDriverComplaint ? "bg-red-50 border border-red-100" : "bg-purple-50 border border-purple-100"}`}>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Complaint</p>
          <p className="text-xs text-gray-700 font-medium italic">
            "{complaint.reason || complaint.quickMessage || complaint.message || "No reason provided"}"
          </p>
        </div>

        {/* Current flag count (drivers only) */}
        {isDriverComplaint && driverData && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <FaFlag
                  key={n}
                  size={14}
                  onClick={() => { setPendingFlags(n); setShowFlagInput(true); }}
                  className={`cursor-pointer transition-colors ${(pendingFlags >= n || (driverData.flags || 0) >= n) ? "text-red-600" : "text-gray-200"}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-500 font-bold">
              {driverData.flags || 0} flag{driverData.flags !== 1 ? "s" : ""}
            </span>
            {(driverData.flags > 0) && (
              <button
                onClick={async () => {
                  const tId = complaint.targetId || complaint.targetUid;
                  if (!tId) return;
                  await updateDoc(doc(db, "users", tId), { flags: 0, flagReason: "" });
                  setDriverData((prev: any) => ({ ...prev, flags: 0 }));
                  setPendingFlags(0);
                  toast.success("Flags cleared");
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500 text-green-600 hover:bg-green-50"
              >
                Clear
              </button>
            )}
            {(driverData.flags > 0 || pendingFlags > 0) && (
              <button onClick={() => setShowFlagInput(!showFlagInput)} className="text-blue-500 hover:text-blue-700">
                <FaInfoCircle size={13} />
              </button>
            )}
          </div>
        )}

        {/* Flag Input (drivers only) */}
        {isDriverComplaint && showFlagInput && (
          <div className="animate-in slide-in-from-top-2 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Add reason for flag..."
                className="text-[11px] p-1.5 pr-8 border rounded-lg w-full outline-none focus:ring-1 focus:ring-red-400"
              />
              <button onClick={() => setShowPresets(!showPresets)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                <FaChevronDown size={10} />
              </button>
              {showPresets && (
                <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl mt-1 z-50 py-1 overflow-hidden">
                  {PRESET_REASONS.map(r => (
                    <button key={r} onClick={() => { setFlagReason(r); setShowPresets(false); }}
                      className="w-full text-left px-3 py-2 text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 border-b last:border-0 border-gray-50">
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                if (!flagReason.trim()) return toast.error("Provide a reason");
                const tId = complaint.targetId || complaint.targetUid;
                if (!tId) return;
                await updateDoc(doc(db, "users", tId), { flags: pendingFlags, flagReason });
                setDriverData((prev: any) => ({ ...prev, flags: pendingFlags, flagReason }));
                setShowFlagInput(false);
                setShowPresets(false);
                toast.success(`Driver set to ${pendingFlags} flag(s)`);
              }}
              className="w-full text-[10px] bg-red-600 text-white px-3 py-2 rounded-lg font-black uppercase hover:bg-red-700"
            >
              Save Flag Report
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ComplaintsPanel() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "driver" | "customer">("all");

  useEffect(() => {
    const q = query(collection(db, "complains"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = complaints.filter(c => {
    if (filter === "all") return true;
    const isDriver = c.targetType === "driver" || c.reportedBy === "customer";
    return filter === "driver" ? isDriver : !isDriver;
  });

  const driverCount = complaints.filter(c => c.targetType === "driver" || c.reportedBy === "customer").length;
  const customerCount = complaints.filter(c => c.targetType === "customer" || c.reportedBy === "driver").length;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="mt-6 border-t-2 border-dashed border-gray-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black uppercase text-gray-800 tracking-tight flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500" /> Customer Complaints & Flags
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
            {driverCount} driver flags · {customerCount} customer flags · {complaints.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "driver", "customer"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                filter === f
                  ? f === "driver" ? "bg-red-500 border-red-500 text-white" : f === "customer" ? "bg-purple-500 border-purple-500 text-white" : "bg-gray-800 border-gray-800 text-white"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {f === "all" ? `All (${complaints.length})` : f === "driver" ? `Drivers (${driverCount})` : `Customers (${customerCount})`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 opacity-40">
          <FaExclamationTriangle size={40} className="mx-auto mb-4 text-gray-400" />
          <p className="font-black uppercase text-sm tracking-widest">No complaints in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map(c => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                onFlagDriver={() => {}}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
