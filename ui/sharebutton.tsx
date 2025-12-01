// ui/sharebutton.tsx - UPDATED FOR 8-CHAR SYSTEM
"use client";

import { useState } from "react";
import { Share2, X } from "lucide-react";
import { 
  FaWhatsapp, 
  FaFacebook, 
  FaTwitter, 
  FaCopy
} from "react-icons/fa";

interface ShareButtonProps {
  userId?: string; // Changed from referralCode to userId
  title?: string;
  text?: string;
}

export default function ShareButton({ 
  userId = "",
  title = "Get a Free Ride on Nomopoventures!",
  text = "Join me on Nomopoventures for amazing rides!"
}: ShareButtonProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  // ✅ Get last 8 characters of user ID for referral link
  const getShortId = () => {
    if (userId && userId.length >= 8) {
      return userId.slice(-8); // Last 8 characters
    }
    return "";
  };

  // ✅ Create signup link with 8-char short ID
  const getReferralUrl = () => {
    const baseUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : "https://yourdomain.com";
    
    const shortId = getShortId();
    if (shortId) {
      return `${baseUrl}/signup?ref=${shortId}`;
    }
    return `${baseUrl}/signup`;
  };

  const referralUrl = getReferralUrl();
  const shortId = getShortId();
  const displayId = shortId ? shortId.toUpperCase() : "NO-ID";
  
  // ✅ Share text with short ID
  const shareText = `${text}\n\nUse my referral ID: ${displayId}\n\nSign up here: ${referralUrl}\n\nGet 2 points per referral! 10 points = 1 free ride! 🚗✨`;

  // Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: referralUrl,
        });
      } catch (error) {
        console.log("Share cancelled", error);
      }
    } else {
      setShowShareOptions(true);
    }
  };

  // Share functions
  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}&quote=${encodeURIComponent(text)}`, "_blank");
  };

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareOptions(false);
      }, 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareOptions(false);
      }, 2000);
    }
  };

  const shareOptions = [
    { name: "WhatsApp", icon: <FaWhatsapp size={18} />, action: shareToWhatsApp },
    { name: "Facebook", icon: <FaFacebook size={18} />, action: shareToFacebook },
    { name: "Twitter", icon: <FaTwitter size={18} />, action: shareToTwitter },
    { name: copied ? "Copied!" : "Copy Link", icon: <FaCopy size={18} />, action: copyToClipboard },
  ];

  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development' && userId) {
    console.log(`🔗 ShareButton: User ID: ${userId}, Short ID: ${shortId}, URL: ${referralUrl}`);
  }

  return (
    <>
      {/* Text link style */}
      <button
        onClick={handleNativeShare}
        className="mx-auto text-green-800 font-semibold hover:underline hover:text-green-900 transition-colors flex items-center gap-1"
      >
        <Share2 size={14} />
        Share Link to get Free Ride
      </button>

      {/* Simple modal */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-xs w-full">
            <div className="p-3 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Share via</h3>
                <button
                  onClick={() => setShowShareOptions(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-3 space-y-1">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={option.action}
                  className="flex items-center gap-3 p-3 w-full hover:bg-gray-50 rounded text-left"
                >
                  {option.icon}
                  <span className="text-gray-700">{option.name}</span>
                </button>
              ))}
            </div>
            
            {/* Referral info */}
            <div className="p-3 border-t bg-gray-50">
              <p className="text-xs text-gray-600 mb-1">Your referral ID:</p>
              <p className="font-bold text-gray-800 font-mono">{displayId}</p>
              <p className="text-xs text-gray-600 mt-2">
                2 points per referral • 10 points = 1 free ride
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Link: <span className="font-mono text-xs truncate block">{referralUrl}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}