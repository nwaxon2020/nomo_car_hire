"use client"
import React from 'react';
import { FaCar, FaCheckCircle, FaTimesCircle, FaShieldAlt } from 'react-icons/fa';
import TripTracker from "@/components/map/TripTracker";
import ShareLocation from "@/components/map/ShareLocation";
import { Trip, DriverWithVehicle, VehicleLog } from './types';

interface ActiveTripBannerProps {
    activeTrip: Trip | null;
    selectedDriver: DriverWithVehicle | null;
    selectedVehicle: VehicleLog | null;
    currentUser: any;
    updateTripStatus: (tripId: string, status: 'completed' | 'cancelled') => Promise<void>;
}

export default function ActiveTripBanner({ 
    activeTrip, 
    selectedDriver, 
    selectedVehicle, 
    currentUser, 
    updateTripStatus 
}: ActiveTripBannerProps) {
    if (!activeTrip) return null;

    return (
        <div className="mb-4 rounded-xl overflow-hidden shadow-xl border border-blue-200">
            {/* Banner Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-2 rounded-full">
                            <FaCar className="text-white text-lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">🚗 Active Trip</h3>
                            <p className="text-blue-100 text-sm">Real-time tracking enabled</p>
                        </div>
                    </div>
                    <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                        🟢 LIVE
                    </span>
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
                        onClick={() => updateTripStatus(activeTrip.id, 'completed')}
                        className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                        <FaCheckCircle />
                        Mark Completed
                    </button>
                    <button
                        onClick={() => updateTripStatus(activeTrip.id, 'cancelled')}
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
                        vehicleDetails={`${selectedVehicle?.carName} ${selectedVehicle?.carModel}`}
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
