"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

const STORAGE_KEY = "nomo_pwa_installed";
const SESSION_DISMISS_KEY = "nomo_pwa_install_dismissed_session";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const alreadyInstalled = localStorage.getItem(STORAGE_KEY);
    if (alreadyInstalled === "true") {
      setIsInstalled(true);
      return;
    }

    // Check if this session already dismissed the install banner
    const dismissedSession = sessionStorage.getItem(SESSION_DISMISS_KEY) === "true";
    if (dismissedSession) {
      setSessionDismissed(true);
      return;
    }

    // Also hide if running as standalone PWA already
    if (window.matchMedia("(display-mode: standalone)").matches) {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsInstalled(true);
      return;
    }

    // Listen for the browser install prompt event
    const handler = (e: Event) => {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "true") return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);

      // Auto-hide after 15 seconds
      setTimeout(() => {
        setShowBanner(false);
      }, 15000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsInstalled(true);
    } else {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
      setSessionDismissed(true);
    }

    setDeferredPrompt(null);
    setShowBanner(false);
    setInstalling(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
    setSessionDismissed(true);
    setShowBanner(false);
  };

  // Don't render anything if already installed, dismissed this session, or not triggered
  if (isInstalled || sessionDismissed || !showBanner) return null;

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
            {/* Glowing accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500" />

            <div className="p-4 pr-10">
              <div className="flex items-center gap-3">
                {/* Icon */}
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

              {/* Install button */}
              <button
                onClick={handleInstall}
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
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white"
              aria-label="Dismiss install prompt"
            >
              <X size={12} />
            </button>

            {/* 15s countdown pulse bar */}
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