"use client"
import React from 'react';
import { DriverWithVehicle, VehicleLog } from '../types';
import { getVehicleImages } from '../utils';

interface ModalVehicleInfoProps {
    vehicle: VehicleLog;
    driver: DriverWithVehicle;
    onSetVehicle: (v: VehicleLog) => void;
    onSetMainImage: (img: string) => void;
}

export default function ModalVehicleInfo({
    vehicle,
    driver,
    onSetVehicle,
    onSetMainImage
}: ModalVehicleInfoProps) {
    return (
        <div>
            <h3 className="text-lg font-bold text-white mb-4">Vehicle Information</h3>
            <div className="bg-gray-800 rounded-lg p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-gray-400 text-sm">Car Name</p>
                        <p className="font-bold text-white">{vehicle.carName}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Model</p>
                        <p className="font-bold text-white">{vehicle.carModel}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Type</p>
                        <p className="font-bold text-white capitalize">{vehicle.carType}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Seats</p>
                        <p className="font-bold text-white">{vehicle.passengers}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Color</p>
                        <p className="font-bold text-white">{vehicle.exteriorColor}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">AC</p>
                        <p className={`font-bold ${vehicle.ac ? "text-green-400" : "text-red-400"}`}>
                            {vehicle.ac ? "Available" : "Not Available"}
                        </p>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-2">Description</p>
                    <p className="text-gray-300">{vehicle.description}</p>
                </div>

                {/* Other Vehicles */}
                {driver.vehicles.length > 1 && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <p className="text-gray-400 text-sm mb-2">Other vehicles from this driver:</p>
                        <div className="flex gap-2 overflow-x-auto">
                            {driver.vehicles
                                .filter(v => v.id !== vehicle.id)
                                .map((v, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            onSetVehicle(v);
                                            const vImages = getVehicleImages(v);
                                            onSetMainImage(vImages[0]);
                                        }}
                                        className="flex-shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                                    >
                                        {v.carName} ({v.carType})
                                    </button>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
