"use client";
import { useState, useRef, useEffect } from "react";
import { db, storage, auth } from "@/lib/firebaseConfig";
import Link from "next/link";
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { Send, Users, User, ShieldCheck, Image as ImageIcon, X, Eye, EyeOff, ArrowRight, } from "lucide-react";
import { FiNavigation } from "react-icons/fi";
import { triggerNotification } from "@/lib/notifications";
import WelcomeNoteSection from "@/components/admin/WelcomeNoteManager";

export default function AdminBroadcast() {
    const [formData, setFormData] = useState({ title: "", message: "", link: "", actionLabel: "", image: "" });
    const [customIds, setCustomIds] = useState<string[]>([""]);
    const [showCustom, setShowCustom] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [youtubeVideoUrl, setYoutubeVideoUrl] = useState("");
    const [videoSaving, setVideoSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adminName = auth.currentUser?.displayName?.split(" ")[0] || "Admin";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    useEffect(() => {
        const loadHelpVideoUrl = async () => {
            try {
                const configSnap = await getDoc(doc(db, "site_configs", "general"));
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    setYoutubeVideoUrl(data.helpVideoUrl || "");
                }
            } catch (error) {
                console.error("Failed to load tutorial video url:", error);
            }
        };
        loadHelpVideoUrl();
    }, []);

    const saveYoutubeVideoUrl = async () => {
        if (!youtubeVideoUrl.trim()) {
            return toast.error("Please enter a YouTube video URL");
        }

        setVideoSaving(true);
        try {
            await setDoc(doc(db, "site_configs", "general"), { helpVideoUrl: youtubeVideoUrl.trim() }, { merge: true });
            toast.success("Tutorial video URL saved");
        } catch (error) {
            console.error("Failed to save tutorial video url:", error);
            toast.error("Could not save tutorial video URL");
        } finally {
            setVideoSaving(false);
        }
    };

    const sendNotification = async (target: "all" | "drivers" | "passengers" | "custom") => {
        if (!formData.title || !formData.message) return toast.error("Title and Message are required");
        try {
            let recipientList: { id: string, firstName?: string, fullName?: string }[] = [];
            const loadingToast = toast.loading("Preparing broadcast...");

            if (target === "all") {
                const snap = await getDocs(collection(db, "users"));
                recipientList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } else if (target === "drivers" || target === "passengers") {
                const q = query(collection(db, "users"), where("isDriver", "==", target === "drivers"));
                const snap = await getDocs(q);
                recipientList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } else {
                const ids = customIds.filter(id => id.trim() !== "");
                const customPromises = ids.map(async (id) => {
                    const d = await getDoc(doc(db, "users", id));
                    return d.exists() ? { id, ...d.data() } : { id };
                });
                recipientList = await Promise.all(customPromises);
            }

            if (recipientList.length === 0) {
                toast.dismiss(loadingToast);
                return toast.error("No recipients found");
            }

            let finalImageUrl = formData.image;
            if (imageFile) {
                const storageRef = ref(storage, `broadcasts/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                finalImageUrl = await getDownloadURL(storageRef);
            }

            const promises = recipientList.map(user => {
                let nameToUse = user.firstName?.trim() || user.fullName?.trim().split(" ")[0] || "there";
                const personalizedMessage = formData.message.replace(/\[name\]/gi, nameToUse);
                return triggerNotification(
                    user.id, formData.title, personalizedMessage, "broadcast",
                    formData.link || "/", finalImageUrl, formData.actionLabel || "View More"
                )
            });

            await Promise.all(promises);
            toast.dismiss(loadingToast);
            toast.success(`Broadcast Sent to ${recipientList.length} users!`);
            setFormData({ title: "", message: "", link: "", actionLabel: "", image: "" });
            setImagePreview(null);
            setImageFile(null);
            setShowPreview(false);
        } catch (e) {
            toast.dismiss();
            toast.error("Failed to send broadcast");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-12">
            <section className="space-y-6">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic">
                            Broadcast <span className="text-blue-600">Hub</span>
                        </h1>

                        <div className="flex flex-col md:flex-row md:mr-14 md:justify-between gap-2">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-blue-500" /> Administrative Notification System
                            </p>
                            <button onClick={() => setShowPreview(!showPreview)} className={`w-40 p-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase ${showPreview ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />} {showPreview ? "Close Preview" : "Live Preview"}
                            </button>
                        </div>
                    </div>

                    <Link href="/admin" className="p-3 md:px-10 md:py-2 bg-white rounded-lg md:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <FiNavigation className="text-[#0B2A4A]" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* PREVIEW MOBILE */}
                    <div className="md:hidden">
                        {showPreview && (
                            <div className="p-4 lg:col-span-5 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Eye size={14} className="text-amber-500" /> Recipient View</p>
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xl ring-1 ring-blue-600/10">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                                    <div className="p-5">
                                        <h3 className="font-extrabold text-sm uppercase leading-tight text-blue-900 pr-6 mb-2">{formData.title || "Your Title Here"}</h3>
                                        <p className="text-[13px] text-slate-500 font-medium mb-4 whitespace-pre-wrap">{formData.message.replace(/\[name\]/gi, adminName) || "Your message..."}</p>
                                        {(imagePreview || formData.image) && (
                                            <div className="relative w-full h-40 mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                                                <img src={imagePreview || formData.image} className="w-full h-full object-cover" alt="preview" />
                                            </div>
                                        )}
                                        {formData.link && (
                                            <div className="flex items-center justify-between w-full p-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 mb-4">
                                                {formData.actionLabel || "View Details"} <ArrowRight size={16} />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-tight">Today</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    <div className={`${showPreview ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-xl shadow-xl p-4 md:p-8 border border-gray-100 transition-all duration-500`}>
                        <div className="space-y-4">
                            <input className="w-full p-4 bg-gray-50 border-none rounded md:rounded-2xl font-bold uppercase text-sm outline-blue-100" placeholder="Notification Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />

                            <textarea className="w-full p-4 bg-gray-50 border-none rounded md:rounded-2xl h-32 text-sm outline-blue-100" placeholder="Write your message here..." value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />

                            {/* RESTORED: Image Upload & URL inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded md:rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-100">
                                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                                    <div className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase"><ImageIcon size={18} /> Upload Image</div>
                                </div>
                                <input className="p-4 bg-gray-50 border-none rounded md:rounded-2xl text-xs outline-blue-100" placeholder="OR Paste Image URL" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                            </div>

                            {/* RESTORED: Active Image Preview (Shows while drafting) */}
                            {(imagePreview || formData.image) && (
                                <div className="relative w-full h-40 rounded-2xl overflow-hidden border bg-gray-50 mb-4 animate-in fade-in zoom-in-95">
                                    <img src={imagePreview || formData.image} alt="Draft Preview" className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => { setImagePreview(null); setImageFile(null); setFormData({ ...formData, image: "" }); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input className="w-full p-4 bg-gray-50 border-none rounded md:rounded-2xl text-xs outline-blue-100" placeholder="Action Link (Optional)" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} />
                                <input className="w-full p-4 bg-gray-50 border-none rounded md:rounded-2xl text-xs font-bold uppercase outline-blue-100" placeholder="Button Text" value={formData.actionLabel} onChange={e => setFormData({ ...formData, actionLabel: e.target.value })} />
                            </div>

                            <div className={`grid grid-cols-2 ${showPreview ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-3 mt-8`}>
                                <button onClick={() => sendNotification("all")} className="p-4 bg-black text-white rounded md:rounded-2xl text-[10px] font-black flex flex-col items-center gap-2 uppercase tracking-widest"><Users size={16} /> All Users</button>
                                <button onClick={() => sendNotification("drivers")} className="p-4 bg-green-600 text-white rounded md:rounded-2xl text-[10px] font-black flex flex-col items-center gap-2 uppercase tracking-widest"><ShieldCheck size={16} /> Drivers</button>
                                <button onClick={() => sendNotification("passengers")} className="p-4 bg-amber-500 text-white rounded md:rounded-2xl text-[10px] font-black flex flex-col items-center gap-2 uppercase tracking-widest"><User size={16} /> Passengers</button>
                                <button onClick={() => { if (showCustom) sendNotification("custom"); else setShowCustom(true); }} className={`p-4 rounded md:rounded-2xl text-[10px] font-black flex flex-col items-center gap-2 transition-all uppercase tracking-widest ${showCustom ? 'bg-blue-700 ring-4 ring-blue-100' : 'bg-blue-600'} text-white`}><Send size={16} /> {showCustom ? "Send Now" : "Custom"}</button>
                            </div>
                        </div>
                    </div>

                    {/* PREVIEW DESKTOP */}
                    <div className="hidden md:block md:col-span-5 ">
                        {showPreview && (
                            <div className="p-4 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Eye size={14} className="text-amber-500" /> Recipient View</p>
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xl ring-1 ring-blue-600/10">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                                    <div className="p-5">
                                        <h3 className="font-extrabold text-sm uppercase leading-tight text-blue-900 pr-6 mb-2">{formData.title || "Your Title Here"}</h3>
                                        <p className="text-[13px] text-slate-500 font-medium mb-4 whitespace-pre-wrap">{formData.message.replace(/\[name\]/gi, adminName) || "Your message..."}</p>
                                        {(imagePreview || formData.image) && (
                                            <div className="relative w-full h-40 mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                                                <img src={imagePreview || formData.image} className="w-full h-full object-cover" alt="preview" />
                                            </div>
                                        )}
                                        {formData.link && (
                                            <div className="flex items-center justify-between w-full p-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 mb-4">
                                                {formData.actionLabel || "View Details"} <ArrowRight size={16} />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-tight">Today</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <WelcomeNoteSection />

            <section className="bg-white rounded-xl shadow-xl border border-slate-200 md:p-6 p-4 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Help Center Tutorial</h2>
                        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">This YouTube video will play for customers in the Help Center.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <input
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-blue-100"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeVideoUrl}
                        onChange={e => setYoutubeVideoUrl(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={saveYoutubeVideoUrl}
                            disabled={videoSaving}
                            className="px-5 py-3 bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition disabled:opacity-60"
                        >
                            {videoSaving ? "Saving..." : "Save video URL"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}