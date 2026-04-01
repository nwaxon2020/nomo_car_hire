// components/driverProfile/HistorySection.tsx
import React from 'react';
import TripHistoryCard from '@/components/map/TripHistoryCard';
import { useRouter } from 'next/navigation';

interface HistorySectionProps {
    contactedDrivers: any[];
    tripHistory: any[];
    loadingTripHistory: boolean;
    formatDate: (timestamp: any) => string;
    onRateTrip: (driverId: string, vehicleId: string) => void;
    comments: any[];
    formatDateFn: (timestamp: any) => string;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
    contactedDrivers,
    tripHistory,
    loadingTripHistory,
    formatDate,
    onRateTrip,
    comments,
    formatDateFn
}) => {
    const router = useRouter();

    return (
        <>
            {/* Contact History and Trip History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Contact History */}
                <section className="bg-white shadow-xl rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Drivers You Contacted</h2>

                    {contactedDrivers.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-4xl mb-2">👨‍✈️</div>
                            <p className="text-gray-500 text-sm">You haven't contacted any drivers yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {contactedDrivers.map((driver, index) => (
                                <div
                                    key={index}
                                    className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                                                <span className="text-2xl">👨‍✈️</span>
                                            </div>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-800">
                                                {driver.driverName || "Driver"}
                                            </h3>
                                            <p className="text-gray-600 text-xs mt-0.5">
                                                📱 {driver.phoneNumber || "No phone"}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1 truncate">
                                                🚗 {driver.vehicleName || "Vehicle"} • {driver.vehicleModel}
                                            </p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                📅 {formatDate(driver.contactDate || driver.lastContacted)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Trip History */}
                <section className="bg-white shadow-xl rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Trip History</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                            {tripHistory.length} trips
                        </span>
                    </div>

                    {loadingTripHistory ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading trip history...</p>
                        </div>
                    ) : tripHistory.length > 0 ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {tripHistory.map((trip, index) => (
                                <TripHistoryCard
                                    key={trip.id || index}
                                    trip={trip}
                                    onRateTrip={() => onRateTrip(trip.driverId, trip.vehicleId)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-dashed border-gray-300">
                            <div className="text-gray-400 text-5xl mb-3">🚗</div>
                            <p className="text-gray-500 text-sm mb-3">No trip history yet</p>
                            <button
                                onClick={() => router.push('/user/car-hire')}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md"
                            >
                                Book Your First Trip
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {/* Comments Section */}
            <section className="bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl rounded-2xl p-6 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-2">
                    <h2 className="text-xl font-bold text-white">Customer Comments</h2>
                    {comments.length > 0 && (
                        <div className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded-full">
                            ({comments.length} comments)
                        </div>
                    )}
                </div>

                {comments.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No comments yet.</p>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {comments.slice(0, 5).map((c, index) => (
                            <div key={c.id || index} className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-semibold text-amber-400">
                                        {c.passengerName || 'Anonymous'}
                                    </p>
                                    {c.createdAt && (
                                        <p className="text-xs text-gray-400">
                                            {c.createdAt.toDate ? c.createdAt.toDate().toLocaleDateString() : formatDateFn(c.createdAt)}
                                        </p>
                                    )}
                                </div>
                                <p className="text-sm text-gray-300">{c.text}</p>
                            </div>
                        ))}
                        {comments.length > 5 && (
                            <div className="text-center mt-4">
                                <button className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
                                    View all {comments.length} comments →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );
};