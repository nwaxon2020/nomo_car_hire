"use client";
import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { DriverWithVehicle, VehicleLog } from './types';

interface DestinationInputOverlayProps {
    show: boolean;
    tempBookingData: { driver: DriverWithVehicle; vehicle: VehicleLog } | null;
    destinationInput: string;
    destinationInputRef: React.RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onFinalize: () => void;
}

export default function DestinationInputOverlay({
    show,
    tempBookingData,
    destinationInput,
    destinationInputRef,
    onClose,
    onFinalize
}: DestinationInputOverlayProps) {
    if (!show || !tempBookingData) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                >
                    <FaTimes size={20} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                        <FaMapMarkerAlt className="text-emerald-500 text-2xl" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Set Your Destination</h3>
                    <p className="text-gray-400 text-xs">Tell {tempBookingData.driver.firstName} where you are heading.</p>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="relative">
                        <div className="absolute top-1/2 left-5 -translate-y-1/2 text-emerald-500">
                            <FaMapMarkerAlt size={16} />
                        </div>
                        <input
                            ref={destinationInputRef}
                            type="text"
                            placeholder="Enter drop-off location..."
                            defaultValue={destinationInput}
                            className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                            autoFocus
                        />
                    </div>

                    <div className="bg-gray-800/50 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                            <Image
                                src={tempBookingData.driver.profileImage || "/per.png"}
                                alt="Driver"
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Driver Selected</p>
                            <p className="text-sm font-bold text-white">{tempBookingData.driver.fullName}</p>
                            <p className="text-[10px] text-gray-500">{tempBookingData.vehicle.carName} • {tempBookingData.vehicle.plateNumber}</p>
                        </div>
                    </div>

                    <button
                        onClick={onFinalize}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-50 text-white hover:text-emerald-900 font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-600/20"
                    >
                        Confirm & Send Request
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
