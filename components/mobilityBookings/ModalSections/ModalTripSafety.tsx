"use client"
import React from 'react';
import { FaEye, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import SimpleBookingMap from "@/components/map/SimpleBookingMap";
import { Driver, VehicleLog, Trip } from '../types';

interface ModalTripSafetyProps {
    driver: Driver;
    vehicle: VehicleLog;
    activeTrip: Trip | null;
    tripInfo: { showForm: boolean; pickupLocation: string; destination: string };
    setTripInfo: (val: any) => void;
    startTrip: (d: string, v: string, p: string, dest: string) => Promise<string | null>;
    updateTripStatus: (id: string, s: 'completed' | 'cancelled') => Promise<void>;
    handleSaveDriver: () => void;
    canSaveDriver: (dId: string, vId: string) => { canSave: boolean };
    setDriverInfo: (v: boolean) => void;
    getDriverLocation: (d: any) => any;
    currentUser: any;
}

export default function ModalTripSafety({
    driver,
    vehicle,
    activeTrip,
    tripInfo,
    setTripInfo,
    startTrip,
    updateTripStatus,
    handleSaveDriver,
    canSaveDriver,
    setDriverInfo,
    getDriverLocation,
    currentUser
}: ModalTripSafetyProps) {
    return (
        <div className="mb-4">
            {activeTrip && activeTrip.driverId === driver.uid && activeTrip.vehicleId === vehicle.id ? (
                <div className="space-y-3">
                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                        <h4 className="font-bold text-white mb-2">🚗 Active Trip</h4>
                        <div className="space-y-1">
                            <p className="text-gray-300 text-sm">
                                <span className="font-medium">Pickup:</span> {activeTrip.pickupLocation}
                            </p>
                            <p className="text-gray-300 text-sm">
                                <span className="font-medium">Destination:</span> {activeTrip.destination}
                            </p>
                            <p className="text-gray-300 text-sm">
                                <span className="font-medium">Fare:</span> <span className="text-yellow-300">₦{activeTrip.fare?.toLocaleString()}</span>
                            </p>
                            <p className="text-gray-300 text-xs mt-2">
                                Trip started: {activeTrip.startTime?.toDate?.()?.toLocaleString() || 'Recently'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => updateTripStatus(activeTrip.id, 'completed')}
                            className="py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300"
                        >
                            ✅ Complete Trip
                        </button>
                        <button
                            onClick={() => updateTripStatus(activeTrip.id, 'cancelled')}
                            className="py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-300"
                        >
                            ❌ Cancel Trip
                        </button>
                    </div>
                    <p className="text-gray-400 text-xs text-center">
                        Complete trip when you reach your destination. Cancel if plans change.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-white mb-3 flex justify-center md:justify-start items-center gap-2">
                            <span className="text-blue-400">🛡️</span> Trip Safety Information
                        </h3>

                        {(!tripInfo.pickupLocation || !tripInfo.destination) && (
                            <div className="text-center md:text-left mb-4">
                                <p className="text-gray-400 text-sm mb-2">
                                    For your safety and trip tracking, please provide:
                                </p>
                                <button
                                    onClick={() => {
                                        setTripInfo((prev: any) => ({
                                            ...prev,
                                            showForm: !prev.showForm
                                        }));
                                    }}
                                    className="text-blue-400 hover:text-blue-300 underline decoration-2 underline-offset-2 text-sm font-medium transition-colors duration-200"
                                >
                                    📝 Fill Info for Safety Travel
                                </button>
                            </div>
                        )}

                        {(tripInfo.showForm || (tripInfo.pickupLocation && tripInfo.destination)) && (
                            <SimpleBookingMap
                                pickupLocation={tripInfo.pickupLocation}
                                destination={tripInfo.destination}
                                driverLocation={getDriverLocation(driver)}
                                onLocationSelect={(type: 'pickup' | 'destination', value: string) => {
                                    setTripInfo((prev: any) => ({
                                        ...prev,
                                        [type === 'pickup' ? 'pickupLocation' : 'destination']: value
                                    }));
                                }}
                            />
                        )}
                    </div>

                    {(tripInfo.pickupLocation && tripInfo.destination) && (
                        <>
                            <button
                                onClick={async () => {
                                    if (!tripInfo.pickupLocation || !tripInfo.destination) return;
                                    const tId = await startTrip(driver.uid, vehicle.id, tripInfo.pickupLocation, tripInfo.destination);
                                    if (tId) {
                                        setTimeout(() => setDriverInfo(false), 1500);
                                    }
                                }}
                                className={`w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 mb-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 cursor-pointer`}
                            >
                                🚀 Start Trip for Safety Tracking
                            </button>
                            <p className="text-gray-400 text-xs text-center mb-3">
                                Click &quot;Start Trip&quot; to enable real-time tracking for your safety
                            </p>
                        </>
                    )}


                </>
            )}
        </div>
    );
}
