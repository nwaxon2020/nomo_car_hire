"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, onSnapshot, query, orderBy, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';
import { FiSave, FiPlus, FiTrash2, FiShield, FiX, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function PolicyEditor() {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Stream data from DB - Ordered by 'order' ascending
    useEffect(() => {
        const q = query(collection(db, "site_policies"), orderBy("order", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    const savePolicies = async () => {
        const batch = writeBatch(db);
        sections.forEach((sec, index) => {
            const ref = doc(db, "site_policies", sec.id);
            batch.update(ref, { 
                title: sec.title, 
                content: sec.content, 
                isList: sec.isList,
                order: index // Re-syncs order based on current array position
            });
        });

        try {
            await batch.commit();
            toast.success("All changes saved to database");
        } catch (e) {
            console.error(e);
            toast.error("Failed to sync with database");
        }
    };

    const addNewSection = async () => {
        try {
            // Find the lowest current order and subtract 1 to put it at the top
            const topOrder = sections.length > 0 ? sections[0].order - 1 : 0;
            
            await addDoc(collection(db, "site_policies"), {
                title: "New Policy Section",
                content: "Enter content here...",
                isList: false,
                order: topOrder
            });
            toast.success("New section added to top");
        } catch (e) {
            toast.error("Could not add section");
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, "site_policies", deleteId));
            setDeleteId(null);
            toast.success("Section removed");
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading Policy Data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-2 md:p-8 relative">
            
            {/* DELETE OVERLAY */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white md:rounded-xl p-6 max-w-sm w-full shadow-2xl border border-red-100">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <FiAlertTriangle size={24} />
                            <h3 className="font-bold text-lg">Confirm Delete</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-6">
                            Are you sure you want to remove this section? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto bg-white md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row gap-2 justify-between items-center mb-8 pb-4 border-b">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FiShield className="text-blue-600" /> Policy Manager
                        </h1>
                        <p className="text-sm text-gray-500">New sections appear at the top</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={addNewSection}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-0.5 md:gap-2 transition"
                        >
                            <FiPlus /> New Section
                        </button>
                        <button 
                            onClick={savePolicies} 
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-0.5 md:gap-2 shadow-md shadow-blue-100 transition"
                        >
                            <FiSave /> Save All Changes
                        </button>
                    </div>
                </div>

                {/* CONTENT LIST */}
                <div className="space-y-6">
                    {sections.length === 0 && (
                        <div className="text-center py-10 text-gray-400 italic">No policy sections found. Click "New Section" to start.</div>
                    )}
                    
                    {sections.map((sec, index) => (
                        <div key={sec.id} className="p-5 border rounded-xl bg-white hover:border-blue-200 transition-colors relative group shadow-sm">
                            {/* Trigger Delete Overlay */}
                            <button 
                                onClick={() => setDeleteId(sec.id)} 
                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <FiTrash2 size={18} />
                            </button>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Section Title</label>
                                    <input 
                                        className="w-full mt-1 p-2 font-bold text-blue-900 border-b border-transparent focus:border-blue-500 outline-none bg-transparent" 
                                        value={sec.title} 
                                        onChange={(e) => {
                                            const n = [...sections]; 
                                            n[index].title = e.target.value; 
                                            setSections(n);
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Content Body</label>
                                    <textarea 
                                        className="w-full mt-1 p-3 text-sm border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                        rows={4}
                                        value={sec.content}
                                        onChange={(e) => {
                                            const n = [...sections]; 
                                            n[index].content = e.target.value; 
                                            setSections(n);
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox" 
                                        id={`list-${sec.id}`}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={sec.isList} 
                                        onChange={(e) => {
                                            const n = [...sections]; 
                                            n[index].isList = e.target.checked; 
                                            setSections(n);
                                        }} 
                                    />
                                    <label htmlFor={`list-${sec.id}`} className="text-xs font-medium text-gray-600 cursor-pointer">
                                        Use Bullet Points <span className="text-gray-400 font-normal">(separate items with commas)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}