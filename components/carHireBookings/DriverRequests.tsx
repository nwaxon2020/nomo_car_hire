"use client";

import { Car, Calendar, MapPin, MessageCircle, AlertCircle, Edit2, Eye } from 'lucide-react';

interface DriverRequestsProps {
    requests: any[];
    userId?: string;
    formatDate: (date: string) => string;
    openOfferCard: (request: any, e?: React.MouseEvent) => void;
    setViewingRequest: (request: any) => void;
    driverState: string;
    driverCity: string;
    filter: string;
    driverVehicles: any[];
}

export default function DriverRequests({
    requests,
    userId,
    formatDate,
    openOfferCard,
    setViewingRequest,
    driverState,
    driverCity,
    filter,
    driverVehicles
}: DriverRequestsProps) {
    const hasApprovedVehicle = driverVehicles.length > 0;

    // Separate requests into: 
    // 1. Driver's OWN requests (where they are the customer/requester) - they can see offers here
    // 2. Other people's requests (where they can bid)
    const ownRequests = requests.filter(request => request.userId === userId);
    const otherRequests = requests.filter(request => request.userId !== userId);

    // Combine: Show own requests first, then other requests
    const allDisplayRequests = [...ownRequests, ...otherRequests];

    return (
        <div className="px-4 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            {allDisplayRequests.length === 0 ? (
                <div className="col-span-1 md:col-span-2 text-center py-12 bg-gray-900 rounded-xl shadow-sm border border-gray-700">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">No requests found</h3>
                    <p className="text-gray-500 mb-4">
                        {filter !== "all"
                            ? `No ${filter} requests available`
                            : "No available requests at the moment"}
                    </p>
                </div>
            ) : (
                allDisplayRequests.map((request) => {
                    const userHasMadeOffer = request.userHasMadeOffer || false;
                    const isOwnRequest = request.userId === userId;
                    const [tripCategory] = request.tripType?.split(':') || ['city', ''];
                    const isSameCity = tripCategory === 'city' || request.isSameCity === true;
                    const destination = request.destination || request.location;

                    // Only show new bid notification for OWN requests (when other drivers bid)
                    const hasNewBids = isOwnRequest && (request.offers?.some((offer: any) => offer.read === false) || false);

                    return (
                        <div
                            key={request.id}
                            onClick={() => setViewingRequest(request)}
                            className={`w-full relative overflow-hidden rounded-xl shadow-lg transition-all cursor-pointer p-3 sm:p-4 group ${isOwnRequest
                                    ? 'bg-[#1E1B4B] bg-gradient-to-br from-indigo-900 to-purple-900'
                                    : request.userIsBlocked
                                        ? 'bg-red-900/40 border-red-600 shadow-[inset_0_0_20px_rgba(220,38,38,0.2)]'
                                        : request.userWasRejected
                                            ? 'bg-red-950/30 border-red-500/40'
                                            : userHasMadeOffer
                                                ? 'bg-gray-800/80'
                                                : 'bg-[#1E1B4B] bg-gradient-to-br from-indigo-900 to-purple-900'
                                } border ${hasNewBids
                                    ? 'border-2 border-green-500'
                                    : request.userIsBlocked
                                        ? 'border-red-600'
                                        : request.userWasRejected
                                            ? 'border-red-500/60 hover:border-red-400'
                                            : userHasMadeOffer && !isOwnRequest
                                                ? 'border-amber-500/50 hover:border-amber-400'
                                                : 'border-purple-500/30 hover:border-purple-400'
                                }`}
                        >
                            {/* Green pulse border effect for new bids on OWN requests - only border animation */}
                            {hasNewBids && (
                                <div className="absolute inset-0 rounded-xl border-2 border-green-500 animate-pulse pointer-events-none" />
                            )}

                            {/* New Bid Badge for OWN requests */}
                            {hasNewBids && (
                                <div className="absolute top-0 left-2 z-20">
                                    <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                        NEW OFFERS
                                    </span>
                                </div>
                            )}

                            {/* Rejection Badge */}
                            {(request.userWasRejected || request.userIsBlocked) && !isOwnRequest && (
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-red-600 text-white rounded-lg border border-red-400/30 z-20 shadow-lg shadow-red-600/20">
                                    <AlertCircle className="w-3 h-3" />
                                    <span className="text-[10px] font-black tracking-tighter uppercase">
                                        {request.userIsBlocked ? 'Blocked' : 'Bidding Rejected'}
                                    </span>
                                </div>
                            )}

                            {/* Driver Bidded Indicator (for requests they bid on) */}
                            {userHasMadeOffer && !isOwnRequest && !request.userWasRejected && !request.userIsBlocked && (
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 z-20 transition-opacity">
                                    <Edit2 className="w-3 h-3" />
                                    <span className="text-[10px] font-bold">EDIT BIDDING</span>
                                </div>
                            )}

                            {/* "Your Request" Badge for OWN requests */}
                            {isOwnRequest && (
                                <div className="absolute top-2 right-2 z-20">
                                    <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full">
                                        YOUR REQUEST
                                    </span>
                                </div>
                            )}

                            {/* Premium Background Accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

                            <div className="mt-2 relative z-10 flex flex-col gap-2">
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

                                {/* Vehicle Warning for Drivers without approved vehicles (only for bidding on others' requests) */}
                                {!hasApprovedVehicle && !isOwnRequest && (
                                    <div className="mt-1 p-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
                                        <p className="text-red-400 text-[10px] font-medium text-center">
                                            ⚠️ No approved vehicle - Add vehicle to profile
                                        </p>
                                    </div>
                                )}

                                {/* xs Date, Offers, Views - FIXED: Added notification dot on message icon when there are new bids */}
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
                                            className="relative flex items-center gap-1 font-medium px-2 py-0.5 rounded text-xs transition-all"
                                        >
                                            {/* Notification dot for new bids */}
                                            {hasNewBids && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                                            )}
                                            <span className={`${request.offers?.length ? 'bg-purple-500/30 text-white font-bold hover:bg-purple-500/50' : 'bg-black/20 text-gray-400 hover:bg-black/40'} flex items-center gap-1 px-2 py-0.5 rounded`}>
                                                <MessageCircle className="w-3 h-3" /> {request.offers?.length || 0}
                                            </span>
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