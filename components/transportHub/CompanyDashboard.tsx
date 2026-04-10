"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, onSnapshot, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { FiPlus, FiTrash2, FiClock, FiMapPin, FiDollarSign, FiCalendar, FiArrowRight, FiBriefcase, FiArrowLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LoadingRound from "@/components/re-useable-loading";

interface TransportListing {
    id: string;
    from: string;
    to: string;
    amount: number;
    discount: string;
    time: string;
    maxDate: Timestamp;
    companyId: string;
    companyName?: string;
}

interface TransportCompany {
    id: string;
    companyName: string;
    ceoName: string;
    registrationDate: Timestamp;
    // ... other fields as needed
}

interface CompanyDashboardProps {
    companyId: string;
    onBack: () => void;
}

export default function CompanyDashboard({ companyId, onBack }: CompanyDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState<TransportCompany | null>(null);
    const [listings, setListings] = useState<TransportListing[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    
    const [newListing, setNewListing] = useState({
        from: "",
        to: "",
        amount: "",
        discount: "0%",
        time: "06:00 AM",
        maxDate: "",
    });

    useEffect(() => {
        if (!companyId) return;

        // Fetch company data
        const fetchCompany = async () => {
            const snap = await getDoc(doc(db, "transportCompanies", companyId));
            if (snap.exists()) {
                setCompany({ id: snap.id, ...snap.data() } as TransportCompany);
            }
        };
        fetchCompany();

        // Real-time listings
        const q = query(collection(db, "transportListings"), where("companyId", "==", companyId));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransportListing));
            
            // Auto-cleanup check (client-side filter then delete from DB)
            const now = new Date();
            const validListings = data.filter(item => {
                const expiry = item.maxDate?.toDate();
                if (expiry && expiry < now) {
                    // This is expired, we should delete it from DB
                    deleteDoc(doc(db, "transportListings", item.id)).catch(console.error);
                    return false;
                }
                return true;
            });

            setListings(validListings);
            setLoading(false);
        });

        return () => unsub();
    }, [companyId]);

    const handleAddListing = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const listingId = `listing_${Date.now()}`;
            const listingData = {
                ...newListing,
                id: listingId,
                companyId,
                companyName: company?.companyName,
                amount: Number(newListing.amount),
                createdAt: Timestamp.now(),
                maxDate: Timestamp.fromDate(new Date(newListing.maxDate)),
            };

            await setDoc(doc(db, "transportListings", listingId), listingData);
            toast.success("Destination Added!");
            setShowAddForm(false);
            setNewListing({ from: "", to: "", amount: "", discount: "0%", time: "06:00 AM", maxDate: "" });
        } catch (error) {
            console.error(error);
            toast.error("Failed to add listing");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this trip?")) return;
        try {
            await deleteDoc(doc(db, "transportListings", id));
            toast.success("Trip deleted");
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    if (loading && !company) return <div className="min-h-screen flex items-center justify-center bg-[#061a14]"><LoadingRound /></div>;

    return (
        <div className="min-h-screen bg-[#061a14] relative overflow-hidden text-white font-sans">
            {/* Background Image with Emerald Overlay */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1542332213-9b5a5a3fab35?q=80&w=2070&auto=format&fit=crop" 
                    className="w-full h-full object-cover opacity-20 grayscale" 
                    alt="background" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-[#061a14]/95 to-black/90" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-all">
                            <FiArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                                <FiBriefcase className="text-emerald-400" />
                                {company?.companyName || "My Company"}
                            </h1>
                            <p className="text-emerald-400/60 text-sm font-bold uppercase tracking-[0.2em]">Partner Dashboard</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/20"
                    >
                        <FiPlus /> Add Destination
                    </button>
                </header>

                {/* Stats / Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatCard title="Active Trips" value={listings.length} icon={<FiMapPin />} />
                    <StatCard title="CEO" value={company?.ceoName || "N/A"} icon={<FiUser />} />
                    <StatCard title="Registered On" value={company?.registrationDate?.toDate().toLocaleDateString() || "N/A"} icon={<FiCalendar />} />
                </div>

                {/* Listings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {listings.map((item: TransportListing) => (
                            <motion.div 
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative group hover:border-emerald-500/30 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {item.time}
                                    </div>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <FiTrash2 />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">From</p>
                                        <p className="font-bold text-lg">{item.from}</p>
                                    </div>
                                    <FiArrowRight className="text-emerald-500" />
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">To</p>
                                        <p className="font-bold text-lg">{item.to}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                    <div>
                                        <p className="text-[10px] text-emerald-500 uppercase font-black">Ticket Amount</p>
                                        <p className="text-2xl font-black">₦{item.amount.toLocaleString()}</p>
                                        {item.discount !== "0%" && (
                                            <p className="text-xs text-amber-400 font-bold">-{item.discount} Discount</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">Expires On</p>
                                        <p className="text-xs font-bold text-slate-300">{item.maxDate?.toDate().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {listings.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <FiMapPin className="mx-auto text-4xl text-slate-600 mb-4" />
                            <p className="text-slate-400 font-bold">No active destinations listed yet.</p>
                            <p className="text-slate-600 text-sm">Click 'Add Destination' to start appearing in the transport hub.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Destination Modal */}
            <AnimatePresence>
                {showAddForm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-[#0f1d36] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-white">Add New Listing</h2>
                                <button onClick={() => setShowAddForm(false)} className="text-slate-400"><FiX /></button>
                            </div>

                            <form onSubmit={handleAddListing} className="space-y-4">
                                <FormInput label="From City" value={newListing.from} onChange={v => setNewListing({...newListing, from: v})} required />
                                <FormInput label="To City" value={newListing.to} onChange={v => setNewListing({...newListing, to: v})} required />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Amount (₦)" type="number" value={newListing.amount} onChange={v => setNewListing({...newListing, amount: v})} required />
                                    <FormInput label="Discount (e.g. 5%)" value={newListing.discount} onChange={v => setNewListing({...newListing, discount: v})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Departure Time" value={newListing.time} onChange={v => setNewListing({...newListing, time: v})} required />
                                    <FormInput label="Expiry Date" type="date" value={newListing.maxDate} onChange={v => setNewListing({...newListing, maxDate: v})} required />
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full py-4 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 transition-all mt-4"
                                >
                                    Upload Trip
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="text-emerald-400">{icon}</div>
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{title}</p>
            </div>
            <p className="text-2xl font-black">{value}</p>
        </div>
    );
}

interface FormInputProps {
    label: string;
    value: string | number;
    onChange: (val: string) => void;
    type?: string;
    required?: boolean;
}

function FormInput({ label, value, onChange, type = "text", required = false }: FormInputProps) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">{label}</label>
            <input 
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/50"
            />
        </div>
    );
}

function FiX({ className }: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function FiUser({ className }: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${className}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    );
}
