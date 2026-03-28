"use client";

import React, { useState, useEffect } from 'react';
import {
  FiMail, FiPhone, FiMapPin, FiSend, FiMessageSquare,
  FiUser, FiTrash2, FiAlertCircle
} from 'react-icons/fi';
import TransportNewsPageUi from '@/components/transportNews';
import toast from 'react-hot-toast';
import { db, auth } from '@/lib/firebaseConfig';
import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, updateDoc, doc, increment, Timestamp, arrayUnion
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

const ContactPageUi = () => {
  const [view, setView] = useState<'send' | 'replies'>('send');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });

  const [contactInfo, setContactInfo] = useState({
    email: 'nomopoventures@yahoo.com',
    phone: '+2349023688246',
    address: 'Suite 08, 2nd Floor, 147 Akarigbo Road, Sabo, Sagamu, Ogun State. Nigeria',
    note: "At Nomo Cars, we don't just rent vehicles. We provide the freedom to move, the luxury to inspire, and the seamless experience every modern traveler deserves."
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData(prev => ({ ...prev, name: currentUser.displayName || '' }));
      }
    });

    const unsubContact = onSnapshot(doc(db, "siteContent", "globalSettings"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setContactInfo(prev => ({
          ...prev,
          email: data.contactEmail || prev.email,
          phone: data.contactPhone ? `+234${data.contactPhone}` : prev.phone,
          address: data.address || prev.address
        }));
      }
    });

    return () => { unsubAuth(); unsubContact(); };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "complains"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((msg: any) => !msg.isDeleted)
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUserMessages(messages);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please login to create a ticket");
    if (!formData.message.trim()) return toast.error("Message cannot be empty");

    setLoading(true);
    const loadId = toast.loading("Creating your ticket...");

    try {
      await addDoc(collection(db, "complains"), {
        ...formData,
        email: user.email,
        userId: user.uid,
        status: 'pending',
        isDeleted: false,
        replies: [],
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "admin_metadata", "counters"), { unreadComplaints: increment(1) }).catch(() => null);

      toast.success("Ticket created successfully!", { id: loadId });
      setFormData(prev => ({ ...prev, message: '' }));
      setView('replies');
    } catch (error) {
      toast.error("Failed to send.", { id: loadId });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    const text = replyText[ticketId];
    if (!text?.trim()) return;

    try {
      await updateDoc(doc(db, "complains", ticketId), {
        replies: arrayUnion({
          sender: 'user',
          text: text,
          timestamp: new Date().toISOString()
        }),
        status: 'pending'
      });
      setReplyText({ ...replyText, [ticketId]: '' });
      toast.success("Reply sent");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await updateDoc(doc(db, "complains", deleteId), { isDeleted: true });
      toast.success("Ticket removed");
      setDeleteId(null);
    } catch (error) {
      toast.error("Could not remove ticket");
    }
  };

  const ContactDetails = ({ isMobile = false }) => (
    <div className={`${isMobile ? 'block md:hidden mt-8' : 'hidden md:block'} space-y-8`}>
      <div className="bg-[#0B2A4A] px-3 md:px-10 py-24 md:rounded-xl border-b-4 border-yellow-500 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><FiMessageSquare size={150} /></div>
        <h2 className="text-xl font-black uppercase italic mb-8 border-b border-white/10 pb-4">Corporate <span className="text-yellow-400">Information</span></h2>
        <div className="space-y-6">
          <div className="flex items-center gap-4 group">
            <div className="p-3 bg-white/5 rounded-lg text-yellow-400"><FiMail size={20} /></div>
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Help Email</p>
              <p className="text-sm font-bold">{contactInfo.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="p-3 bg-white/5 rounded-lg text-yellow-400"><FiPhone size={20} /></div>
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Support Center</p>
              <p className="text-sm font-bold">{contactInfo.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="p-3 bg-white/5 rounded-lg text-yellow-400"><FiMapPin size={20} /></div>
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Head Office</p>
              <p className="text-[11px] font-bold uppercase max-w-[250px] leading-tight">{contactInfo.address}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 bg-blue-600/5 rounded-md md:rounded-xl border-2 border-dashed border-blue-600/20">
        <p className="text-[#0B2A4A] text-xs font-bold leading-relaxed italic">"{contactInfo.note}"</p>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F5F5F5] min-h-screen pt-4 pb-20 px-3 md:px-6 font-sans">
      <div className="max-w-7xl mx-auto">

        {deleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#0B2A4A]/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle size={32} />
              </div>
              <h2 className="text-[#0B2A4A] font-black uppercase italic text-lg mb-2 tracking-tighter">Delete Ticket</h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase mb-6">Are you sure you want to remove this ticket?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-3 rounded-xl border text-[#0B2A4A] font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={handleConfirmDelete} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest">Confirm</button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-6 md:mb-6">
          <h1 className="text-2xl md:text-5xl font-black uppercase italic text-[#0B2A4A] tracking-tighter">Contact <span className="text-blue-600">Support</span></h1>
          <p className="text-gray-500 mt-2 text-[10px] font-bold uppercase tracking-[0.3em]">Direct Channel to ABST Global Administration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <ContactDetails isMobile={false} />

          <div className="bg-white px-2 py-8 md:p-12 rounded-md md:rounded-xl shadow-xl border border-gray-100 min-h-[500px]">
            <div className="flex justify-center mb-8">
              <div className="bg-[#0B2A4A] p-1 rounded-md md:rounded-xl flex gap-1">
                <button onClick={() => setView('send')} className={`px-4 py-2 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'send' ? 'bg-yellow-400 text-[#0B2A4A]' : 'text-white/40'}`}>Contact Form</button>
                <button onClick={() => setView('replies')} className={`px-4 py-2 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${view === 'replies' ? 'bg-yellow-400 text-[#0B2A4A]' : 'text-white/40'}`}>
                  My Tickets {userMessages.length > 0 && (
                    <span className="ml-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[7px] font-black">
                      {userMessages.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {view === 'send' ? (
              <div className="px-4 md:px-0 space-y-5">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1"><FiUser /> Name</label>
                      <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" className="w-full bg-gray-50 border border-gray-200 rounded-md md:rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-600 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1"><FiPhone /> Phone</label>
                      <input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+234..." className="w-full bg-gray-50 border border-gray-200 rounded-md md:rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-600 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1"><FiMail /> Email</label>
                    <input value={user?.email || "Login to verify email"} disabled className="w-full bg-gray-100 border border-gray-200 rounded-md md:rounded-xl px-4 py-3 text-xs font-bold text-gray-400 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-1"><FiMessageSquare /> Message</label>
                    <textarea required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="How can we help?" className="w-full bg-gray-50 border border-gray-200 rounded-md md:rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-600 outline-none h-28" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#0B2A4A] text-white py-4 rounded-md md:rounded-xl font-black uppercase text-[10px] tracking-widest flex justify-center items-center gap-2 hover:bg-blue-600 shadow-lg transition-all disabled:opacity-50">
                    {loading ? "Processing..." : <><FiSend /> Create Ticket</>}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 no-scrollbar">
                {userMessages.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 text-[10px] font-bold uppercase tracking-widest">No tickets found</p>
                ) : (
                  userMessages.map((ticket: any) => {
                    const lastReply = ticket.replies?.[ticket.replies.length - 1];
                    const canReply = lastReply?.sender === 'admin';

                    return (
                      <div key={ticket.id} className="bg-white md:rounded-xl px-3 py-5 border border-gray-100 shadow-sm mb-4 max-h-[300px] overflow-y-auto no-scrollbar border-t-2 border-t-blue-600">
                        <div className="flex justify-between items-start mb-4 sticky top-0 bg-white pt-1 pb-2 z-10">
                          <span className="text-[8px] font-black uppercase bg-[#0B2A4A] text-white px-2 py-1 rounded tracking-widest">Ticket #{ticket.id.slice(0, 8)}</span>
                          <button onClick={() => setDeleteId(ticket.id)} className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-100">
                          <p className="text-[10px] text-gray-600 italic leading-relaxed">"{ticket.message}"</p>
                        </div>
                        {ticket.replies?.map((reply: any, index: number) => (
                          <div key={index} className={`relative p-3 rounded-md mb-2 border ${reply.sender === 'admin' ? 'bg-blue-50 ml-4 border-l-4 border-blue-600' : 'bg-green-50 mr-4 border-r-4 border-green-600'}`}>
                            <p className={`text-[8px] font-black uppercase mb-1 tracking-widest ${reply.sender === 'admin' ? 'text-blue-600' : 'text-green-600'}`}>
                              {reply.sender === 'admin' ? 'Support Team' : 'You'}
                            </p>
                            <p className="text-[11px] text-[#0B2A4A] leading-relaxed font-bold">{reply.text}</p>
                          </div>
                        ))}

                        {canReply && (
                          <div className="mt-4 flex gap-2 sticky bottom-0 bg-white py-2">
                            <input
                              value={replyText[ticket.id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                              placeholder="Type your reply..."
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-bold focus:border-blue-600 outline-none"
                            />
                            <button
                              onClick={() => handleReply(ticket.id)}
                              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-[#0B2A4A] transition-all"
                            >
                              <FiSend size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
            <ContactDetails isMobile={true} />
          </div>
        </div>
      </div>
      <TransportNewsPageUi />
    </div>
  );
};

export default ContactPageUi;