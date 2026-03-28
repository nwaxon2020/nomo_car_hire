// components/profile/TripHistory.tsx
"use client";

import { motion } from "framer-motion";
import TripHistoryCard from "@/components/map/TripHistoryCard";

interface TripHistoryProps {
    trips: any[];
    loading: boolean;
    onRateTrip: (driverId: string, vehicleId: string) => void;
    onBookTrip: () => void;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
    trips,
    loading,
    onRateTrip,
    onBookTrip,
}) => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
        >
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-xl md:rounded-2xl border border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Trip History
                    </h2>
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full border border-blue-500/30">
                        {trips.length} trips
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-gray-400 mt-4">Loading trip history...</p>
                    </div>
                ) : trips.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {trips.map((trip, index) => (
                            <motion.div
                                key={trip.id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <TripHistoryCard
                                    trip={trip}
                                    onRateTrip={() => onRateTrip(trip.driverId, trip.vehicleId)}
                                />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">🚗</div>
                        <p className="text-gray-400 mb-4">No trip history yet</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onBookTrip}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-cyan-700 transition-all"
                        >
                            Book Your First Trip
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.section>
    );
};