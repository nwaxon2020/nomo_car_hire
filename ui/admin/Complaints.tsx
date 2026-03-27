"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { db, auth } from '@/lib/firebaseConfig';
import { 
  collection, query, orderBy, onSnapshot, where, getDocs, writeBatch,
  updateDoc, doc, deleteDoc, arrayUnion, Timestamp, getDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageSquare, FiPhone, FiMail, FiSend, 
  FiCheckCircle, FiClock, FiTrash2, FiAlertCircle, FiUser, FiNavigation, FiLock 
} from 'react-icons/fi';
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
  name: string;
  email: string;
  phone: string;
  message: string;
  replies?: Reply[];
  status?: string;
  userId?: string;
  createdAt?: any;
}

const AdminComplaintsUi = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [enteredPassCode, setEnteredPassCode] = useState('');

  const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const MASTER_PASS_CODE = process.env.NEXT_PUBLIC_ADMIN_PASS_CODE;

  // REMOVED: The global resetUnreadStatus useEffect that was clearing everything on load.
  // Tickets will now only be marked "read" when you handleSendReply.

  useEffect(() => {
    let unsubscribe: () => void;

    const initializeAuthAndData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const isCEO = currentUser.uid === ADMIN_UID;
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const isAdminFlag = userData?.admin === true || userData?.isAdmin === true;
        const staffDocRef = doc(db, "adminStaffs", currentUser.uid);
        const staffSnap = await getDoc(staffDocRef);
        const isStaff = staffSnap.exists();

        const canAccess = isCEO || isAdminFlag || isStaff;
        setIsAuthorized(canAccess);

        if (canAccess) {
          const q = query(collection(db, "complains"), orderBy("createdAt", "desc"));
          unsubscribe = onSnapshot(q, (snapshot) => {
            setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
            setIsLoading(false);
          }, (error) => {
            console.error("Snapshot error:", error);
            toast.error("Live sync failed");
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Authorization check failed:", err);
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
    } catch (error) {
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
    } catch (error) {
      toast.error("Archive failed");
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050A0F]">
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
            Nomopo Administrative Protocol Only.<br/>Your credentials lack sufficient clearance.
        </p>
        <Link href="/" className="mt-8 inline-block bg-[#0B2A4A] text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
            Return to Base
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-10 pb-20 px-4 md:px-12">
      <style jsx global>{`
        @keyframes blinkRed {
          0% { border-color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
          50% { border-color: #fecaca; box-shadow: none; }
          100% { border-color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
        }
        .animate-blink-5s {
          animation: blinkRed 0.8s ease-in-out infinite;
          animation-iteration-count: 7; /* roughly 5-6 seconds */
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {deleteId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#0B2A4A]/60 backdrop-blur-md">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center border-t-4 border-red-600">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiLock size={24} />
                </div>
                <h2 className="text-[#0B2A4A] font-black uppercase italic text-xl mb-1">Authorization Required</h2>
                <p className="text-gray-400 text-[9px] font-bold uppercase mb-6 tracking-widest">Enter 6-digit administrative pass code</p>
                <input 
                    type="password"
                    maxLength={6}
                    value={enteredPassCode}
                    onChange={(e) => setEnteredPassCode(e.target.value)}
                    placeholder="******"
                    className="w-full text-center bg-gray-50 border-2 border-gray-100 rounded-xl py-3 mb-6 text-xl font-black tracking-[0.5em] focus:border-red-600 outline-none"
                />
                <div className="flex gap-3">
                  <button onClick={() => { setDeleteId(null); setEnteredPassCode(''); }} className="flex-1 px-4 py-3 rounded-xl border font-black uppercase text-[10px] tracking-widest text-gray-400">Cancel</button>
                  <button onClick={handleArchive} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg">Confirm</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-6 bg-blue-600 rounded-full" />
              <h1 className="text-2xl font-black uppercase italic text-[#0B2A4A] tracking-tighter">Nomo <span className="text-blue-600">Concierge</span></h1>
            </div>
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.4em]">Customer Support & Relations</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3">
                <FiClock className="text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">{complaints.length} Active Requests</span>
             </div>
             <Link href="/admin" className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <FiNavigation className="text-[#0B2A4A]" />
             </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {complaints.map((c) => (
            <motion.div 
              key={c.id} 
              layout 
              className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group h-full relative 
                ${c.status !== 'read' ? 'border-red-500 animate-blink-5s' : 'border-gray-100'}`}
            >
              
              {c.status !== 'read' && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-red-600 text-white px-2 py-1 rounded-full shadow-lg animate-pulse">
                   <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                   <span className="text-[8px] font-black uppercase tracking-tighter">Action Required</span>
                </div>
              )}

              <div className="p-3 flex justify-between items-start border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100">
                    {c.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-[#0B2A4A] tracking-tight">{c.name}</h3>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{c.phone}</p>
                  </div>
                </div>
                <button onClick={() => setDeleteId(c.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                  <FiTrash2 size={16} />
                </button>
              </div>

              <div className="p-4 flex-1 space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                <div className="bg-gray-50 p-4 rounded-2xl relative">
                  <FiMessageSquare className="absolute -top-2 -right-2 text-blue-600/10" size={40} />
                  <p className="text-[11px] text-[#0B2A4A] font-bold leading-relaxed italic">"{c.message}"</p>
                  <p className="text-[7px] text-gray-400 mt-2 uppercase font-black tracking-widest">
                    {c.createdAt?.toDate?.()?.toLocaleString() || 'Recent'}
                  </p>
                </div>

                {c.replies && c.replies.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {c.replies.map((reply, idx) => (
                      <div key={idx} className={`flex flex-col ${reply.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-[10px] font-bold ${
                          reply.sender === 'admin' 
                          ? 'bg-[#0B2A4A] text-white rounded-tr-none shadow-md shadow-blue-900/10' 
                          : 'bg-blue-50 text-blue-700 rounded-tl-none'
                        }`}>
                          {reply.text}
                        </div>
                        {reply.sender === 'admin' && reply.senderEmail && (
                          <span className="text-[6px] text-gray-400 uppercase font-black mt-1 pr-1 tracking-tighter">
                            via {reply.senderEmail}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F8FAFC] border-t border-gray-50 mt-auto">
                <div className="flex gap-2">
                  <input 
                    value={replyText[c.id] || ''}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Type official response..."
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={() => handleSendReply(c.id)}
                    disabled={loadingId === c.id || !replyText[c.id]}
                    className="w-12 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50"
                  >
                    {loadingId === c.id ? "..." : <FiSend />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {complaints.length === 0 && (
          <div className="text-center py-32">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="text-blue-500 text-3xl" />
            </div>
            <h2 className="text-[#0B2A4A] font-black uppercase text-xl italic">All Clear</h2>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">No pending rental disputes or complaints</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminComplaintsUi;