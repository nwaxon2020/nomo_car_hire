"use client";

import { useState } from "react";
import { Share2, X } from "lucide-react";
import {
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaCopy
} from "react-icons/fa";
import { usePathname } from "next/navigation";

interface ShareButtonProps {
  userId?: string;
  title?: string;
  text?: string;
  children?: React.ReactNode; // This allows us to pass the custom button
}

export default function ShareButton({
  userId = "",
  title = "Get a Free Ride on Nomopoventures!",
  text = "Join me on *NOMO CARS* for amazing rides!",
  children // Destructure children here
}: ShareButtonProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const getShortId = () => {
    if (userId && userId.length >= 8) return userId.slice(-8);
    return "";
  };

  const getReferralUrl = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
    const shortId = getShortId();
    return shortId ? `${baseUrl}/signup?ref=${shortId}` : `${baseUrl}/signup`;
  };

  const referralUrl = getReferralUrl();
  const displayId = getShortId() ? getShortId().toUpperCase() : "NO-ID";
  const shareText = `${text}\n\nUse my referral ID: ${displayId}\n\nSign up here: ${referralUrl}\n\nGet 2 points per referral! 20 points = 1 free ride! 🚗✨`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: referralUrl });
      } catch (error) {
        console.log("Share cancelled", error);
      }
    } else {
      setShowShareOptions(true);
    }
  };

  // ... (Social share functions stay the same)
  const shareToTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareToFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}&quote=${encodeURIComponent(text)}`, "_blank");
  const shareToWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowShareOptions(false); }, 2000);
    } catch (err) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOptions = [
    { name: "WhatsApp", icon: <FaWhatsapp size={18} />, action: shareToWhatsApp },
    { name: "Facebook", icon: <FaFacebook size={18} />, action: shareToFacebook },
    { name: "Twitter", icon: <FaTwitter size={18} />, action: shareToTwitter },
    { name: copied ? "Copied!" : "Copy Link", icon: <FaCopy size={18} />, action: copyToClipboard },
  ];

  return (
    <>
      {/* LOGIC: If children are passed, render them. 
          Otherwise, render the default green/gradient UI.
      */}
      {children ? (
        <div onClick={handleNativeShare} className="w-full cursor-pointer">
          {children}
        </div>
      ) : (
        pathname.startsWith("/user/driver-profile/") ? (
          <button
            onClick={handleNativeShare}
            className="w-full mx-auto flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-sm font-bold rounded-xl shadow-lg hover:from-indigo-700 transition-all duration-300"
          >
            <Share2 size={16} className="animate-pulse" />
            <span>Share Link & Upgrade VIP status</span>
          </button>
        ) : (
          <button
            onClick={handleNativeShare}
            className="mx-auto text-green-500 font-semibold hover:underline flex items-center gap-1"
          >
            <Share2 size={14} />
            Share Link to get Free Ride
          </button>
        )
      )}

      {/* Share Modal Logic */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden">
            {/* ... Modal content stays exactly as you had it ... */}
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Share via</h3>
              <button onClick={() => setShowShareOptions(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-2">
              {shareOptions.map((option) => (
                <button key={option.name} onClick={option.action} className="flex items-center gap-3 p-3 w-full hover:bg-gray-100 rounded-xl transition-colors">
                  <span className="text-purple-600">{option.icon}</span>
                  <span className="text-gray-700 font-medium">{option.name}</span>
                </button>
              ))}
            </div>
            <div className="p-4 bg-gray-50 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Your Code</p>
              <p className="text-lg font-mono font-black text-purple-700">{displayId}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}