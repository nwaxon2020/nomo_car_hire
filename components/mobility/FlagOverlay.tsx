"use client";
import { useState } from "react";
import { FaFlag, FaTimes, FaCommentAlt, FaShieldAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";

interface FlagOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    uid: string;
    fullName: string;
    email?: string;
    phone?: string;
    type: "driver" | "customer";
  };
  reporterUser: {
    uid: string;
    fullName: string;
  };
}

const QUICK_MESSAGES = {
  driver: [
    "Reckless driving",
    "Unprofessional behavior",
    "Vehicle not as described",
    "Harassment",
    "Late arrival",
    "Security concern"
  ],
  customer: [
    "No-show",
    "Rude behavior",
    "Unsafe pickup location",
    "Fraudulent request",
    "Harassment",
    "Damaged property"
  ]
};

export default function FlagOverlay({ isOpen, onClose, targetUser, reporterUser }: FlagOverlayProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "complains"), {
        targetUid: targetUser.uid,
        targetName: targetUser.fullName,
        targetEmail: targetUser.email || "",
        targetPhone: targetUser.phone || "",
        targetType: targetUser.type,
        reporterUid: reporterUser.uid,
        reporterName: reporterUser.fullName,
        reportedBy: targetUser.type === "driver" ? "customer" : "driver",
        reason: reason,
        createdAt: serverTimestamp(),
        status: "pending"
      });

      toast.success("Flag reported successfully");
      setReason("");
      onClose();
    } catch (error) {
      console.error("Error reporting flag:", error);
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const messages = targetUser.type === "driver" ? QUICK_MESSAGES.driver : QUICK_MESSAGES.customer;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <FaFlag className="text-sm" />
            <h3 className="font-black uppercase tracking-widest text-sm">Flag {targetUser.type === "driver" ? "Driver" : "Customer"}</h3>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Target</p>
            <p className="text-white font-bold">{targetUser.fullName}</p>
            <p className="text-[10px] text-gray-500 font-mono mt-1">{targetUser.uid}</p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Quick Reasons</label>
            <div className="grid grid-cols-2 gap-2">
              {messages.map((msg) => (
                <button
                  key={msg}
                  onClick={() => setReason(msg)}
                  className={`text-[10px] font-bold py-2 px-3 rounded-lg border transition-all ${
                    reason === msg 
                      ? "bg-red-600 border-red-600 text-white" 
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400"
                  }`}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Reason Details</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full h-24 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : (
              <>
                <FaShieldAlt /> Submit Report
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
