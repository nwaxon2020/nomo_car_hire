"use client";

import { X, Car, AlertCircle, MapPin, Calendar, Users, Eye, MessageCircle, Trash2, Edit2 } from 'lucide-react';
import { BookingRequestType, OfferType } from "./types";

interface ViewRequestModalProps {
  request: BookingRequestType;
  isDriver: boolean;
  userId?: string;
  userHasMadeOffer: boolean;
  userOffer: OfferType | null;
  formatDate: (date: string) => string;
  onClose: () => void;
  openOfferCard: (request: BookingRequestType, e?: React.MouseEvent) => void;
  onContactUser: (request: BookingRequestType) => void;
  onEditOffer: (request: BookingRequestType, offer: OfferType) => void;
  onRemoveBid: (requestId: string, offerIndex: number) => void;
}

export default function ViewRequestModal({
  request,
  isDriver,
  userId,
  userHasMadeOffer,
  userOffer,
  formatDate,
  onClose,
  openOfferCard,
  onContactUser,
  onEditOffer,
  onRemoveBid
}: ViewRequestModalProps) {
  const [tripCategory, tripPurpose] = request.tripType?.split(':') || ['city', ''];
  const isSameCity = tripCategory === 'city' || request.isSameCity === true;
  const destination = request.destination || request.location;

  return (
    <div className="h-[100vh] fixed inset-0 bg-black/60 flex flex-col items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded md:rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col relative border border-gray-700 animate-fadeIn">
        <div className="p-4 flex justify-between items-center border-b border-gray-800 shrink-0 bg-gray-900 sticky top-0 z-10 w-full">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-500" />
            Request Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto w-full">
          <div className="w-full">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3">
                    <div className="bg-emerald-500/10 p-2 sm:p-2.5 rounded-xl self-start border border-emerald-500/20">
                      <Car className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex flex-col pb-2 sm:flex-row sm:items-center gap-2 mb-1">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-100 border-b border-gray-800 sm:border-0">{request.carType}</h3>
                        <div className="pt-1 flex flex-wrap gap-2">
                          {request.urgent && (
                            <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold rounded-md flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Urgent
                            </span>
                          )}
                          {request.negotiable && (
                            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-md">
                              Negotiable
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${isSameCity
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}>
                            {isSameCity ? 'City Ride' : 'Intercity'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between md:items-center md:justify-start gap-3 text-gray-50 text-sm">
                        <span className="font-medium text-gray-300 truncate">{request.userName}</span>
                        <span className="hidden sm:inline text-gray-700">•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                          <div className="truncate text-xs">
                            {isSameCity ? (
                              <span className="text-gray-300">{request.location}</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-300">{request.location}</span>
                                <span className="text-gray-500 text-[10px]">TO</span>
                                <span className="text-emerald-400 font-medium">{destination}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date</span>
                      <span className="text-sm font-semibold text-gray-200 text-xs">
                        {formatDate(request.startDate)} {request.endDate > request.startDate && `- ${formatDate(request.endDate)}`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Passengers</span>
                      <span className="text-sm font-semibold text-gray-200 text-xs">{request.passengers}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Trip Type</span>
                      <span className="text-sm font-semibold text-gray-200 capitalize text-xs">{request.tripType?.split(':')[0]}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Budget Limit</span>
                      <span className="text-base font-black text-emerald-400 text-xs">
                        ₦{parseInt(request.budget || "0").toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {tripPurpose && (
                <div className="mt-3 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Trip Purpose:</span>
                    <span className="text-sm font-medium text-gray-300 capitalize text-xs">
                      {tripPurpose.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                </div>
              )}

              {request.description && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 text-sm sm:text-base text-xs">{request.description}</p>
                </div>
              )}

              {/* User's Offer Status (for drivers) */}
              {isDriver && userId !== request.userId && userHasMadeOffer && userOffer && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="w-full">
                      <p className="font-medium text-amber-900">Your Offer</p>
                      <p className="flex gap-4 items-center text-xs sm:text-sm text-amber-700">
                        <span>• ₦{parseInt(userOffer.price).toLocaleString()}</span>
                        <span>• Status: <span className="font-medium capitalize">{userOffer.status}</span></span>
                      </p>
                      <p className="flex gap-4 items-center text-xs sm:text-sm text-amber-700">
                        <span>• Car: {userOffer.carMake || "Not specified"}</span>
                        <span>• AC: {userOffer.hasAC ? 'Yes' : 'No'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const offerIndex = request.offers.findIndex(o => o.driverId === userId);
                        if (offerIndex !== -1) {
                          onRemoveBid(request.id, offerIndex);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      Remove Your Bid
                    </button>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 pt-4 border-t border-gray-700">
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-50">
                  <span className="flex items-center gap-1 text-xs">
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    {request.views || 0} views
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openOfferCard(request, e);
                    }}
                    className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer text-blue-500 text-xs"
                  >
                    <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    {request.offers?.length || 0} offers
                    {userHasMadeOffer && (
                      <span className="hidden sm:inline text-gray-300"> • Your offer included</span>
                    )}
                  </button>

                  <span className="text-xs text-gray-400 text-xs">
                    Posted {(() => {
                      const date = request.createdAt?.toDate?.() || new Date(request.createdAt);
                      const now = new Date();
                      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

                      if (diffHours < 1) return "just now";
                      if (diffHours < 24) return `${diffHours}h ago`;
                      return date.toLocaleDateString();
                    })()}
                  </span>
                </div>

                {/* Action Button - Right Side */}
                {isDriver && userId !== request.userId ? (
                  userHasMadeOffer ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          if (userOffer) {
                            onEditOffer(request, userOffer);
                          }
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm text-xs"
                      >
                        <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        Edit Offer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onContactUser(request)}
                      className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 font-bold text-sm sm:text-base z-20 text-xs"
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Make Offer
                    </button>
                  )
                ) : userId === request.userId ? (
                  <div className="text-sm text-gray-400 text-xs">Your request</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
