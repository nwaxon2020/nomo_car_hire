"use client";
import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaCar, FaExclamationTriangle } from 'react-icons/fa';
import { DirectOffer } from './types';

interface DirectBookingStatusProps {
    pendingOffer: DirectOffer | null;
    driverResponse: 'none' | 'busy' | 'cancelled';
    countdown: number;
    onCancel: () => void;
}

export default function DirectBookingStatus({
    pendingOffer,
    driverResponse,
    countdown,
    onCancel
}: DirectBookingStatusProps) {
    if (!pendingOffer) return null;

    if (driverResponse === 'busy') {
        return (
            <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                    <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaExclamationTriangle className="text-orange-500 text-4xl" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Driver is Busy</h3>
                    <p className="text-gray-400 text-sm mb-8">The driver is currently unavailable or busy. Please try another driver.</p>
                </div>
            </div>
        );
    }

    if (pendingOffer.status === 'pending') {
        return (
            <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[2.5rem] p-8 text-center shadow-2xl">
                    <div className="relative w-36 h-36 mx-auto mb-8">
                        {/* Rotating Spinner Border */}
                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent z-10"
                        ></motion.div>

                        {/* Driver Image Container */}
                        <div className="absolute inset-2 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-900 shadow-inner">
                            {pendingOffer.driverImage ? (
                                <Image
                                    src={pendingOffer.driverImage}
                                    alt={pendingOffer.driverName}
                                    width={144}
                                    height={144}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-600/20 text-blue-500">
                                    <FaCar size={40} />
                                </div>
                            )}
                        </div>

                        {/* Countdown Badge */}
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center text-lg font-black shadow-xl z-20 border-4 border-gray-900">
                            {countdown > 0 ? countdown : "..."}
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Connecting to Driver</h3>
                    <p className="text-gray-400 text-sm mb-8">Driver {pendingOffer.driverName} is reviewing your booking request. Please stay on this page.</p>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-red-400 font-bold rounded-2xl transition-all border border-red-500/20"
                    >
                        Cancel Request
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
