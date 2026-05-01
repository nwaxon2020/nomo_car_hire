"use client"
import React from 'react';
import { FaCar, FaCheckCircle, FaTimesCircle, FaShieldAlt } from 'react-icons/fa';
import TripTracker from "@/components/map/TripTracker";
import ShareLocation from "@/components/map/ShareLocation";
import { Trip, DriverWithVehicle, VehicleLog } from './types';

interface ActiveTripBannerProps {
    activeTrip: Trip | null;
    currentUser?: any;
    updateTripStatus?: (tripId: string, status: 'completed' | 'cancelled') => Promise<void>;
    onOpenMap: () => void;
    selectedDriver?: DriverWithVehicle | null;
    selectedVehicle?: VehicleLog | null;
    isMarkCompleteDisabled?: boolean;
}

export default function ActiveTripBanner({ 
    activeTrip, 
    currentUser,
    updateTripStatus,
    onOpenMap,
    selectedDriver, 
    selectedVehicle,
    isMarkCompleteDisabled = false,
}: ActiveTripBannerProps) {
    if (!activeTrip) return null;

    return (
        <div className="max-w-4xl mx-auto mb-8 bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header / Status Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 rounded-full">
                            <FaCar className="text-white text-lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">🚗 Active Trip</h3>
                            <p className="text-blue-100 text-sm">Real-time tracking enabled</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onOpenMap}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                            View Map
                        </button>
                        <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                            🟢 LIVE
                        </span>
                    </div>
                </div>

                {/* Route Info */}
                <div className="flex justify-center md:justify-start items-center gap-4 space-y-1 text-white">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="truncate">{activeTrip.pickupLocation}</span>
                    </div>
                    <div><p className="font-bold">to</p></div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <span className="truncate">{activeTrip.destination}</span>
                    </div>
                </div>
            </div>

            {/* LIVE TRIP TRACKER WIDGET */}
            <div className="p-3 bg-white">
                <TripTracker
                    tripId={activeTrip.id}
                    driverId={selectedDriver?.id || activeTrip.driverId}
                    customerId={currentUser?.uid}
                />
            </div>

            {/* Action Buttons */}
            <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => updateTripStatus?.(activeTrip.id, 'completed')}
                        disabled={isMarkCompleteDisabled}
                        title={isMarkCompleteDisabled ? "Can only mark as completed when ETA is 3 mins or less" : ""}
                        className={`flex-1 py-3 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${isMarkCompleteDisabled ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                    >
                        <FaCheckCircle />
                        Mark Completed
                    </button>
                    <button
                        onClick={() => updateTripStatus?.(activeTrip.id, 'cancelled')}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <FaTimesCircle />
                        Cancel Trip
                    </button>
                </div>
            </div>

            {/* Safety Section */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200">
                <div className="flex flex-col md:flex-row items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                        <FaShieldAlt className="text-blue-600" />
                        Safety Features
                    </h4>
                    <ShareLocation
                        tripId={activeTrip.id}
                        driverId={selectedDriver?.id || activeTrip.driverId}
                        driverName={selectedDriver?.fullName || 'Driver'}
                        vehicleDetails={selectedVehicle ? `${selectedVehicle.carName} ${selectedVehicle.carModel}` : 'Vehicle'}
                        pickup={activeTrip.pickupLocation}
                        destination={activeTrip.destination}
                        currentUserId={currentUser?.uid}
                    />
                </div>

                <p className="text-blue-700 text-xs">
                    ✅ Your trip is being tracked for safety. Share location with loved ones.
                </p>
            </div>
        </div>
    );
}
