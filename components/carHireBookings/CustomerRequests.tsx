"use client";

import { Car, Calendar, MapPin, MessageCircle, AlertCircle, Trash2, Eye } from 'lucide-react';

interface CustomerRequestsProps {
    requests: any[];
    userId?: string;
    formatDate: (date: string) => string;
    openOfferCard: (request: any, e?: React.MouseEvent) => void;
    setViewingRequest: (request: any) => void;
    setShowDeleteConfirm: (id: string) => void;
}

export default function CustomerRequests({
    requests,
    userId,
    formatDate,
    openOfferCard,
    setViewingRequest,
    setShowDeleteConfirm
}: CustomerRequestsProps) {
    return (
        <div className="px-4 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.length === 0 ? (
                <div className="col-span-1 md:col-span-2 text-center py-12 bg-gray-900 rounded-xl shadow-sm border border-gray-700">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">No requests found</h3>
                    <p className="text-gray-500 mb-4">No requests to display</p>
                </div>
            ) : (
                requests.map((request) => {
                    const hasBids = request.offers && request.offers.length > 0;
                    const isCustomerRequest = request.userId === userId;
                    const shouldShowOffersButton = isCustomerRequest && hasBids;
                    const [tripCategory] = request.tripType?.split(':') || ['city', ''];
                    const isSameCity = tripCategory === 'city' || request.isSameCity === true;
                    const destination = request.destination || request.location;

                    return (
                        <div
                            key={request.id}
                            onClick={() => setViewingRequest(request)}
                            className={`w-full relative overflow-hidden rounded-xl shadow-lg transition-all cursor-pointer p-3 sm:p-4 group bg-[#1E1B4B] bg-gradient-to-br from-indigo-900 to-purple-900 border ${request.hasNewBid && isCustomerRequest
                                    ? 'border-2 border-green-500'
                                    : 'border-purple-500/30 hover:border-purple-400'
                                }`}
                        >
                            {/* Green pulse border effect for new bids - only border animation, no background change */}
                            {request.hasNewBid && isCustomerRequest && (
                                <div className="absolute inset-0 rounded-xl border-2 border-green-500 animate-pulse pointer-events-none" />
                            )}

                            {/* Premium Background Accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

                            <div className="relative z-10 flex flex-col gap-2">
                                {/* Location */}
                                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                                    <span className="truncate text-xs">
                                        {isSameCity ? `Within ${request.location}` : `${request.location} → ${destination}`}
                                    </span>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                    {request.urgent && (
                                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] sm:text-[10px] font-bold rounded flex items-center gap-1 leading-none border border-orange-500/30">
                                            URGENT
                                        </span>
                                    )}
                                    {request.negotiable && (
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-bold rounded leading-none border border-blue-500/30">
                                            NEGOTIABLE
                                        </span>
                                    )}
                                    <span className="px-2 py-0.5 bg-white/10 text-gray-200 text-[9px] sm:text-[10px] font-bold rounded uppercase leading-none border border-white/20">
                                        {request.tripType?.split(':')[0] || 'Ride'}
                                    </span>
                                </div>

                                {/* Vehicle Icon & Car Type */}
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="bg-white/10 p-1.5 rounded-md border border-white/20 text-purple-300">
                                        <Car className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white truncate text-xs">
                                        {request.carType}
                                    </h3>
                                </div>

                                {/* Price / Budget */}
                                <div className="text-yellow-400 text-lg sm:text-xl font-black mt-1 drop-shadow-md text-xs">
                                    ₦{parseInt(request.budget || "0").toLocaleString()}
                                </div>

                                {/* Action Buttons in Top-Right Corner */}
                                <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
                                    {shouldShowOffersButton && (
                                        <button
                                            onClick={(e) => openOfferCard(request, e)}
                                            className="p-2 bg-amber-500/80 hover:bg-amber-600 text-white rounded-full transition-all shadow-lg"
                                            title="View Offers"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    {userId === request.userId && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteConfirm(request.id);
                                            }}
                                            className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all shadow-lg"
                                            title="Delete Request"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* xs Date, Offers, Views */}
                                <div className="flex items-center justify-between text-xs text-gray-300 mt-1 border-t border-purple-500/30 pt-2 pb-1">
                                    <span className="flex items-center gap-1 font-medium text-xs">
                                        <Calendar className="w-3 h-3 text-purple-400" /> {formatDate(request.startDate)}
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex items-center gap-1 font-medium text-gray-400 text-xs">
                                            <Eye className="w-3 h-3" /> {request.views || 0}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openOfferCard(request, e);
                                            }}
                                            className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded text-xs transition-all ${request.offers?.length ? 'bg-purple-500/30 text-white font-bold hover:bg-purple-500/50' : 'bg-black/20 text-gray-400 hover:bg-black/40'}`}
                                        >
                                            <MessageCircle className="w-3 h-3" /> {request.offers?.length || 0}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}