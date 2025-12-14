"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, updateDoc, arrayUnion, increment, Timestamp } from "firebase/firestore";
import EnhancedWhatsApp from "../EnhancedWhatsApp";

interface Request {
  id: string;
  userId: string;
  userName: string;
  carType: string;
  budget: string;
  location: string;
  startDate: string;
  endDate: string;
  passengers: string;
  tripType: string;
  description?: string;
  negotiable?: boolean;
  urgent?: boolean;
  status: string;
  offers?: any[];
  views?: number;
  createdAt: Timestamp | Date | null;
}

interface RequestCardProps {
  request: Request;
  userId?: string;
}

export default function RequestCard({ request, userId }: RequestCardProps) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContactUser = async () => {
    if (!auth.currentUser) return (window.location.href = "/login");

    setLoading(true);

    try {
      const requestRef = doc(db, "bookingRequests", request.id);
      await updateDoc(requestRef, {
        views: increment(1),
        offers: arrayUnion({
          driverId: auth.currentUser.uid,
          driverName: auth.currentUser.displayName || "Driver",
          timestamp: new Date().toISOString(),
          status: "interested",
        }),
      });

      setShowWhatsApp(true);
    } catch (error) {
      console.error("Error logging interest:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getTripTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      city: "🏙️ City Ride",
      intercity: "🛣️ Intercity",
      airport: "✈️ Airport",
      wedding: "💒 Wedding",
      monthly: "📅 Monthly",
      custom: "🎯 Custom",
    };
    return labels[type] || type;
  };

  // Safe conversion of createdAt
  const createdAtDate =
    request.createdAt instanceof Timestamp
      ? request.createdAt.toDate()
      : request.createdAt || new Date();

  return (
    <>
      {/* Dark Card */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl border border-gray-700 shadow-xl shadow-black/40 p-5 mb-6 transform hover:-translate-y-1 transition-all duration-300">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-white text-lg">{request.carType}</h4>
              {request.urgent && (
                <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-lg animate-pulse">
                  ⚡ URGENT
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              By {request.userName} • {request.location}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xl font-bold text-green-400 drop-shadow-sm">
              ₦{parseInt(request.budget || "0").toLocaleString()}
            </div>
            {request.negotiable && <p className="text-xs text-gray-400">Negotiable</p>}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400">Dates</p>
            <p className="text-sm font-medium text-white">
              {formatDate(request.startDate)} - {formatDate(request.endDate)}
            </p>
          </div>
          <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400">Passengers</p>
            <p className="text-sm font-medium text-white">{request.passengers}</p>
          </div>
          <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400">Trip Type</p>
            <p className="text-sm font-medium text-white">
              {getTripTypeLabel(request.tripType)}
            </p>
          </div>
          <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-400">Status</p>
            <p className="text-sm font-medium text-white capitalize">{request.status}</p>
          </div>
        </div>

        {/* Description */}
        {request.description && (
          <p className="text-gray-300 mb-4 leading-relaxed">{request.description}</p>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-gray-700 pt-3">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>👁️ {request.views || 0} views</span>
            <span>💬 {request.offers?.length || 0} offers</span>
            <span>Posted {createdAtDate.toLocaleDateString()}</span>
          </div>

          <button
            onClick={handleContactUser}
            disabled={loading}
            className="px-5 py-2 bg-green-500 rounded-lg text-white font-medium hover:bg-green-600 transition shadow-lg shadow-green-500/20 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Connecting...
              </>
            ) : (
              <>💬 Contact User</>
            )}
          </button>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <EnhancedWhatsApp
              car={{
                id: "booking-request",
                title: `Booking Request: ${request.carType}`,
                price: parseInt(request.budget || "0") || 0,
                model: request.carType.split("(")[0]?.trim() || "Car",
              }}
              driver={{
                id: request.userId,
                name: request.userName,
                phone: "",
                rating: 5,
                trips: 0,
              }}
              requestDetails={{
                dates: [request.startDate, request.endDate],
                budget: `₦${parseInt(request.budget || "0").toLocaleString()}`,
                location: request.location,
              }}
              onClose={() => setShowWhatsApp(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
