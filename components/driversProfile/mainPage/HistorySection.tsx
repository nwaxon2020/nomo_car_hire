// components/driverProfile/HistorySection.tsx
import React, { useState } from 'react';
import TripHistoryCard from '@/components/map/TripHistoryCard';
import { useRouter } from 'next/navigation';

interface HistorySectionProps {
    contactedDrivers: any[];
    tripHistory: any[];
    loadingTripHistory: boolean;
    formatDate: (timestamp: any) => string;
    onRateDriver?: (driverId: string, rating: number) => void;
    comments: any[];
    formatDateFn: (timestamp: any) => string;
    onRemoveContact?: (driverId: string) => void;
    onRemoveTrip?: (tripId: string) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
    contactedDrivers,
    tripHistory,
    loadingTripHistory,
    formatDate,
    onRateDriver,
    comments,
    formatDateFn,
    onRemoveContact,
    onRemoveTrip
}) => {
    const router = useRouter();
    const [loadingDriverId, setLoadingDriverId] = useState<string | null>(null);

    const handleViewProfile = (driverId: string, vehicleId?: string) => {
        setLoadingDriverId(driverId);
        if (vehicleId) {
            router.push(`/user/mobility/bookings?driver=${driverId}&vehicle=${vehicleId}&openModal=true`);
        } else {
            router.push(`/user/mobility/bookings?driver=${driverId}&openModal=true`);
        }
    };

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
                                    onClick={() => {
                                        const dId = driver.driverId || driver.uid;
                                        const vId = driver.vehicleId;
                                        handleViewProfile(dId, vId);
                                    }}
                                    className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border transition-all duration-300 ${
                                        loadingDriverId === (driver.driverId || driver.uid)
                                            ? 'border-gray-200 opacity-75 cursor-wait'
                                            : 'border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                                                <span className="text-2xl">👨‍✈️</span>
                                            </div>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-800">
                                                        {driver.driverName || "Driver"}
                                                    </h3>
                                                    <p className="text-gray-500 text-xs mt-1 truncate">
                                                        🚗 {driver.vehicleName || "Vehicle"} • {driver.vehicleModel}
                                                    </p>
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        📅 {formatDate(driver.contactDate || driver.lastContacted)}
                                                    </p>
                                                    <div className="mt-3 inline-flex items-center text-xs font-semibold text-blue-600">
                                                        {loadingDriverId === (driver.driverId || driver.uid) ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                                                Loading Profile...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>View Profile</span>
                                                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {onRemoveContact && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveContact(driver.driverId || driver.uid);
                                                        }}
                                                        className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                        title="Remove Contact"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
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
                                    onRateDriver={onRateDriver}
                                    onRemoveTrip={onRemoveTrip}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-dashed border-gray-300">
                            <div className="text-gray-400 text-5xl mb-3">🚗</div>
                            <p className="text-gray-500 text-sm mb-3">No trip history yet</p>
                            <button
                                onClick={() => router.push('/user/mobility/car-hire')}
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