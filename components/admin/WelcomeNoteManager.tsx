"use client";
import { useState, useEffect, } from "react";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Save, Sparkles, AlertCircle } from "lucide-react";

export default function WelcomeNoteSection() {
    const [welcomeNote, setWelcomeNote] = useState({ title: "", message: "", link: "", actionLabel: "", message2: "", link2: "", actionLabel2: "" });
    const [savedNote, setSavedNote] = useState({ title: "", message: "", link: "", actionLabel: "", message2: "", link2: "", actionLabel2: "" });
    const [isSavingWelcome, setIsSavingWelcome] = useState(false);

    // Check if current state matches the last saved state
    const isDirty = JSON.stringify(welcomeNote) !== JSON.stringify(savedNote);

    useEffect(() => {
        const fetchWelcomeNote = async () => {
            const docRef = doc(db, "settings", "notifications");
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data().welcomeNote) {
                const data = {
                    title: snap.data().welcomeNote.title || "",
                    message: snap.data().welcomeNote.message || "",
                    link: snap.data().welcomeNote.link || "",
                    actionLabel: snap.data().welcomeNote.actionLabel || "",
                    message2: snap.data().welcomeNote.message2 || "",
                    link2: snap.data().welcomeNote.link2 || "",
                    actionLabel2: snap.data().welcomeNote.actionLabel2 || "",
                };
                setWelcomeNote(data);
                setSavedNote(data); // Store initial copy for comparison
            }
        };
        fetchWelcomeNote();
    }, []);

    const handleWelcomeChange = (updates: any) => {
        setWelcomeNote(prev => ({ ...prev, ...updates }));
    };

    const saveWelcomeNote = async () => {
        if (!welcomeNote.title || !welcomeNote.message) return toast.error("Welcome title and message required");
        setIsSavingWelcome(true);
        try {
            const dataToSave = { ...welcomeNote, updatedAt: new Date().toISOString() };
            await setDoc(doc(db, "settings", "notifications"), {
                welcomeNote: dataToSave
            }, { merge: true });

            setSavedNote(welcomeNote); // Update reference to new saved state
            toast.success("Welcome Note updated successfully!");
        } catch (e) {
            toast.error("Failed to save welcome note");
        } finally {
            setIsSavingWelcome(false);
        }
    };

    const discardChanges = () => {
        setWelcomeNote(savedNote); // Revert to last saved state
    };

    return (
        <section className="space-y-6 relative">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                        <Sparkles className="text-amber-500" size={24} /> Welcome <span className="text-amber-500">Note</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sent on registration</p>
                        {isDirty && (
                            <div className="flex items-center gap-2">
                                <span className="bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                                    <AlertCircle size={10} /> UNSAVED CHANGES
                                </span>
                                <button
                                    onClick={discardChanges}
                                    className="text-[8px] font-black text-red-500 uppercase hover:underline"
                                >
                                    Discard Edits
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={saveWelcomeNote}
                    disabled={isSavingWelcome || !isDirty}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isDirty
                        ? "bg-amber-500 text-white shadow-lg scale-105"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                >
                    <Save size={16} /> {isSavingWelcome ? "Saving..." : "Save Welcome Note"}
                </button>
            </div>

            <div className={`bg-amber-50/50 rounded-xl p-4 md:p-8 border transition-all duration-300 ${isDirty ? 'border-amber-300 ring-4 ring-amber-50' : 'border-amber-100'}`}>
                <div className="space-y-4">
                    <input
                        className="w-full p-4 bg-white border border-amber-100 rounded-2xl font-bold uppercase text-sm outline-amber-200"
                        placeholder="Welcome Message Title"
                        value={welcomeNote.title}
                        onChange={e => handleWelcomeChange({ title: e.target.value })}
                    />
                    <textarea
                        className="w-full p-4 bg-white border border-amber-100 rounded-2xl h-28 text-sm outline-amber-200"
                        placeholder="Message content..."
                        value={welcomeNote.message}
                        onChange={e => handleWelcomeChange({ message: e.target.value })}
                    />
                    
                    {/* First Action Button */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            className="w-full p-4 bg-white border border-amber-100 rounded-2xl text-xs outline-amber-200"
                            placeholder="First Action Link (e.g., /car-hire)"
                            value={welcomeNote.link}
                            onChange={e => handleWelcomeChange({ link: e.target.value })}
                        />
                        <input
                            className="w-full p-4 bg-white border border-amber-100 rounded-2xl text-xs font-bold uppercase outline-amber-200"
                            placeholder="First Button Text (e.g., Book Our Services)"
                            value={welcomeNote.actionLabel}
                            onChange={e => handleWelcomeChange({ actionLabel: e.target.value })}
                        />
                    </div>

                    {/* Second Message/Content */}
                    <textarea
                        className="w-full p-4 bg-white border border-amber-100 rounded-2xl h-20 text-sm outline-amber-200"
                        placeholder="Second message content (optional)"
                        value={welcomeNote.message2}
                        onChange={e => handleWelcomeChange({ message2: e.target.value })}
                    />

                    {/* Second Action Button */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            className="w-full p-4 bg-white border border-amber-100 rounded-2xl text-xs outline-amber-200"
                            placeholder="Second Action Link (e.g., /join-us)"
                            value={welcomeNote.link2}
                            onChange={e => handleWelcomeChange({ link2: e.target.value })}
                        />
                        <input
                            className="w-full p-4 bg-white border border-amber-100 rounded-2xl text-xs font-bold uppercase outline-amber-200"
                            placeholder="Second Button Text (e.g., Become A Driver)"
                            value={welcomeNote.actionLabel2}
                            onChange={e => handleWelcomeChange({ actionLabel2: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}