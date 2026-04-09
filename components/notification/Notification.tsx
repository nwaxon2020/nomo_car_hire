"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { onSnapshot, doc, updateDoc } from "firebase/firestore";
import { X, Star, Trash2, CheckCircle, BellOff, Check, Info, ArrowRight, Mail } from "lucide-react";
import { toast } from "react-hot-toast";

const AUTO_DELETE_MONTHS = 6;

export default function NotificationPanel({ onClose, onUnreadUpdate }: any) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [filter, setFilter] = useState<"all" | "fav">("all");
    const [confirmClear, setConfirmClear] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsub = onSnapshot(doc(db, "users", user.uid), async (snap) => {
            if (snap.exists()) {
                const userData = snap.data();
                const allNotifs = userData.notifications || [];

                const cutoffDate = new Date();
                cutoffDate.setMonth(cutoffDate.getMonth() - AUTO_DELETE_MONTHS);

                const validNotifs = allNotifs.filter((n: any) => {
                    const notifDate = new Date(n.timestamp);
                    return notifDate >= cutoffDate;
                });

                if (validNotifs.length !== allNotifs.length) {
                    try {
                        await updateDoc(doc(db, "users", user.uid), {
                            notifications: validNotifs
                        });
                    } catch (e) {
                        console.error("Auto-sync failed", e);
                    }
                }

                const sortedNotifs = [...validNotifs].sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                setNotifications(sortedNotifs);
                const unread = sortedNotifs.filter((n: any) => !n.read).length;
                onUnreadUpdate(unread);
            }
        });

        return () => unsub();
    }, [onUnreadUpdate]);

    // SILENT CLEANUP: Runs when notifications are loaded to remove messages > 3 months old
    useEffect(() => {
        if (notifications.length > 0) {
            syncAndCleanupNotifications(false);
        }
    }, [notifications.length]);

    const syncAndCleanupNotifications = async (forceMarkRead = false) => {
        const user = auth.currentUser;
        if (!user || notifications.length === 0) return;

        // 1. Define the 3-month cutoff
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        let changed = false;

        // 2. Process the array: Filter out old (non-warning) and optionally Mark Read
        const processedNotifs = notifications.filter(n => {
            const notifDate = n.timestamp?.toDate ? n.timestamp.toDate() : new Date(n.timestamp);
            const isExpired = notifDate < threeMonthsAgo;
            const isWarning = n.type === "warning";

            // DELETE if it's old AND not a warning
            if (isExpired && !isWarning) {
                changed = true;
                return false;
            }
            return true;
        }).map(n => {
            // MARK AS READ if forceMarkRead is triggered
            if (forceMarkRead && !n.read) {
                changed = true;
                return { ...n, read: true };
            }
            return n;
        });

        // 3. Only update if something changed
        if (changed) {
            try {
                await updateDoc(doc(db, "users", user.uid), {
                    notifications: processedNotifs
                });

                if (forceMarkRead) {
                    toast.success("All caught up!");
                }
            } catch (error) {
                console.error("Sync Error:", error);
                if (forceMarkRead) toast.error("Update failed");
            }
        }
    };

    const toggleRead = async (notifId: string) => {
        const user = auth.currentUser;
        if (!user) return;
        const updatedNotifs = notifications.map(n => n.id === notifId ? { ...n, read: !n.read } : n);
        try {
            await updateDoc(doc(db, "users", user.uid), { notifications: updatedNotifs });
        } catch (error) {
            toast.error("Failed to update");
        }
    };

    const toggleFav = async (notifId: string) => {
        const user = auth.currentUser;
        if (!user) return;
        const updatedNotifs = notifications.map(n => n.id === notifId ? { ...n, favorite: !n.favorite } : n);
        try {
            await updateDoc(doc(db, "users", user.uid), { notifications: updatedNotifs });
        } catch (error) {
            toast.error("Failed to save favorite");
        }
    };

    const deleteNotification = async (notifId: string) => {
        const user = auth.currentUser;
        if (!user) return;
        const filteredNotifs = notifications.filter(n => n.id !== notifId);
        try {
            await updateDoc(doc(db, "users", user.uid), { notifications: filteredNotifs });
            toast.success("Removed");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const clearAll = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid), { notifications: [] });
            setConfirmClear(false);
            toast.success("Inbox cleared");
        } catch (error) {
            toast.error("Failed to clear inbox");
        }
    };

    const displayed = filter === "fav" ? notifications.filter(n => n.favorite) : notifications;

    return (
        <div className="flex flex-col h-full text-slate-800 bg-white shadow-2xl font-sans">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-end bg-white">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Activity</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Notification Center</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200">
                    <X size={22} className="text-slate-600" />
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => setFilter("all")} className={`px-5 py-2 rounded-xl text-[11px] font-black tracking-wider transition-all ${filter === "all" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>ALL</button>
                <button onClick={() => setFilter("fav")} className={`px-5 py-2 rounded-xl text-[11px] font-black tracking-wider transition-all ${filter === "fav" ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>MY FAVORITES</button>

                {/* Updated Button to call the sync function */}
                <button onClick={() => syncAndCleanupNotifications(true)} className="px-3 py-2 rounded-xl text-[10px] font-black tracking-wider bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-1 border border-blue-100">
                    <Check size={14} />
                    READ ALL
                </button>

                <button onClick={() => setConfirmClear(true)} className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors group" title="Clear all">
                    <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                <div className="mb-2 flex items-center gap-2 p-3 bg-blue-50/50 border-b border-blue-100">
                    <Info size={14} className="text-blue-500" />
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">
                        Note: Messages are automatically cleared after 3 months (warnings excluded).
                    </p>
                </div>

                <div className="p-4 pb-20 space-y-4">
                    {displayed.length === 0 && (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <BellOff size={28} className="opacity-40" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em]">Your inbox is empty</p>
                        </div>
                    )}

                    {displayed.map((n) => {
                        const isRead = n.read;
                        const isFav = n.favorite;
                        const isWarning = n.type === "warning";

                        return (
                            <div
                                key={n.id}
                                className={`group relative border rounded-[28px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 
                                ${isWarning
                                        ? "bg-red-600 border-red-700 text-white"
                                        : !isRead
                                            ? "bg-blue-50/20 border-slate-200 ring-1 ring-blue-600/10"
                                            : "bg-white border-slate-200 text-slate-800"
                                    }`}
                            >
                                {!isRead && !isWarning && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />}

                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`font-extrabold text-sm uppercase leading-tight pr-6 
                                            ${isWarning ? "text-white" : !isRead ? "text-blue-900" : "text-slate-800"}`}>
                                            {n.title}
                                        </h3>
                                        <button onClick={() => toggleFav(n.id)} className="transform active:scale-125 transition-transform shrink-0">
                                            <Star size={18} className={isFav ? "fill-amber-400 text-amber-400" : isWarning ? "text-red-300" : "text-slate-200"} />
                                        </button>
                                    </div>

                                    <p className={`text-[13px] font-medium mb-2 leading-relaxed ${isWarning ? "text-red-50" : "text-slate-500"}`}>
                                        {n.message}
                                    </p>

                                    {n.image && (
                                        <div className="relative w-full h-48 mb-4 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                                            <img src={n.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="notification" />
                                        </div>
                                    )}

                                    {isWarning && (
                                        <div className="inline-block bg-white/20 px-3 py-1 rounded-full mb-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white">Official Misconduct Notice</p>
                                        </div>
                                    )}

                                    {n.actionUrl && n.actionUrl !== "/" && (
                                        <a
                                            href={n.actionUrl}
                                            className={`flex items-center justify-between w-full p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] mb-2 group/btn
                                            ${isWarning
                                                    ? "bg-white text-red-600 hover:bg-red-50"
                                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                                                }`}
                                        >
                                            {n.actionLabel || "View Details"}
                                            {n.actionUrl.startsWith('mailto:') ? (
                                                <Mail size={16} />
                                            ) : (
                                                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                            )}
                                        </a>
                                    )}

                                    {n.message2 && (
                                        <p className={`text-[13px] font-medium mb-4 leading-relaxed border-t pt-2 italic 
                                        ${isWarning ? "text-red-100 border-white/10" : "text-slate-400 border-slate-100"}`}>
                                            {n.message2}
                                        </p>
                                    )}

                                    {n.actionUrl2 && (
                                        <a
                                            href={n.actionUrl2}
                                            className={`flex items-center justify-between w-full p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] mb-4 group/btn2
                                            ${isWarning
                                                    ? "bg-red-800 text-white hover:bg-red-900"
                                                    : "bg-slate-800 text-white hover:bg-slate-900 shadow-lg"
                                                }`}
                                        >
                                            {n.actionLabel2 || "Register as Driver"}
                                            <ArrowRight size={16} className="group-hover/btn2:translate-x-1 transition-transform" />
                                        </a>
                                    )}

                                    <div className={`flex items-center justify-between pt-3 border-t ${isWarning ? "border-white/20" : "border-slate-100"}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${isWarning ? "text-red-100" : "text-slate-400"}`}>
                                            {n.timestamp ? new Date(n.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Recently"}
                                        </span>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleRead(n.id)}
                                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all 
                                            ${isWarning
                                                        ? "bg-white/10 text-white hover:bg-white/20"
                                                        : isRead ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 border border-blue-100"
                                                    }`}
                                            >
                                                <CheckCircle size={14} className={isRead ? "text-green-500" : isWarning ? "text-white/60" : "text-blue-400"} />
                                                {isRead ? "Seen" : "Mark Read"}
                                            </button>
                                            <button onClick={() => deleteNotification(n.id)} className={`p-2 rounded-xl transition-all ${isWarning ? "text-white/40 hover:text-white hover:bg-white/10" : "text-slate-300 hover:text-red-500 hover:bg-red-50"}`}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>

            {/* Clear All Modal */}
            {confirmClear && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase mb-3 tracking-tighter">Purge Inbox?</h3>
                        <p className="text-[14px] text-slate-400 font-medium mb-10 px-2 leading-relaxed">This will permanently delete all notifications.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={clearAll} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all">YES, CLEAR EVERYTHING</button>
                            <button onClick={() => setConfirmClear(false)} className="w-full py-4 text-slate-400 font-black rounded-2xl text-[11px] uppercase hover:bg-slate-50 transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}