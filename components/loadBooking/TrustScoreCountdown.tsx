"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaShieldAlt } from "react-icons/fa";

interface TrustScoreCountdownProps {
  previousScore: number;   // e.g. 60
  newScore: number;         // e.g. 40
  onComplete?: () => void;
}

export default function TrustScoreCountdown({
  previousScore,
  newScore,
  onComplete,
}: TrustScoreCountdownProps) {
  const [displayedScore, setDisplayedScore] = useState(previousScore);
  const [phase, setPhase] = useState<"counting" | "done">("counting");

  useEffect(() => {
    let current = previousScore;
    const step = previousScore > newScore ? -1 : 1;
    const interval = setInterval(() => {
      current += step;
      setDisplayedScore(current);
      if (current === newScore) {
        clearInterval(interval);
        setPhase("done");
        setTimeout(() => {
          onComplete?.();
        }, 2500);
      }
    }, 40); // ~40ms per point = smooth ~0.8s for 20% drop

    return () => clearInterval(interval);
  }, [previousScore, newScore, onComplete]);

  const getColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-yellow-500 to-amber-600";
    if (score >= 40) return "from-orange-500 to-orange-600";
    if (score >= 20) return "from-red-500 to-red-600";
    return "from-red-700 to-rose-800";
  };

  const getRing = (score: number) => {
    if (score >= 80) return "border-green-500/60 shadow-green-500/30";
    if (score >= 60) return "border-yellow-500/60 shadow-yellow-500/30";
    if (score >= 40) return "border-orange-500/60 shadow-orange-500/30";
    if (score >= 20) return "border-red-500/60 shadow-red-500/30";
    return "border-red-700/60 shadow-red-700/30";
  };

  const getMessage = (score: number) => {
    if (score === 0) return "Trust Exhausted — Limited Access";
    if (score <= 20) return "Critical Trust Level";
    if (score <= 40) return "Trust Low — Be Careful";
    if (score <= 60) return "Trust Reduced";
    return "Trust Updated";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          className="bg-gray-950 rounded-2xl p-6 text-center max-w-xs w-full border border-white/10 shadow-2xl"
          animate={phase === "done" ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {/* Icon */}
          <div className="w-12 h-12 bg-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaShieldAlt className="text-red-400" size={20} />
          </div>

          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
            Trust Score Update
          </p>
          <p className="text-[11px] font-bold text-gray-400 mb-4">
            Booking cancelled 3 times — score reduced by 20%
          </p>

          {/* Big score circle */}
          <div
            className={`w-28 h-28 rounded-full border-4 shadow-lg mx-auto flex items-center justify-center ${getRing(displayedScore)}`}
          >
            <div
              className={`w-full h-full rounded-full bg-gradient-to-br ${getColor(displayedScore)} flex items-center justify-center`}
            >
              <span className="text-3xl font-black text-white tabular-nums">
                {displayedScore}%
              </span>
            </div>
          </div>

          {/* Status message */}
          <motion.p
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-[10px] font-black uppercase tracking-widest text-white"
          >
            {getMessage(displayedScore)}
          </motion.p>

          {newScore === 0 && phase === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2 bg-red-600/20 border border-red-500/30 rounded-lg"
            >
              <p className="text-[9px] font-bold text-red-400">
                You cannot book again today. Resets 1st of next month.
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
