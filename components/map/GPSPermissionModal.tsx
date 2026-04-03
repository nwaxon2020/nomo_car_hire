"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  AlertCircle,
  X,
  ExternalLink,
  Check,
  Smartphone,
  Settings,
} from "lucide-react";

interface GPSPermissionModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onRetry: () => void;
  errorType?:
    | "denied"
    | "unavailable"
    | "timeout"
    | "unknown"
    | "notSupported";
}

export default function GPSPermissionModal({
  isOpen,
  onDismiss,
  onRetry,
  errorType = "unknown",
}: GPSPermissionModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onRetry();
    setIsRetrying(false);
  };

  const getErrorContent = () => {
    switch (errorType) {
      case "denied":
        return {
          icon: AlertCircle,
          title: "Location Permission Denied",
          description:
            "You've denied location access. To use location sharing, you need to enable GPS permissions.",
          steps: [
            "1. Open your phone Settings",
            "2. Go to App Permissions or Privacy",
            "3. Find 'Nomo Cars' app",
            "4. Enable 'Location' permission",
            "5. Return to this app and try again",
          ],
          ctaPrimary: "Try Again",
          ctaSecondary: "I'll Enable Later",
        };
      case "notSupported":
        return {
          icon: Smartphone,
          title: "GPS Not Supported",
          description:
            "Your device or browser doesn't support geolocation services.",
          steps: [
            "✓ Make sure WiFi or Mobile Data is enabled",
            "✓ Use a modern browser (Chrome, Safari, Firefox, Edge)",
            "✓ Ensure your device has GPS capabilities",
            "✓ Some devices have GPS disabled - check Settings",
          ],
          ctaPrimary: "Dismiss",
          ctaSecondary: null,
        };
      case "timeout":
        return {
          icon: MapPin,
          title: "GPS Connection Timeout",
          description:
            "It's taking too long to get your location. This usually means:",
          steps: [
            "• GPS signal is weak (move to an open area)",
            "• WiFi/Mobile data is unstable",
            "• Device needs more time to find satellites",
          ],
          ctaPrimary: "Retry",
          ctaSecondary: "Cancel",
        };
      default:
        return {
          icon: AlertCircle,
          title: "Unable to Access Location",
          description:
            "We couldn't get your location. Please check the following:",
          steps: [
            "✓ Location Services are enabled on your device",
            "✓ GPS/Location permission is granted to this app",
            "✓ You have a strong GPS signal (in open area, not indoors)",
            "✓ WiFi or Mobile Data is connected",
          ],
          ctaPrimary: "Retry",
          ctaSecondary: "Cancel",
        };
    }
  };

  const content = getErrorContent();
  const Icon = content.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X size={20} className="text-gray-500" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Icon size={40} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
                {content.title}
              </h2>

              {/* Description */}
              <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
                {content.description}
              </p>

              {/* Steps */}
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
                <div className="space-y-2">
                  {content.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex gap-3 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {step.startsWith("✓") || step.startsWith("•") ? (
                        <span className="text-green-600 dark:text-green-400 font-bold flex-shrink-0 w-5">
                          {step[0]}
                        </span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex-shrink-0 w-5">
                          {step.split(".")[0] + "."}
                        </span>
                      )}
                      <span>
                        {step.replace(/^[✓•\d.]\s*/, "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Primary CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <MapPin size={18} />
                      {content.ctaPrimary}
                    </>
                  )}
                </motion.button>

                {/* Secondary CTA */}
                {content.ctaSecondary && (
                  <button
                    onClick={onDismiss}
                    className="w-full bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-bold py-3 px-4 rounded-lg transition"
                  >
                    {content.ctaSecondary}
                  </button>
                )}

                {/* Help Text */}
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                  {errorType === "denied" && (
                    <>
                      🔒 Your privacy is protected.{" "}
                      <a
                        href="#"
                        className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                      >
                        Learn more
                      </a>
                    </>
                  )}
                  {errorType !== "denied" && (
                    "Your location is only used for tracking and will not be shared."
                  )}
                </p>
              </div>

              {/* Additional Help */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-2">
                    <ExternalLink size={16} />
                    Device-Specific Instructions
                  </summary>
                  <div className="mt-3 space-y-3 text-gray-600 dark:text-gray-400">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        📱 Android:
                      </p>
                      <p className="text-xs">
                        Settings → Apps → Nomo Cars → Permissions → Location
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        🍎 iPhone:
                      </p>
                      <p className="text-xs">
                        Settings → Privacy → Location Services → Nomo Cars
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        💻 Browser:
                      </p>
                      <p className="text-xs">
                        Click the location icon in the address bar → Allow
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
