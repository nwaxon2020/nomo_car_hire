"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaShieldAlt, FaMapMarkerAlt, FaExclamationTriangle, FaUsers, FaEye, FaChevronDown, FaChevronUp } from "react-icons/fa";

interface SafetyNoteCardProps {
  role: "driver" | "customer";
}

const SAFETY_RULES = [
  {
    icon: <FaMapMarkerAlt className="text-amber-400" size={13} />,
    text: "Meet ONLY in well-lit, public locations — motor parks, petrol stations, markets, or busy bus stops.",
  },
  {
    icon: <FaExclamationTriangle className="text-red-400" size={13} />,
    text: "Never meet at unknown, secluded, isolated, or dangerous areas. If unsure, refuse and report.",
  },
  {
    icon: <FaExclamationTriangle className="text-orange-400" size={13} />,
    text: "Drivers: do NOT use your private home or compound as a meeting point.",
  },
  {
    icon: <FaEye className="text-blue-400" size={13} />,
    text: "Always share your trip plan — destination, driver name, and departure time — with someone you trust before boarding.",
  },
  {
    icon: <FaUsers className="text-green-400" size={13} />,
    text: "If any passenger or driver feels unsafe at any point, exit the vehicle and call emergency services immediately.",
  },
  {
    icon: <FaShieldAlt className="text-purple-400" size={13} />,
    text: "Trust & safety ratings are monitored. Repeated violations lead to permanent account suspension.",
  },
];

const DRIVER_EXTRA = {
  icon: <FaMapMarkerAlt className="text-cyan-400" size={13} />,
  text: "Your current GPS location will be visible to customers. Ensure you are in a safe, public meeting spot before going live.",
};

const CUSTOMER_EXTRA = {
  icon: <FaShieldAlt className="text-pink-400" size={13} />,
  text: "Your Trust Score is visible to your driver. Cancelling bookings repeatedly reduces your score and limits your booking ability.",
};

export default function SafetyNoteCard({ role }: SafetyNoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rules = [...SAFETY_RULES, role === "driver" ? DRIVER_EXTRA : CUSTOMER_EXTRA];
  const displayedRules = expanded ? rules : rules.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-amber-500/20 rounded-xl overflow-hidden mb-4"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600/30 to-orange-600/20 border-b border-amber-500/20 px-4 py-3 flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30">
          <FaShieldAlt className="text-amber-400" size={13} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">Safety Notice</p>
          <p className="text-[10px] text-amber-400/60 font-bold uppercase tracking-wider">
            {role === "driver" ? "For Drivers" : "For Passengers"}
          </p>
        </div>
        <div className="ml-auto">
          <span className="bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
            Important
          </span>
        </div>
      </div>

      {/* Rules */}
      <div className="p-4 space-y-3">
        {displayedRules.map((rule, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{rule.icon}</div>
            <p className="text-xs text-gray-300 font-medium leading-relaxed">{rule.text}</p>
          </div>
        ))}
        
        {rules.length > 3 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 rounded-lg border border-amber-500/20"
          >
            {expanded ? (
              <>Show Less <FaChevronUp size={10} /></>
            ) : (
              <>Show More ({rules.length - 3}) <FaChevronDown size={10} /></>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
