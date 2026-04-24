"use client";

import { motion } from "framer-motion";
import { FiCheckCircle } from "react-icons/fi";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export default function SuccessModal({ isOpen, onClose, title, message, buttonText = "Continue" }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
        
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
          <FiCheckCircle size={48} />
        </div>

        <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">{message}</p>

        <button
          onClick={onClose}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl active:scale-95"
        >
          {buttonText}
        </button>
      </motion.div>
    </div>
  );
}
