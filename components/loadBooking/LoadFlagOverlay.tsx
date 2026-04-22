"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaFlag, FaTimes, FaShieldAlt, FaClock, FaExclamationCircle } from "react-icons/fa";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";

interface LoadFlagOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  seatNumber?: number;
  targetUser: {
    uid: string;
    fullName: string;
    type: "driver" | "customer";
  };
  reporterUser: {
    uid: string;
    fullName: string;
  };
}

const DRIVER_REASONS = [
  "Reckless/dangerous driving",
  "Vehicle not as described",
  "Overcharged fare",
  "Arrived very late / no-show",
  "Unprofessional behavior",
  "Took wrong route",
  "Harassment or threatening",
  "Unsafe meeting location",
  "Security concern",
];

const CUSTOMER_REASONS = [
  "Customer was very late",
  "Customer was a no-show",
  "Rude or disrespectful",
  "Unsafe pickup location demand",
  "Fraudulent booking",
  "Harassment",
  "Damaged vehicle property",
  "Refused to pay fare",
];

export default function LoadFlagOverlay({
  isOpen,
  onClose,
  bookingId,
  seatNumber,
  targetUser,
  reporterUser,
}: LoadFlagOverlayProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = targetUser.type === "driver" ? DRIVER_REASONS : CUSTOMER_REASONS;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please select or enter a reason");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "complains"), {
        targetUid: targetUser.uid,
        targetName: targetUser.fullName,
        targetType: targetUser.type,
        reporterUid: reporterUser.uid,
        reporterName: reporterUser.fullName,
        reportedBy: targetUser.type === "driver" ? "customer" : "driver",
        reason: reason + (details ? ` — ${details}` : ""),
        bookingId,
        seatNumber: seatNumber ?? null,
        source: "load_booking",
        createdAt: serverTimestamp(),
        status: "pending",
      });

      toast.success("Report submitted successfully");
      setReason("");
      setDetails("");
      onClose();
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-rose-700 p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FaFlag className="text-white" />
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm text-white">
                Flag {targetUser.type === "driver" ? "Driver" : "Customer"}
              </h3>
              {seatNumber && (
                <p className="text-red-200 text-[9px] font-bold uppercase tracking-wider">
                  Seat #{seatNumber}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <FaTimes className="text-white" size={12} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Target info */}
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
            <FaExclamationCircle className="text-red-400 shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Reporting</p>
              <p className="text-white font-bold text-sm">{targetUser.fullName}</p>
            </div>
          </div>

          {/* Quick reasons */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
              Select a Reason
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left text-[10px] font-bold py-2 px-2.5 rounded-lg border transition-all leading-tight ${
                    reason === r
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Extra details */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block flex items-center gap-1">
              <FaClock size={8} /> Additional Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full h-20 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-red-500 outline-none resize-none placeholder-gray-600"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FaShieldAlt size={10} /> Submit
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
