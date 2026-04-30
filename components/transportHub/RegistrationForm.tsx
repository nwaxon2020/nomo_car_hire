"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { doc, getDoc, setDoc, Timestamp, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { FiX, FiCheckCircle, FiAlertCircle, FiCamera, FiGlobe, FiMail, FiPhone, FiMapPin, FiUser } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LoadingRound from "@/components/re-useable-loading";
import SuccessModal from "@/components/SuccessModal";

interface RegistrationFormProps {
    onClose: () => void;
    onSuccess: () => void;
    isRenewal?: boolean;
    companyId?: string;
}

export default function RegistrationForm({ onClose, onSuccess, isRenewal = false, companyId: existingCompanyId }: RegistrationFormProps) {
    const [loading, setLoading] = useState(false);
    const [adminConfig, setAdminConfig] = useState<{ transportRegistrationFee?: number; transportRegistrationDuration?: number } | null>(null);
    const [formData, setFormData] = useState({
        companyName: "",
        ceoName: "",
        email: "",
        phone: "",
        websiteUrl: "",
        address: "",
        cars: 0,
        buses: 0,
        luxurious: 0,
        customerServiceEmail: "",
        customerServiceContact: "",
        garageImageUrl: "",
        cacImageUrl: "",
        idImageUrl: "",
    });

    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "garageImageUrl" | "cacImageUrl" | "idImageUrl") => {
        const file = e.target.files?.[0];
        if (!file) return;

        const user = auth.currentUser;
        if (!user) {
            toast.error("Please login to upload files");
            return;
        }

        setUploading(prev => ({ ...prev, [field]: true }));
        try {
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { storage } = await import("@/lib/firebaseConfig");
            
            const storageRef = ref(storage, `transportHub/${user.uid}/${field}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            
            setFormData(prev => ({ ...prev, [field]: downloadUrl }));
            toast.success("File uploaded successfully!");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload file");
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const [showPayment, setShowPayment] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            const snap = await getDoc(doc(db, "adminfinance", "pricing"));
            if (snap.exists()) {
                setAdminConfig(snap.data());
            }
        };
        fetchConfig();
    }, []);

    const registrationFee = adminConfig?.transportRegistrationFee || 20000;

    const totalFleet = Number(formData.cars) + Number(formData.buses) + Number(formData.luxurious);
    const isValidFleet = totalFleet >= 4;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidFleet) {
            toast.error("Total fleet must be at least 4 vehicles!");
            return;
        }
        setShowPayment(true);
    };

    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        import("@/lib/paystack").then((m) => m.loadPaystackScript());
    }, []);

    const handlePayment = async () => {
        const user = auth.currentUser;
        if (!user) {
            toast.error("Please login to register a company");
            return;
        }

        setLoading(true);
        try {
            const { initiatePaystackPayment } = await import("@/lib/paystack");
            
            // For new registration, we'll generate a companyId now or let the webhook do it.
            // But we need to pass a reference to the metadata so the webhook knows which company to update.
            // Since the company doc doesn't exist yet for new registration, we'll create it with 'pending_payment' status.
            
            let companyId = existingCompanyId;
            if (!isRenewal || !companyId) {
                companyId = `${user.uid}_${Date.now()}`;
                
                // Create the pending doc first
                await setDoc(doc(db, "transportCompanies", companyId), {
                    ...formData,
                    id: companyId,
                    ownerId: user.uid,
                    status: "pending_payment",
                    paymentStatus: "unpaid",
                    createdAt: serverTimestamp()
                });
            }

            await initiatePaystackPayment({
                email: user.email || `${user.uid}@nomo.com`,
                amount: registrationFee,
                metadata: {
                    userId: user.uid,
                    type: 'hub',
                    hubId: companyId,
                    isRenewal
                },
                onSuccess: (response: any) => {
                    setLoading(false);
                    setShowPayment(false);
                    setShowSuccess(true);
                    toast.success("Payment successful! Processing registration...");
                },
                onClose: () => {
                    setLoading(false);
                }
            });
        } catch (error) {
            console.error("Paystack Error:", error);
            toast.error("Failed to initiate payment.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center md:p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0f1d36] border border-white/10 md:rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto"
            >
                {!showPayment ? (
                    <form onSubmit={handleSubmit} className="py-15 p-5 md:p-8 space-y-4 md:space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white">{isRenewal ? 'Renew Registration' : 'Register Your Company'}</h2>
                                <p className="text-slate-400 text-xs md:text-sm">{isRenewal ? 'Extend your partnership with Transport Hub.' : 'Join the Transport Hub and grow your reach.'}</p>
                            </div>
                            <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Company Name" icon={<FiGlobe />} value={formData.companyName} onChange={v => setFormData({ ...formData, companyName: v })} required />
                            <InputField label="CEO Full Name" icon={<FiUser />} value={formData.ceoName} onChange={v => setFormData({ ...formData, ceoName: v })} required />
                            <InputField label="Email Address" icon={<FiMail />} type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} required />
                            <InputField label="Phone Number" icon={<FiPhone />} value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} required />
                            <InputField label="Website URL" icon={<FiGlobe />} type="url" value={formData.websiteUrl} onChange={v => setFormData({ ...formData, websiteUrl: v })} required />
                            <FileUploadField 
                                label="Garage Image" 
                                value={formData.garageImageUrl} 
                                uploading={uploading.garageImageUrl} 
                                onChange={(e) => handleFileUpload(e, "garageImageUrl")} 
                                required 
                            />
                            <FileUploadField 
                                label="CAC Document" 
                                value={formData.cacImageUrl} 
                                uploading={uploading.cacImageUrl} 
                                onChange={(e) => handleFileUpload(e, "cacImageUrl")} 
                                required 
                            />
                            <FileUploadField 
                                label="Owner ID" 
                                value={formData.idImageUrl} 
                                uploading={uploading.idImageUrl} 
                                onChange={(e) => handleFileUpload(e, "idImageUrl")} 
                                required 
                            />
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Fleet Information (Min 4 Total)</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <NumberInput label="Cars" value={formData.cars} onChange={v => setFormData({ ...formData, cars: v })} />
                                <NumberInput label="Buses" value={formData.buses} onChange={v => setFormData({ ...formData, buses: v })} />
                                <NumberInput label="Luxurious" value={formData.luxurious} onChange={v => setFormData({ ...formData, luxurious: v })} />
                            </div>
                            <div className={`text-xs font-bold px-3 py-1.5 rounded-full inline-block ${isValidFleet ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                Total Fleet: {totalFleet} / 4
                            </div>
                        </div>

                        <InputField label="Company Address" icon={<FiMapPin />} value={formData.address} onChange={v => setFormData({ ...formData, address: v })} required />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Customer Service Email" icon={<FiMail />} value={formData.customerServiceEmail} onChange={v => setFormData({ ...formData, customerServiceEmail: v })} required />
                            <InputField label="Customer Service Contact" icon={<FiPhone />} value={formData.customerServiceContact} onChange={v => setFormData({ ...formData, customerServiceContact: v })} required />
                        </div>

                        <button
                            type="submit"
                            className="text-sm w-full px-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-[0.98]"
                        >
                            {isRenewal ? 'Proceed to Renew' : 'Continue to Payment'} (₦{registrationFee.toLocaleString()})
                        </button>
                    </form>
                ) : (
                    <div className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                            <FiCheckCircle size={48} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">{isRenewal ? 'Renew Now' : 'Payment Secure'}</h2>
                            <p className="text-slate-400">{isRenewal ? 'Pay the registration fee to reactivate your dashboard.' : 'Complete your registration payment to activate your dashboard.'}</p>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-left">
                            <div className="flex justify-between mb-4">
                                <span className="text-slate-400">Company</span>
                                <span className="text-white font-bold">{formData.companyName}</span>
                            </div>
                            <div className="flex justify-between mb-4 border-t border-white/5 pt-4">
                                <span className="text-slate-400">{isRenewal ? 'Renewal Fee' : 'Fee'}</span>
                                <span className="text-emerald-400 font-black text-2xl">₦{registrationFee.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowPayment(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-widest hover:bg-emerald-400 shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50"
                            >
                                {loading ? "Processing..." : "Pay Now"}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    onSuccess();
                }}
                title="Registration Received"
                message={isRenewal ? "Your registration has been renewed successfully! Your dashboard is now active." : "Payment received! Your company registration is now being processed. You can access your dashboard once approved."}
            />
        </div>
    );
}

interface InputFieldProps {
    label: string;
    icon: React.ReactNode;
    value: string | number;
    onChange: (val: string) => void;
    type?: string;
    required?: boolean;
}

function InputField({ label, icon, type = "text", value, onChange, required = false }: InputFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                    {icon}
                </div>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    placeholder={`Enter ${label.toLowerCase()}`}
                />
            </div>
        </div>
    );
}

interface NumberInputProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
}

function NumberInput({ label, value, onChange }: NumberInputProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block text-center">{label}</label>
            <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 text-center text-white font-bold focus:outline-none focus:border-emerald-500/50"
            />
        </div>
    );
}

interface FileUploadFieldProps {
    label: string;
    value: string;
    uploading: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

function FileUploadField({ label, value, uploading, onChange, required = false }: FileUploadFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <input
                    type="file"
                    accept="image/*"
                    onChange={onChange}
                    required={required && !value}
                    className="hidden"
                    id={`file-${label}`}
                />
                <label
                    htmlFor={`file-${label}`}
                    className={`w-full flex items-center gap-3 bg-slate-900/50 border ${value ? 'border-emerald-500/30' : 'border-white/10'} rounded-xl py-3 px-4 cursor-pointer hover:border-emerald-500/50 transition-all overflow-hidden`}
                >
                    <div className={`${value ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {uploading ? <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> : <FiCamera />}
                    </div>
                    <span className={`text-xs truncate ${value ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {uploading ? 'Uploading...' : value ? 'File Uploaded' : `Upload ${label}`}
                    </span>
                    {value && <FiCheckCircle className="text-emerald-500 ml-auto shrink-0" size={14} />}
                </label>
            </div>
        </div>
    );
}

