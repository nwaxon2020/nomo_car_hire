"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDoc, Timestamp } from "firebase/firestore";
import { FiCheck, FiX, FiFlag, FiTrash2, FiMessageSquare, FiEye, FiImage, FiLock, FiPlus, FiAlertTriangle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import LoadingRound from "@/components/re-useable-loading";
import { triggerNotification } from "@/lib/notifications";
import ManualTransportCardForm from "./ManualTransportCardForm";
import { useAdminRole, verifyAdminPasscode } from '@/lib/hooks/useAdminRole';

export default function ManageTransport() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [overlayImage, setOverlayImage] = useState<string | null>(null);
    const [passkey, setPasskey] = useState("");
    const [showPasskeyModal, setShowPasskeyModal] = useState<any>(null); // {id, action}
    const [showCardForm, setShowCardForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'partners' | 'manual'>('partners');
    const [manualListings, setManualListings] = useState<any[]>([]);
    const [loadingManual, setLoadingManual] = useState(false);
    const [showDeleteTripId, setShowDeleteTripId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { isCEO } = useAdminRole();

    useEffect(() => {
        const q = collection(db, "transportCompanies");
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompanies(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (activeTab === 'manual') {
            setLoadingManual(true);
            const q = query(collection(db, "transportListings"), where("type", "==", "manual"));
            const unsub = onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setManualListings(data);
                setLoadingManual(false);
            });
            return () => unsub();
        }
    }, [activeTab]);

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
        const isValid = await verifyAdminPasscode(passkey);
        if (!isValid) {
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

    const handleDeleteManual = async (id: string) => {
        setShowDeleteTripId(id);
    };

    const confirmDeleteManual = async () => {
        if (!showDeleteTripId) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "transportListings", showDeleteTripId));
            toast.success("Trip listings removed from platform");
            setShowDeleteTripId(null);
        } catch (err) {
            toast.error("Failed to delete trip");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="h-60 flex items-center justify-center"><LoadingRound /></div>;

    return (
        <div className="py-4 px-2 md:p-8 space-y-8 bg-[#040b18] min-h-screen text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Manage Transport</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Review registrations and manage manual listings.</p>
                </div>

                <div className="flex bg-white/5 border border-white/10 rounded md:rounded-2xl p-1.5 shadow-2xl">
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`px-6 py-2.5 rounded md:rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'partners' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Partner Companies
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-6 py-2.5 rounded md:rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Created Trips
                    </button>
                </div>
            </div>

            {activeTab === 'partners' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-black text-white px-1">Transport Partners</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 px-1">Manage all registered transport companies</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {companies.map((company) => (
                            <div key={company.id} className="bg-slate-900 border border-white/10 rounded-2xl p-3 md:p-6 flex flex-col md:flex-row gap-6">
                                {/* Company Visuals */}
                                <div className="flex gap-4">
                                    <div
                                        onClick={() => setOverlayImage(company.garageImageUrl)}
                                        className="w-20 h-20 md:w-24 md:h-24 rounded-md md:rounded-xl bg-slate-800 border border-white/5 overflow-hidden cursor-zoom-in relative group"
                                        title="Garage Image"
                                    >
                                        <img src={company.garageImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="Garage" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                            <FiEye className="text-white" />
                                        </div>
                                        <div className="absolute bottom-1 left-0 right-0 text-[8px] font-black text-center text-white bg-black/60 uppercase">Garage</div>
                                    </div>
                                    <div
                                        onClick={() => setOverlayImage(company.cacImageUrl)}
                                        className="w-20 h-20 md:w-24 md:h-24 rounded-md md:rounded-xl bg-slate-800 border border-white/5 overflow-hidden cursor-zoom-in relative group"
                                        title="CAC Document"
                                    >
                                        {company.cacImageUrl ? (
                                            <>
                                                <img src={company.cacImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="CAC" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                                    <FiEye className="text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                                                <FiImage size={24} />
                                                <span className="text-[8px] font-bold">NO CAC</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 left-0 right-0 text-[8px] font-black text-center text-white bg-black/60 uppercase">CAC DOC</div>
                                    </div>
                                    <div
                                        onClick={() => setOverlayImage(company.idImageUrl)}
                                        className="w-20 h-20 md:w-24 md:h-24 rounded-md md:rounded-xl bg-slate-800 border border-white/5 overflow-hidden cursor-zoom-in relative group"
                                        title="Owner ID"
                                    >
                                        <img src={company.idImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="ID" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                            <FiEye className="text-white" />
                                        </div>
                                        <div className="absolute bottom-1 left-0 right-0 text-[8px] font-black text-center text-white bg-black/60 uppercase">Owner ID</div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-white">{company.companyName}</h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${company.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
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
                                <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-2 justify-center items-center">
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
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-blue-600/10 border border-blue-500/20 md:p-6 p-2 md:rounded-xl">
                        <div>
                            <h2 className="md:text-xl font-black uppercase tracking-tight">Manual Listings</h2>
                            <p className="text-blue-400/60 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Total Created: {manualListings.length}</p>
                        </div>
                        <button
                            onClick={() => setShowCardForm(true)}
                            className="text-xs md:text-base px-3 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded md:rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-start md:items-center gap-0.5 md:gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            <FiPlus size={16} /> Create New Trip
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loadingManual ? (
                            <div className="md:col-span-3 py-20 flex justify-center"><LoadingRound /></div>
                        ) : manualListings.length > 0 ? (
                            manualListings.map((trip) => (
                                <div key={trip.id} className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative group hover:border-blue-500/30 transition-all shadow-xl">
                                    <button
                                        onClick={() => handleDeleteManual(trip.id)}
                                        className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center font-black">
                                            {trip.company?.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white leading-none tracking-tight">{trip.company}</h3>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Manual Entry</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-lg font-bold text-white">{trip.from}</span>
                                        <div className="w-4 h-[1px] bg-white/20" />
                                        <span className="text-lg font-bold text-white">{trip.to}</span>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Fare Amount</p>
                                            <p className="text-xl font-black text-blue-400">₦{trip.amount?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Time</p>
                                            <p className="text-xs font-bold text-white uppercase">{trip.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="md:col-span-3 py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No manual trips found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

            {/* Manual Transport Card Form Modal */}
            <ManualTransportCardForm
                isOpen={showCardForm}
                onClose={() => setShowCardForm(false)}
                onSuccess={() => {
                    // No need to refresh - the companies list will auto-update via onSnapshot
                }}
            />

            {/* Delete Trip Confirmation Overlay */}
            <AnimatePresence>
                {showDeleteTripId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => !isDeleting && setShowDeleteTripId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0d1b2e] border border-red-500/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl shadow-red-900/20 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                                <FiAlertTriangle className="text-red-500" size={28} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Delete Trip?</h3>
                            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                                This will permanently remove the trip listing from the platform. This action <span className="text-red-400 font-bold">cannot be undone</span>.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteTripId(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteManual}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {isDeleting ? (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <><FiTrash2 size={13} /> Delete</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
