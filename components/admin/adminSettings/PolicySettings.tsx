"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, onSnapshot, query, orderBy, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';
import { FiSave, FiPlus, FiTrash2, FiShield, FiX, FiAlertTriangle, FiList, FiFileText, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function PolicyEditor() {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
        setSaving(true);
        const batch = writeBatch(db);
        sections.forEach((sec, index) => {
            const ref = doc(db, "site_policies", sec.id);
            batch.update(ref, {
                title: sec.title,
                content: sec.content,
                isList: sec.isList,
                order: index
            });
        });

        try {
            await batch.commit();
            toast.success("All changes saved successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const addNewSection = async () => {
        try {
            const topOrder = sections.length > 0 ? sections[0].order - 1 : 0;

            await addDoc(collection(db, "site_policies"), {
                title: "New Policy Section",
                content: "Enter content here...",
                isList: false,
                order: topOrder
            });
            toast.success("New section added");
        } catch (e) {
            toast.error("Could not add section");
        }
    };

    const moveSection = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sections.length) return;

        const newSections = [...sections];
        [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
        setSections(newSections);

        // Auto-save after reorder
        const batch = writeBatch(db);
        newSections.forEach((sec, idx) => {
            const ref = doc(db, "site_policies", sec.id);
            batch.update(ref, { order: idx });
        });
        await batch.commit();
        toast.success("Section reordered");
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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading Policy Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-10">
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <FiAlertTriangle className="text-red-600 text-3xl" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Section?</h3>
                                <p className="text-gray-500 text-sm">This action cannot be undone. Are you sure?</p>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setDeleteId(null)}
                                        className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-5">
                    <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                                <FiShield className="text-white text-xl md:text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900">Policy <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Manager</span></h1>
                                <p className="text-xs text-gray-500 mt-0.5">Manage your site policies and terms</p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={addNewSection}
                                className="flex-1 md:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 md:px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <FiPlus size={16} /> New Section
                            </button>
                            <button
                                onClick={savePolicies}
                                disabled={saving}
                                className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 md:px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiSave size={16} />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px- py-6 md:px-6 md:py-8">
                <div className="space-y-4">
                    {sections.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
                            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FiFileText className="text-gray-400 text-3xl" />
                            </div>
                            <p className="text-gray-500 font-medium">No policy sections found</p>
                            <p className="text-sm text-gray-400 mt-1">Click "New Section" to get started</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {sections.map((sec, index) => (
                            <motion.div
                                key={sec.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden"
                            >
                                {/* Section Header */}
                                <div
                                    className="flex items-center justify-between p-4 md:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                                            <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                                        </div>
                                        <input
                                            className="font-bold text-gray-800 text-base md:text-lg bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition-all px-2 py-1 flex-1"
                                            value={sec.title}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const n = [...sections];
                                                n[index].title = e.target.value;
                                                setSections(n);
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Reorder Buttons */}
                                        <div className="hidden md:flex items-center gap-1">
                                            {index > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <FiArrowUp size={16} />
                                                </button>
                                            )}
                                            {index < sections.length - 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <FiArrowDown size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(sec.id); }}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                        <div className="text-gray-400">
                                            {expandedSection === sec.id ? (
                                                <FiX size={20} />
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Content */}
                                <AnimatePresence>
                                    {expandedSection === sec.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t border-gray-100"
                                        >
                                            <div className="p-4 md:p-5 space-y-4">
                                                {/* Content Body */}
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                                                        <FiFileText size={12} />
                                                        Content Body
                                                    </label>
                                                    <textarea
                                                        className="w-full p-4 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 outline-none transition-all min-h-[150px]"
                                                        rows={5}
                                                        value={sec.content}
                                                        onChange={(e) => {
                                                            const n = [...sections];
                                                            n[index].content = e.target.value;
                                                            setSections(n);
                                                        }}
                                                        placeholder="Enter policy content here..."
                                                    />
                                                </div>

                                                {/* Bullet Points Toggle */}
                                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                                                    <input
                                                        type="checkbox"
                                                        id={`list-${sec.id}`}
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={sec.isList}
                                                        onChange={(e) => {
                                                            const n = [...sections];
                                                            n[index].isList = e.target.checked;
                                                            setSections(n);
                                                        }}
                                                    />
                                                    <label htmlFor={`list-${sec.id}`} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                                        <FiList size={16} className="text-blue-500" />
                                                        Use Bullet Points Format
                                                    </label>
                                                    {sec.isList && (
                                                        <span className="text-xs text-gray-400 ml-auto">
                                                            Separate items with commas
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Preview when using bullet points */}
                                                {sec.isList && sec.content && (
                                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Preview</p>
                                                        <ul className="space-y-1">
                                                            {sec.content.split(',').map((item: string, i: number) => (
                                                                item.trim() && (
                                                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                                        <span className="text-blue-500 mt-1">•</span>
                                                                        <span>{item.trim()}</span>
                                                                    </li>
                                                                )
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer Stats */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs text-gray-500">Auto-save ready</span>
                            </div>
                            <div className="text-xs text-gray-400">
                                {sections.length} {sections.length === 1 ? 'section' : 'sections'} total
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <FiShield size={12} />
                            Changes are saved to database on "Save Changes"
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}