"use client";

import { useState } from "react";
import { X, Check, Phone, Car, MapPin, MessageCircle, AlertCircle, Trash2, Edit2, Send, Eye, Navigation, Crown } from 'lucide-react';
import { BookingRequestType, OfferType } from "./types";

interface OfferCardProps {
  request: BookingRequestType;
  userId?: string;
  userName?: string;
  isDriverView?: boolean;
  onClose: () => void;
  onDeleteOffer: (requestId: string, offerIndex: number) => void;
  onMarkAsRead: (requestId: string, offerIndex: number) => void;
  onMarkAllRead: (requestId: string) => void;
  onWhatsAppContact: (phoneNumber: string, driverName: string, price: string) => void;
  onChatDriver: (otherUserId: string, otherUserName: string, request?: BookingRequestType) => void;
  onViewVehiclePreview: (vehicle: any) => void;
}

export default function OfferCard({
  request,
  userId,
  userName,
  isDriverView = false,
  onClose,
  onDeleteOffer,
  onMarkAsRead,
  onMarkAllRead,
  onWhatsAppContact,
  onChatDriver,
  onViewVehiclePreview
}: OfferCardProps) {
  const isRequestOwner = request.userId === userId;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ offerIndex: number, driverName: string } | null>(null);

  // Filter offers based on user type
  let displayOffers = request.offers || [];
  if (isDriverView && userId) {
    // Drivers only see their own offers
    displayOffers = displayOffers.filter(offer => offer.driverId === userId);
  }

  return (
    <div className="h-[100vh] fixed inset-0 bg-black/70 flex items-center justify-center p-2 md:p-4 z-[100] backdrop-blur-md">
      <div className="bg-gray-900 rounded md:rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700 animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/95 rounded-t-2xl sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              {isDriverView ? "Your Offer" : `Offers for ${request.carType}`}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {request.location} • {request.startDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Offers List */}
        <div className="flex-1 overflow-y-auto p-5">
          {displayOffers.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {isDriverView ? "You haven't made an offer on this request yet" : "No offers yet"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {isDriverView ? "Click 'Make Offer' to submit your bid" : "Check back later for driver offers"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mark All Read Button - Only for customers */}
              {!isDriverView && (request.offers || []).some((o: any) => o.read === false && isRequestOwner) && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => onMarkAllRead(request.id)}
                    className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full hover:bg-green-500/30 transition-all font-bold uppercase tracking-wider"
                  >
                    Mark All Read
                  </button>
                </div>
              )}

              {displayOffers.map((offer, index) => {
                const isUsersOffer = offer.driverId === userId;
                const isUnread = offer.read === false && isRequestOwner && !isDriverView;
                const originalIndex = request.offers?.findIndex(o => o.driverId === offer.driverId) || index;

                return (
                  <div
                    key={index}
                    className={`bg-gray-800/80 border rounded-xl p-5 transition-all ${isUsersOffer ? 'border-blue-500 bg-blue-900/20' :
                      isUnread ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' :
                        'border-gray-700 hover:border-gray-600'
                      }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-lg">
                            {offer.driverName}
                          </h4>
                          {isUsersOffer && (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                              Your Offer
                            </span>
                          )}
                          {isUnread && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full animate-pulse border border-green-500/30">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{offer.driverPhone}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-green-400">
                          ₦{parseInt(offer.price).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${offer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            offer.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                              'bg-red-500/20 text-red-300'
                            }`}>
                            {offer.status}
                          </span>
                          {(isUsersOffer || isRequestOwner) && !isDriverView && (
                            <button
                              onClick={() => setShowDeleteConfirm({ offerIndex: originalIndex, driverName: offer.driverName })}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title={isUsersOffer ? "Remove your offer" : "Remove this offer"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {isUsersOffer && isDriverView && (
                            <button
                              onClick={() => setShowDeleteConfirm({ offerIndex: originalIndex, driverName: offer.driverName })}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Remove your offer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-900/50 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-500">Car</span>
                        <p className="text-sm font-medium text-gray-200">{offer.carMake || "Not specified"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Air Conditioning</span>
                        <p className={`text-sm font-medium ${offer.hasAC ? 'text-green-400' : 'text-red-400'}`}>
                          {offer.hasAC ? 'Yes ✓' : 'No ✗'}
                        </p>
                      </div>
                      {offer.vehicleDetails && (
                        <div className="col-span-2">
                          <button
                            onClick={() => onViewVehiclePreview(offer.vehicleDetails)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                          >
                            <Car className="w-4 h-4" /> View Car Details & Images
                          </button>
                        </div>
                      )}
                    </div>

                    {offer.message && (
                      <div className={`mb-4 p-3 rounded-lg text-sm ${isUsersOffer ? 'bg-blue-900/30 text-blue-100' : 'bg-gray-900/50 text-gray-300'
                        }`}>
                        <p className="italic">"{offer.message}"</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-700">
                      <span className="text-xs text-gray-500">
                        Offered {offer.createdAt?.toDate?.().toLocaleDateString() || 'recently'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {isUnread && !isDriverView && (
                          <button
                            onClick={() => onMarkAsRead(request.id, originalIndex)}
                            className="px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-xs font-medium transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Read
                          </button>
                        )}
                        {isRequestOwner && !isDriverView && (
                          <>
                            <button
                              onClick={() => onWhatsAppContact(offer.driverPhone, offer.driverName, offer.price)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm"
                            >
                              <MessageCircle className="w-4 h-4" />
                              WhatsApp
                            </button>
                            <button
                              onClick={() => {
                                onChatDriver(offer.driverId, offer.driverName, request);
                                if (isUnread) onMarkAsRead(request.id, originalIndex);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                            >
                              <Send className="w-4 h-4" />
                              Chat
                            </button>
                          </>
                        )}
                        {isUsersOffer && (
                          <button
                            onClick={() => onChatDriver(request.userId, request.userName, request)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                          >
                            <Send className="w-4 h-4" />
                            Chat Requester
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/95 rounded-b-2xl">
          <p className="text-center text-xs text-gray-500">
            {isDriverView
              ? `Your offer status`
              : `Total Offers: ${request.offers?.length || 0}`}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Offer?</h3>
              <p className="text-gray-600 mb-6 font-medium">
                Are you sure you want to remove your offer for <strong>{showDeleteConfirm.driverName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteOffer(request.id, showDeleteConfirm.offerIndex);
                    setShowDeleteConfirm(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
