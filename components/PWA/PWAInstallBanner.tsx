"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { usePWA } from "./PWAProvider";

const STORAGE_KEY = "nomo_pwa_banner_dismissed";

export default function PWAInstallBanner() {
  const { installApp, installing } = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false);

  useEffect(() => {
    // Check if user permanently dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === "true") {
      setPermanentlyDismissed(true);
      return;
    }

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isInstalled = localStorage.getItem("pwa_installed") === "true";

    if (isStandalone || isInstalled) {
      return;
    }

    // ✅ SHOW BANNER IMMEDIATELY - Don't wait for event!
    // This is what your original did and why it worked everywhere
    setShowBanner(true);

    // Auto-hide after 15 seconds
    const timer = setTimeout(() => {
      setShowBanner(false);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
  };

  const handlePermanentDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setPermanentlyDismissed(true);
    setShowBanner(false);
  };

  if (permanentlyDismissed) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-4 right-4 z-[9999] max-w-sm w-[calc(100vw-2rem)] sm:w-auto"
        >
          <div className="relative bg-gradient-to-br from-[#0d1b35] to-[#091426] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-900/40 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500" />

            <div className="p-4 pr-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Smartphone size={16} className="text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm leading-tight">Install Nomo Cars</p>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                    Add to home screen for faster access & offline support
                  </p>
                </div>
              </div>

              <button
                onClick={installApp}
                disabled={installing}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/30"
              >
                {installing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Installing...
                  </span>
                ) : (
                  <>
                    <Download size={13} />
                    Install App
                  </>
                )}
              </button>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={handleDismiss}
                  className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Remind Later
                </button>
                <button
                  onClick={handlePermanentDismiss}
                  className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Don't Show Again
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white"
              aria-label="Dismiss install prompt"
            >
              <X size={12} />
            </button>

            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 15, ease: "linear" }}
              className="h-[2px] bg-emerald-500/50 origin-left"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}