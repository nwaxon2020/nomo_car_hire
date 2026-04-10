"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDoc, Timestamp } from "firebase/firestore";
import { FiCheck, FiX, FiFlag, FiTrash2, FiMessageSquare, FiEye, FiImage, FiLock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import LoadingRound from "@/components/re-useable-loading";
import { triggerNotification } from "@/lib/notifications";

export default function ManageTransport() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [overlayImage, setOverlayImage] = useState<string | null>(null);
    const [passkey, setPasskey] = useState("");
    const [showPasskeyModal, setShowPasskeyModal] = useState<any>(null); // {id, action}

    const user = auth.currentUser;
    const isCEO = user?.uid === process.env.NEXT_PUBLIC_ADMIN_KEY;

    useEffect(() => {
        const q = collection(db, "transportCompanies");
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompanies(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            await updateDoc(doc(db, "transportCompanies", id), { status: "approved" });
            toast.success("Company Approved!");
            
            // Notify owner
            const company = companies.find(c => c.id === id);
            if (company?.ownerId) {
                await triggerNotification(
                    company.ownerId, 
                    "Company Approved! 🎉", 
                    `Your company "${company.companyName}" has been approved by the admin. You can now list trips.`,
                    "success",
                    "/user/mobility/transport-hub"
                );
            }
        } catch (err) {
            toast.error("Approval failed");
        }
    };

    const handleAuthorize = async () => {
        if (!isCEO) {
            toast.error(`Only CEO can ${showPasskeyModal.action} companies`);
            return;
        }
        if (passkey !== process.env.NEXT_PUBLIC_ADMIN_PASS_CODE) {
            toast.error("Invalid Admin Passcode");
            return;
        }

        try {
            if (showPasskeyModal.action === 'unapprove') {
                await updateDoc(doc(db, "transportCompanies", showPasskeyModal.id), { status: "pending" });
                toast.success("Company Unapproved");
            } else if (showPasskeyModal.action === 'delete') {
                await deleteDoc(doc(db, "transportCompanies", showPasskeyModal.id));
                toast.success("Company Deleted Forever");
            }
            setShowPasskeyModal(null);
            setPasskey("");
        } catch (err) {
            toast.error("Action failed");
        }
    };

    const handleFlag = async (id: string) => {
        const reason = prompt("Enter reason for flagging:");
        if (!reason) return;

        try {
            await updateDoc(doc(db, "transportCompanies", id), { status: "flagged", flagReason: reason });
            toast.success("Company Flagged");

            // Notify owner
            const company = companies.find(c => c.id === id);
            if (company?.ownerId) {
                await triggerNotification(
                    company.ownerId, 
                    "Company Flagged! 🚩", 
                    `Your company "${company.companyName}" has been flagged for review. Reason: ${reason}`,
                    "warning"
                );
            }
        } catch (err) {
            toast.error("Action failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!isCEO) {
            toast.error("Only CEO can delete companies");
            return;
        }
        setShowPasskeyModal({ id, action: 'delete' });
    };

    const handleNotify = async (ownerId: string, companyName: string) => {
        const msg = prompt(`Send notification to ${companyName}:`);
        if (!msg) return;

        try {
            await triggerNotification(ownerId, "Admin Message", msg, "info");
            toast.success("Notification Sent");
        } catch (err) {
            toast.error("Failed to send notification");
        }
    };

    if (loading) return <div className="h-60 flex items-center justify-center"><LoadingRound /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-white">Transport Partners</h2>
                    <p className="text-slate-500 text-sm">Manage all registered transport companies</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {companies.map((company) => (
                    <div key={company.id} className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
                        {/* Company Visuals */}
                        <div className="flex gap-4">
                            <div 
                                onClick={() => setOverlayImage(company.garageImageUrl)}
                                className="w-24 h-24 rounded-xl bg-slate-800 border border-white/5 overflow-hidden cursor-zoom-in relative group"
                                title="Garage Image"
                            >
                                <img src={company.garageImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="Garage" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                    <FiEye className="text-white" />
                                </div>
                            </div>
                            <div 
                                onClick={() => setOverlayImage(company.idImageUrl)}
                                className="w-24 h-24 rounded-xl bg-slate-800 border border-white/5 overflow-hidden cursor-zoom-in relative group"
                                title="CAC/ID Image"
                            >
                                <img src={company.idImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="CAC/ID" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                    <FiEye className="text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-white">{company.companyName}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                                    company.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                                    company.status === 'flagged' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {company.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-slate-500 uppercase font-black tracking-widest text-[10px]">Company ID</p>
                                    <p className="text-slate-300 font-mono truncate">{company.id}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 uppercase font-black tracking-widest text-[10px]">CEO</p>
                                    <p className="text-slate-300">{company.ceoName}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 uppercase font-black tracking-widest text-[10px]">Contact</p>
                                    <p className="text-slate-300">{company.phone}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 uppercase font-black tracking-widest text-[10px]">Fleet Size</p>
                                    <p className="text-slate-300">{Number(company.cars) + Number(company.buses) + Number(company.luxurious)} Vehicles</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                            {company.status !== 'approved' ? (
                                <button 
                                    onClick={() => handleApprove(company.id)}
                                    className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                                    title="Approve"
                                >
                                    <FiCheck size={20} />
                                </button>
                            ) : (
                                isCEO && (
                                    <button 
                                        onClick={() => setShowPasskeyModal({ id: company.id, action: 'unapprove' })}
                                        className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 transition-all"
                                        title="Unapprove"
                                    >
                                        <FiX size={20} />
                                    </button>
                                )
                            )}
                            
                            <button 
                                onClick={() => handleFlag(company.id)}
                                className="p-3 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all"
                                title="Flag"
                            >
                                <FiFlag size={20} />
                            </button>

                            <button 
                                onClick={() => handleNotify(company.ownerId, company.companyName)}
                                className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                                title="Send Message"
                            >
                                <FiMessageSquare size={20} />
                            </button>

                            {isCEO && (
                                <button 
                                    onClick={() => handleDelete(company.id)}
                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                    title="Delete Forever"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Image Overlay */}
            <AnimatePresence>
                {overlayImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOverlayImage(null)}
                        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-8 cursor-zoom-out"
                    >
                        <motion.img 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={overlayImage} 
                            className="max-w-full max-h-full rounded-2xl shadow-2xl" 
                            alt="Full View" 
                        />
                        <button className="absolute top-10 right-10 text-white/50 hover:text-white">
                            <FiX size={40} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Passkey Modal */}
            <AnimatePresence>
                {showPasskeyModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl"
                        >
                            <div className={`flex items-center gap-3 mb-6 ${showPasskeyModal.action === 'delete' ? 'text-red-500' : 'text-amber-500'}`}>
                                <FiLock size={24} />
                                <h3 className="text-xl font-bold uppercase tracking-tight">CEO Authorization</h3>
                            </div>
                            <p className="text-slate-400 text-sm mb-4">
                                {showPasskeyModal.action === 'delete' ? 
                                    "ARE YOU SURE? This action is irreversible. Enter passkey to DELETE FOREVER." : 
                                    "Please enter the admin passkey to unapprove this company."}
                            </p>
                            <input 
                                type="password" 
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                className={`w-full bg-black border rounded-xl py-3 px-4 text-white focus:outline-none ${showPasskeyModal.action === 'delete' ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-amber-500'}`}
                                placeholder="Enter Passkey"
                                autoFocus
                            />
                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={() => { setShowPasskeyModal(null); setPasskey(""); }}
                                    className="flex-1 py-3 bg-white/5 rounded-xl text-slate-400 font-bold hover:bg-white/10 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAuthorize}
                                    className={`flex-1 py-3 font-black rounded-xl transition-all shadow-lg text-sm ${showPasskeyModal.action === 'delete' ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/20' : 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'}`}
                                >
                                    {showPasskeyModal.action === 'delete' ? 'DELETE' : 'Authorize'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
