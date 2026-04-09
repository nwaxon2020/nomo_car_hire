"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { db, auth } from '@/lib/firebaseConfig';
import {
  collection, query, orderBy, onSnapshot, getDoc,
  updateDoc, doc, deleteDoc, arrayUnion, Timestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMessageSquare, FiSend,
  FiCheckCircle, FiClock, FiTrash2, FiAlertCircle, FiNavigation, FiLock
} from 'react-icons/fi';
import {
  FaFlag, FaWhatsapp, FaPhone, FaEnvelope, FaUser,
  FaExclamationTriangle, FaChevronDown, FaIdCard, FaCar, FaInfoCircle
} from "react-icons/fa";
import toast from 'react-hot-toast';

interface Reply {
  text: string;
  timestamp: Timestamp;
  sender: 'admin' | 'user';
  senderName: string;
  senderEmail?: string;
}

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
  replies?: Reply[];
}

const PRESET_REASONS = [
  "Customer Complaint", "Reckless Driving", "Vehicle Condition Issues",
  "Late Pickup/Dropoff", "Unprofessional Behavior", "Security Policy Breach",
  "Harassment", "Fraud Attempt"
];

function ComplaintCard({ complaint, onArchive, replyText, setReplyText, handleSendReply, loadingId }: any) {
  const isDriverComplaint = complaint.targetType === "driver" || complaint.reportedBy === "customer";
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [pendingFlags, setPendingFlags] = useState(0);
  const [driverData, setDriverData] = useState<any>(null);

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

  const isSystemOrGeneric = !complaint.targetType; // generic contact forms

  const cardBg = isDriverComplaint
    ? "bg-white border-2 border-red-100 hover:border-red-300"
    : isSystemOrGeneric ? "bg-white border-2 border-blue-100 hover:border-blue-300" : "bg-white border-2 border-purple-100 hover:border-purple-300";
  
  const headerBg = isDriverComplaint
    ? "bg-gradient-to-r from-red-600 to-rose-700"
    : isSystemOrGeneric ? "bg-gradient-to-r from-[#0B2A4A] to-blue-800" : "bg-gradient-to-r from-purple-600 to-violet-700";

  const accentColor = isDriverComplaint ? "text-red-600" : isSystemOrGeneric ? "text-[#0B2A4A]" : "text-purple-600";
  const badgeColors = isDriverComplaint ? "bg-red-800/40 text-red-100" : isSystemOrGeneric ? "bg-blue-800/40 text-blue-100" : "bg-purple-800/40 text-purple-100";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${cardBg} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col h-full relative`}
    >
      {complaint.status !== 'read' && (
        <div 
          onClick={async () => {
            try {
              await updateDoc(doc(db, "complains", complaint.id), { status: "read" });
              toast.success("Ticket cleared");
            } catch (err) {
              toast.error("Failed to update status");
            }
          }}
          className="absolute -top-3 -left-3 z-10 flex items-center gap-2 bg-red-600 hover:bg-red-700 cursor-pointer text-white px-3 py-1.5 rounded-full shadow-xl transition-all hover:scale-105 animate-pulse border-2 border-white"
        >
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-md">Action Required</span>
        </div>
      )}

      {/* Card Header */}
      <div className={`${headerBg} p-4`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              {isDriverComplaint ? <FaCar className="text-white" /> : isSystemOrGeneric ? <FiMessageSquare className="text-white" /> : <FaUser className="text-white" />}
            </div>
            <div>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColors} mb-1 inline-block`}>
                {isDriverComplaint ? "Driver Flagged" : isSystemOrGeneric ? "General Contact" : "Customer Flagged"}
              </span>
              <h3 className="text-white font-black text-sm leading-tight">{displayName}</h3>
            </div>
          </div>
          <button onClick={() => onArchive(complaint.id)} className="text-white/60 hover:text-white transition-colors p-1">
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* Target Details */}
      <div className="p-4 space-y-3 border-b border-gray-50 bg-gray-50/50">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">{formatDate(complaint.createdAt)}</span>
          {displayUid && <span className="text-gray-400 text-[9px] font-mono tracking-widest">ID: {displayUid.slice(-6)}</span>}
        </div>
        
        {displayPhone && (
          <div className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-lg">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</span>
            <div className="flex gap-2 items-center">
              <a href={`tel:${displayPhone}`} className={`text-xs font-bold ${accentColor} hover:underline`}>{displayPhone}</a>
              <a href={`https://wa.me/${formatWhatsApp(displayPhone)}`} target="_blank" className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                <FaWhatsapp className="text-white text-[10px]" />
              </a>
            </div>
          </div>
        )}
        
        {displayEmail && (
          <div className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-lg">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</span>
            <a href={`mailto:${displayEmail}`} className={`text-xs font-bold ${accentColor} hover:underline truncate max-w-[150px]`}>{displayEmail}</a>
          </div>
        )}

        {isDriverComplaint && (
          <div className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-lg">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reporter</span>
            <span className="text-[10px] font-bold text-gray-700">{reporterName}</span>
          </div>
        )}

        {/* Current flag count (drivers only) */}
        {isDriverComplaint && driverData && (
          <div className="flex items-center justify-between bg-red-50 p-2 border border-red-100 rounded-lg mt-2">
            <span className="text-[9px] font-black text-red-800 uppercase tracking-widest">Driver Flags</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3].map(n => (
                  <FaFlag
                    key={n}
                    size={12}
                    onClick={() => { setPendingFlags(n); setShowFlagInput(true); }}
                    className={`cursor-pointer transition-colors ${(pendingFlags >= n || (driverData.flags || 0) >= n) ? "text-red-500" : "text-gray-300"}`}
                  />
                ))}
              </div>
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
                  className="text-[9px] font-black px-2 py-0.5 rounded-full border border-green-500 text-green-600 hover:bg-green-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Flag Input (drivers only) */}
        {isDriverComplaint && showFlagInput && (
          <div className="animate-in slide-in-from-top-2 space-y-2 pt-2">
            <div className="relative">
              <input
                type="text"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Add reason for flag..."
                className="text-[11px] p-2 pr-8 border rounded-lg w-full outline-none focus:ring-1 focus:ring-red-400 bg-white"
              />
              <button onClick={() => setShowPresets(!showPresets)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                <FaChevronDown size={10} />
              </button>
              {showPresets && (
                <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl mt-1 z-50 py-1 overflow-y-auto max-h-40">
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
                const tId = complaint.targetId || complaint.targetUid;
                if (!tId) return toast.error("Missing Target ID");
                if (pendingFlags > 0 && !flagReason.trim()) return toast.error("Provide a reason");
                
                await updateDoc(doc(db, "users", tId), { 
                  flags: pendingFlags, 
                  flagReason: pendingFlags > 0 ? flagReason : "" 
                });
                
                setDriverData((prev: any) => ({ ...prev, flags: pendingFlags, flagReason: pendingFlags > 0 ? flagReason : "" }));
                setShowFlagInput(false);
                setShowPresets(false);
                toast.success(`Driver set to ${pendingFlags} flag(s)`);
              }}
              className="w-full text-[10px] bg-red-600 text-white px-3 py-2 rounded-lg font-black uppercase hover:bg-red-700 transition"
            >
              Update Flags
            </button>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 space-y-4 max-h-[250px] overflow-y-auto no-scrollbar">
        <div className="bg-gray-100/50 p-4 rounded-2xl relative border border-gray-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Message</p>
          <p className="text-xs text-gray-800 font-medium leading-relaxed italic">
            "{complaint.reason || complaint.quickMessage || complaint.message || "No message provided"}"
          </p>
        </div>

        {complaint.replies && complaint.replies.length > 0 && (
          <div className="space-y-3 pt-2">
            {complaint.replies.map((reply: any, idx: number) => (
              <div key={idx} className={`flex flex-col ${reply.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-xl text-[10px] font-bold ${reply.sender === 'admin'
                  ? 'bg-[#0B2A4A] text-white rounded-tr-none shadow-md shadow-blue-900/10'
                  : 'bg-blue-50 text-blue-700 rounded-tl-none'
                  }`}>
                  {reply.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 mt-auto bg-gray-50/50">
        <div className="flex gap-2 relative">
          <input
            value={replyText[complaint.id] || ''}
            onChange={(e) => setReplyText((prev: any) => ({ ...prev, [complaint.id]: e.target.value }))}
            placeholder="Official response..."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[11px] font-bold focus:outline-none focus:border-blue-500 shadow-sm"
          />
          <button
            onClick={() => handleSendReply(complaint.id)}
            disabled={loadingId === complaint.id || !replyText[complaint.id]}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md disabled:opacity-50 transition-colors"
          >
            {loadingId === complaint.id ? "..." : <FiSend />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const AdminComplaintsUi = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [enteredPassCode, setEnteredPassCode] = useState('');
  const [filter, setFilter] = useState<"all" | "driver" | "customer" | "general">("all");

  const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const MASTER_PASS_CODE = process.env.NEXT_PUBLIC_ADMIN_PASS_CODE;

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeAuthAndData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return setIsLoading(false);

      try {
        const isCEO = currentUser.uid === ADMIN_UID;
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const isAdminFlag = userData?.admin === true || userData?.isAdmin === true;
        const staffDocRef = doc(db, "adminStaffs", currentUser.uid);
        const staffSnap = await getDoc(staffDocRef);

        const canAccess = isCEO || isAdminFlag || staffSnap.exists();
        setIsAuthorized(canAccess);

        if (canAccess) {
          const q = query(collection(db, "complains"), orderBy("createdAt", "desc"));
          unsubscribe = onSnapshot(q, (snapshot) => {
            setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
            setIsLoading(false);
          });
        }
      } catch (err) {
        setIsLoading(false);
      }
    };

    initializeAuthAndData();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [ADMIN_UID]);

  const handleSendReply = async (id: string) => {
    if (!replyText[id]?.trim()) return toast.error("Message required");
    setLoadingId(id);
    try {
      const reply: Reply = {
        text: replyText[id],
        timestamp: Timestamp.now(),
        sender: 'admin',
        senderName: 'Nomo Support',
        senderEmail: auth.currentUser?.email || 'Admin'
      };
      await updateDoc(doc(db, "complains", id), {
        replies: arrayUnion(reply),
        status: 'read'
      });
      toast.success("Response dispatched");
      setReplyText(prev => ({ ...prev, [id]: '' }));
    } catch {
      toast.error("Dispatch failed");
    } finally {
      setLoadingId(null);
    }
  };

  const handleArchive = async () => {
    if (enteredPassCode !== MASTER_PASS_CODE) {
      toast.error("Invalid Authorization Code");
      setEnteredPassCode('');
      return;
    }
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "complains", deleteId));
      toast.success("Ticket Archived Successfully");
      setDeleteId(null);
      setEnteredPassCode('');
    } catch {
      toast.error("Archive failed");
    }
  };

  const filtered = complaints.filter(c => {
    if (filter === "all") return true;
    const isD = c.targetType === "driver" || c.reportedBy === "customer";
    const isC = c.targetType === "customer" || c.reportedBy === "driver";
    if (filter === "driver") return isD;
    if (filter === "customer") return isC;
    if (filter === "general") return !isD && !isC;
    return true;
  });

  const counts = {
    driver: complaints.filter(c => c.targetType === "driver" || c.reportedBy === "customer").length,
    customer: complaints.filter(c => c.targetType === "customer" || c.reportedBy === "driver").length,
    general: complaints.filter(c => !c.targetType).length
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-red-100 max-w-sm">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiAlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-[#0B2A4A] font-black uppercase italic tracking-tighter text-2xl">Access Restricted</h2>
        <p className="text-gray-400 text-[10px] font-bold uppercase mt-3 tracking-[0.2em] leading-relaxed">
          Nomopo Administrative Protocol Only.<br />Your credentials lack sufficient clearance.
        </p>
        <Link href="/" className="mt-8 inline-block bg-[#0B2A4A] text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
          Return to Base
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-10 pb-20 px-4 md:px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto">
        <AnimatePresence>
          {deleteId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#0B2A4A]/60 backdrop-blur-md">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center border-t-4 border-red-600">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><FiLock size={24} /></div>
                <h2 className="text-[#0B2A4A] font-black uppercase italic text-xl mb-1">Authorization Required</h2>
                <p className="text-gray-400 text-[9px] font-bold uppercase mb-6 tracking-widest">Enter administrative pass code</p>
                <input
                  type="password"
                  maxLength={6}
                  value={enteredPassCode}
                  onChange={(e) => setEnteredPassCode(e.target.value)}
                  placeholder="******"
                  className="w-full text-center bg-gray-50 border-2 border-gray-100 rounded-xl py-3 mb-6 text-xl font-black tracking-[0.5em] focus:border-red-600 outline-none"
                />
                <div className="flex gap-3">
                  <button onClick={() => { setDeleteId(null); setEnteredPassCode(''); }} className="flex-1 px-4 py-3 rounded-xl border font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleArchive} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-700 shadow-lg transition-colors">Confirm</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0B2A4A] to-blue-900 rounded-xl flex items-center justify-center shadow-lg">
                <FaExclamationTriangle className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black uppercase italic text-[#0B2A4A] tracking-tighter shadow-sm">Resolution <span className="text-red-500">Center</span></h1>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Support Tickets & Flag Management</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full lg:w-auto mt-4 lg:mt-0">
            {(["all", "driver", "customer", "general"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 
                  ${filter === f 
                    ? f === "driver" ? "bg-red-50 text-red-700 border-red-500 shadow-sm" : f === "customer" ? "bg-purple-50 text-purple-700 border-purple-500 shadow-sm" : f === "general" ? "bg-blue-50 text-blue-700 border-blue-500 shadow-sm" : "bg-gray-800 border-gray-800 text-white shadow-md"
                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                  }`}
              >
                {f === "all" ? `All (${complaints.length})` : f === "driver" ? `Drivers (${counts.driver})` : f === "customer" ? `Customers (${counts.customer})` : `General (${counts.general})`}
              </button>
            ))}
            <Link href="/admin" className="flex-none flex justify-center items-center px-4 py-3 bg-white rounded-xl border-2 border-gray-200 shadow-sm text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700">
              <FiNavigation />
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="text-green-500 text-4xl" />
            </div>
            <h2 className="text-[#0B2A4A] font-black uppercase text-2xl italic tracking-tighter">Queue Empty</h2>
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-2 max-w-sm mx-auto">No pending tickets or flags found for this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            <AnimatePresence>
              {filtered.map(c => (
                <ComplaintCard
                  key={c.id}
                  complaint={c}
                  onArchive={setDeleteId}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  handleSendReply={handleSendReply}
                  loadingId={loadingId}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminComplaintsUi;