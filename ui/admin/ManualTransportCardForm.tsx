"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { FiX, FiPlus, FiSave } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface ManualCardFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const POPULAR_COMPANIES = [
    { name: "Peace Mass Transit", id: "pmt" },
    { name: "GIGM", id: "gigm" },
    { name: "GUO Motors", id: "guo" },
    { name: "Libra", id: "libra" },
    { name: "Ogunstate Mass Transit", id: "ogunstate" },
    { name: "Chisco", id: "chisco" },
    { name: "Young Shall Grow", id: "ysg" },
    { name: "Danfo Ventures", id: "danfo" },
];

const NIGERIAN_CITIES = [
    "Lagos", "Abuja", "Kano", "Kaduna", "Katsina", "Benin", "Onitsha",
    "Owerri", "Enugu", "Calabar", "Port Harcourt", "Warri", "Asaba",
    "Ilorin", "Ibadan", "Ogbomoso", "Oshogbo", "Akure", "Ondo",
    "Ekiti", "Ado-Ekiti", "Abeokuta", "Ijebu-Ode", "Ilaro"
];

export default function ManualTransportCardForm({ isOpen, onClose, onSuccess }: ManualCardFormProps) {
    const [step, setStep] = useState<'company' | 'details'>('company');
    const [isCustomCompany, setIsCustomCompany] = useState(false);
    const [customCompanyName, setCustomCompanyName] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");
    const [formData, setFormData] = useState({
        from: "",
        to: "",
        time: "06:00",
        amount: "",
        discount: "0",
        bookNowUrl: "",
    });
    const [loading, setLoading] = useState(false);

    const handleCompanySelect = (companyName: string) => {
        setSelectedCompany(companyName);
        setIsCustomCompany(false);
        setStep('details');
    };

    const handleCustomCompany = () => {
        if (!customCompanyName.trim()) {
            toast.error("Please enter company name");
            return;
        }
        setSelectedCompany(customCompanyName);
        setIsCustomCompany(true);
        setStep('details');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!selectedCompany.trim()) {
            toast.error("Please select or enter company name");
            return;
        }
        if (!formData.from.trim()) {
            toast.error("Please select origin city");
            return;
        }
        if (!formData.to.trim()) {
            toast.error("Please select destination city");
            return;
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("Please enter valid fare amount");
            return;
        }
        if (!formData.bookNowUrl.trim()) {
            toast.error("Please enter booking URL");
            return;
        }

        setLoading(true);
        try {
            const cardData = {
                company: selectedCompany,
                from: formData.from,
                to: formData.to,
                time: formData.time,
                amount: Number(formData.amount),
                discount: formData.discount ? `${formData.discount}%` : "0%",
                bookNowUrl: formData.bookNowUrl,
                type: 'manual',
                createdBy: auth.currentUser?.uid,
                createdAt: serverTimestamp(),
                isCustomCompany,
            };

            await addDoc(collection(db, "transportListings"), cardData);
            toast.success("Transport card created successfully!");
            
            // Reset form
            setStep('company');
            setFormData({
                from: "",
                to: "",
                time: "06:00",
                amount: "",
                discount: "0",
                bookNowUrl: "",
            });
            setSelectedCompany("");
            setCustomCompanyName("");
            setIsCustomCompany(false);
            
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create transport card");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                Create Transport Card
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                                <FiX size={24} className="text-white" />
                            </button>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex gap-2 mb-8">
                            <div className={`flex-1 h-1 rounded-full transition-all ${step === 'company' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            <div className={`flex-1 h-1 rounded-full transition-all ${step === 'details' ? 'bg-blue-500' : 'bg-slate-700'}`} />
                        </div>

                        {step === 'company' ? (
                            // Step 1: Select Company
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-300 mb-4">Step 1: Select Transport Company</h3>

                                {!isCustomCompany ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            {POPULAR_COMPANIES.map((company) => (
                                                <button
                                                    key={company.id}
                                                    onClick={() => handleCompanySelect(company.name)}
                                                    className="p-4 border border-white/10 rounded-xl hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left text-white font-bold hover:text-blue-300"
                                                >
                                                    {company.name}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative py-4">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/10" />
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-2 bg-slate-900 text-slate-400">OR</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setIsCustomCompany(true)}
                                            className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-white font-bold flex items-center justify-center gap-2"
                                        >
                                            <FiPlus size={20} /> Create Custom Company
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <label className="block text-slate-300 text-sm font-bold mb-2">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={customCompanyName}
                                            onChange={(e) => setCustomCompanyName(e.target.value)}
                                            placeholder="e.g., Libra, Ogunstate Mass Transit, Chisco"
                                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleCustomCompany}
                                            className="w-full p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                                        >
                                            Proceed with "{customCompanyName}"
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsCustomCompany(false);
                                                setCustomCompanyName("");
                                            }}
                                            className="w-full p-3 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-xl transition-all"
                                        >
                                            Back to Popular Companies
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Step 2: Fill Details
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <h3 className="text-lg font-bold text-slate-300 mb-4">
                                    Step 2: Fill Trip Details for <span className="text-blue-400">{selectedCompany}</span>
                                </h3>

                                {/* From City */}
                                <div>
                                    <label className="block text-slate-300 text-sm font-bold mb-2">
                                        From (Origin City)
                                    </label>
                                    <select
                                        name="from"
                                        value={formData.from}
                                        onChange={handleInputChange}
                                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Select city...</option>
                                        {NIGERIAN_CITIES.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* To City */}
                                <div>
                                    <label className="block text-slate-300 text-sm font-bold mb-2">
                                        To (Destination City)
                                    </label>
                                    <select
                                        name="to"
                                        value={formData.to}
                                        onChange={handleInputChange}
                                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Select city...</option>
                                        {NIGERIAN_CITIES.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Time */}
                                <div>
                                    <label className="block text-slate-300 text-sm font-bold mb-2">
                                        Departure Time
                                    </label>
                                    <input
                                        type="time"
                                        name="time"
                                        value={formData.time}
                                        onChange={handleInputChange}
                                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-slate-300 text-sm font-bold mb-2">
                                        Fare Amount (₦)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₦</span>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 77000"
                                            min="1"
                                            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                                        />
                                    </div>
                                </div>

                                {/* Discount */}
                                <div>
                                    <label className="block text-slate-300 text-sm font-bold mb-2">
                                        Promo Discount (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="discount"
                                            value={formData.discount}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 5"
                                            min="0"
                                            max="100"
                                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                                    </div>
                                </div>

                                {/* Book Now URL */}
                                <div>
                                    <label className="block text-slate-300 text-sm font-bold mb-2">
                                        Book Now URL
                                    </label>
                                    <input
                                        type="url"
                                        name="bookNowUrl"
                                        value={formData.bookNowUrl}
                                        onChange={handleInputChange}
                                        placeholder="https://example.com/book"
                                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 placeholder-slate-600 text-sm"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('company');
                                            setIsCustomCompany(false);
                                        }}
                                        className="flex-1 p-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <FiSave size={18} /> {loading ? 'Creating...' : 'Create Card'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
