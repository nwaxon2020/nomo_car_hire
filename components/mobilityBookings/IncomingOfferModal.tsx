"use client";
import React from 'react';
import Image from 'next/image';
import { FaCar, FaMapMarkerAlt, FaTimesCircle } from 'react-icons/fa';
import { DirectOffer, VehicleLog } from './types';

interface IncomingOfferModalProps {
    incomingOffer: DirectOffer;
    ownVehicles: VehicleLog[];
    isAcceptingOffer: boolean;
    isStartingTrip: boolean;
    onAccept: (offer: DirectOffer) => void;
    onReject: (offer: DirectOffer) => void;
    onStartTrip: (driverId: string, vehicleId: string, pickup: string, destination: string) => void;
    onTerminate: () => void;
    onResumeMap: () => void;
}

export default function IncomingOfferModal({
    incomingOffer,
    ownVehicles,
    isAcceptingOffer,
    isStartingTrip,
    onAccept,
    onReject,
    onStartTrip,
    onTerminate,
    onResumeMap
}: IncomingOfferModalProps) {
    if (incomingOffer.status === 'accepted') {
        return (
            <div className="max-w-lg mx-auto w-full px-2 sm:px-4">
                <div className="bg-white rounded-[2.5rem] border border-emerald-500/20 p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                        <FaCar className="text-emerald-500 text-2xl" />
                    </div>
                    <h3 className="text-gray-900 font-black text-xl uppercase tracking-tight mb-2">Booking Accepted</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Navigation and tracking are active.</p>
                    
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <button
                                onClick={onResumeMap}
                                className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                <FaMapMarkerAlt size={12} /> Map
                            </button>
                            <button
                                onClick={() => onStartTrip(
                                    incomingOffer.driverId,
                                    incomingOffer.vehicleId,
                                    incomingOffer.pickupLocation || 'Current Location',
                                    incomingOffer.destination || 'Selected Destination'
                                )}
                                disabled={isStartingTrip}
                                className="flex-[2] py-4 bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                {isStartingTrip ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><FaCar size={10} /> Start Trip</>
                                )}
                            </button>
                        </div>
                        <button
                            onClick={onTerminate}
                            className="w-full py-3.5 bg-gray-50 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                        >
                            Terminate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (incomingOffer.status === 'started') {
        return (
            <div className="max-w-lg mx-auto w-full px-2 sm:px-4">
                <div className="bg-slate-900 rounded-[2.5rem] border border-emerald-500/20 p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                        <FaCar className="text-emerald-500 text-2xl animate-pulse" />
                    </div>
                    <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">Trip in Progress</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Navigation and tracking are active.</p>
                    <button
                        onClick={onResumeMap}
                        className="w-full py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                    >
                        <FaMapMarkerAlt size={14} /> Resume Navigation Map
                    </button>
                </div>
            </div>
        );
    }

    // Default: Pending state
    return (
        <div className="p-1 sm:p-2 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-2xl flex items-center justify-center max-w-lg mx-auto w-full">
            <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 text-center w-full">
                <div className="flex justify-center mb-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-25"></div>
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-amber-500 shadow-xl bg-gray-100">
                            {incomingOffer.customerImage ? (
                                <Image
                                    src={incomingOffer.customerImage}
                                    alt={incomingOffer.customerName}
                                    width={96}
                                    height={96}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-amber-100 text-amber-600">
                                    <FaCar size={32} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-amber-600 mb-2 drop-shadow-sm">New Booking Offer</p>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 leading-tight tracking-tighter">
                    {incomingOffer.customerName} <span className="text-amber-500 flex flex-col sm:inline">wants to book you!</span>
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mb-4 font-medium">Accept request from {incomingOffer.customerName} to see the location.</p>

                {ownVehicles.find(v => v.id === incomingOffer.vehicleId) && (
                    <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200 shadow-inner flex items-center justify-center gap-3 w-full">
                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Target Vehicle</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId)?.carName}{" "}
                                {ownVehicles.find(v => v.id === incomingOffer.vehicleId)?.carModel}
                            </p>
                        </div>
                    </div>
                )}

                {incomingOffer.destination && (
                    <div className="bg-emerald-50 rounded-xl p-3 mb-6 border border-emerald-200 shadow-inner w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                <FaMapMarkerAlt className="text-white" size={14} />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Customer&apos;s Destination</p>
                                <p className="font-bold text-gray-900 text-sm leading-tight">{incomingOffer.destination}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 w-full">
                    <button
                        onClick={() => onReject(incomingOffer)}
                        className="flex-1 py-3 sm:py-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 font-black tracking-widest uppercase rounded-xl transition-all text-[10px] sm:text-xs"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => onAccept(incomingOffer)}
                        disabled={isAcceptingOffer}
                        className={`flex-1 py-3 sm:py-4 font-black tracking-widest uppercase rounded-xl transition-all text-[10px] sm:text-xs flex items-center justify-center gap-2 ${isAcceptingOffer
                            ? "bg-gray-400 cursor-not-allowed text-white"
                            : "bg-gray-900 hover:bg-black text-white shadow-xl"
                            }`}
                    >
                        {isAcceptingOffer ? "Wait..." : "Accept"}
                    </button>
                </div>
            </div>
        </div>
    );
}
