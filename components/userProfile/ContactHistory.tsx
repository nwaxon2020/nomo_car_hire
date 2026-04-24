// components/profile/ContactHistory.tsx
"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { formatDate, formatTime } from "@/components/userProfile/dateUtils";

interface ContactHistoryProps {
    contactedDrivers: any[];
    onContactAgain: (driverId: string, vehicleId?: string) => void;
    onConnectDrivers: () => void;
    onRemoveContact?: (driverId: string) => void;
}

export const ContactHistory: React.FC<ContactHistoryProps> = ({
    contactedDrivers,
    onContactAgain,
    onConnectDrivers,
    onRemoveContact,
}) => {
    const [loadingDriverId, setLoadingDriverId] = useState<string | null>(null);

    const handleViewProfile = (driverId: string, vehicleId?: string) => {
        setLoadingDriverId(driverId);
        onContactAgain(driverId, vehicleId);
        // Loading state will persist until navigation occurs
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
        >
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-xl md:rounded-2xl border border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Contact History
                    </h2>
                    <span className="bg-purple-500/20 text-purple-400 text-xs font-medium px-3 py-1 rounded-full border border-purple-500/30">
                        {contactedDrivers?.length || 0} contacts
                    </span>
                </div>

                {contactedDrivers && contactedDrivers.length > 0 ? (
                    <div className="grid lg:grid-cols-2 gap-4">
                        {contactedDrivers.map((driver: any, index: number) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="relative flex-shrink-0">
                                        {driver.profileImage ? (
                                            <img
                                                src={driver.profileImage}
                                                alt={driver.firstName || "Driver"}
                                                className="w-16 h-16 object-cover rounded-full border-2 border-purple-500/50"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                                                <span className="text-2xl">👨‍✈️</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-white">
                                            {driver.driverName || "Driver"}
                                        </h3>
                                        <p className="text-gray-500 text-xs mt-1">
                                            🚗 {driver.vehicleName || "Vehicle"} {driver.vehicleModel && `• ${driver.vehicleModel}`}
                                        </p>
                                        <p className="text-gray-600 text-xs mt-1">
                                            {formatDate(driver.contactDate || driver.lastContacted)} at {formatTime(driver.contactDate || driver.lastContacted)}
                                        </p>
                                        <div className="flex gap-2 w-full">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleViewProfile(driver.driverId || driver.uid, driver.vehicleId)}
                                                disabled={loadingDriverId === (driver.driverId || driver.uid)}
                                                className={`mt-3 flex-1 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex justify-center items-center ${
                                                    loadingDriverId === (driver.driverId || driver.uid)
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-80'
                                                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                                                }`}
                                            >
                                                {loadingDriverId === (driver.driverId || driver.uid) ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    '👤 View Profile'
                                                )}
                                            </motion.button>
                                            {onRemoveContact && (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveContact(driver.driverId || driver.uid);
                                                    }}
                                                    className="mt-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all border border-red-500/30 hover:border-red-500"
                                                    title="Remove Contact"
                                                >
                                                    🗑️
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">👨‍✈️</div>
                        <p className="text-gray-400 mb-4">No driver contacts yet</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onConnectDrivers}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                        >
                            Connect with Drivers
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.section>
    );
};