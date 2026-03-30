// components/driver/DriverHeader.tsx
import React from 'react';
import { VIPStar } from './VIPStar';
import ShareButton from '@/components/sharebutton';

interface DriverHeaderProps {
    driverData: any;
    vipLevel: number;
    prestigeLevel: number;
    isVerified: boolean;
    referralCount: number;
    customersCarried: number;
    averageRating: string;
    ratingsCount: number;
    vehiclesCount: number;
    canAddVehicle: boolean;
    onAddVehicle: () => void;
    onUpgradeVIP: () => void;
    onPlayGame: () => void;
    onEditLocation: () => void;
    isEditingLocation: boolean;
    editingLocationData: { city: string; state: string };
    onLocationChange: (field: string, value: string) => void;
    onUpdateLocation: () => void;
    onCancelLocationEdit: () => void;
    isSavingLocation: boolean;
    whatsappPreferred: boolean;
    onToggleWhatsapp: () => void;
    vipDetails: any;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({
    driverData,
    vipLevel,
    prestigeLevel,
    isVerified,
    referralCount,
    customersCarried,
    averageRating,
    ratingsCount,
    vehiclesCount,
    canAddVehicle,
    onAddVehicle,
    onUpgradeVIP,
    onPlayGame,
    onEditLocation,
    isEditingLocation,
    editingLocationData,
    onLocationChange,
    onUpdateLocation,
    onCancelLocationEdit,
    isSavingLocation,
    whatsappPreferred,
    onToggleWhatsapp,
    vipDetails
}) => {
    return (
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Profile Info */}
                <div className="lg:w-1/2">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-4">
                        <div className="relative">
                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                                {driverData?.profileImage ? (
                                    <img
                                        src={driverData.profileImage}
                                        alt="Driver Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {driverData?.firstName?.charAt(0).toUpperCase() || "D"}
                                        {driverData?.lastName?.charAt(0).toUpperCase() || "D"}
                                    </div>
                                )}
                            </div>
                            {isVerified && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                    ✓
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h1 className="text-2xl font-bold text-gray-800">
                                    {driverData?.fullName || "Professional Driver"}
                                </h1>
                                {vipLevel > 0 && (
                                    <VIPStar level={vipLevel} prestigeLevel={prestigeLevel} size="md" showLabel={true} />
                                )}
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <p className="text-gray-600 text-sm">
                                    📍 {driverData?.city || "City not specified"}, {driverData?.state || "State not specified"}
                                </p>
                                <button
                                    onClick={onEditLocation}
                                    className="text-blue-500 hover:text-blue-700 text-sm font-semibold flex items-center gap-1 transition-colors"
                                >
                                    ✏️ Edit
                                </button>
                            </div>

                            {isEditingLocation && (
                                <div className="mb-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={editingLocationData.city}
                                                onChange={(e) => onLocationChange('city', e.target.value)}
                                                placeholder="City"
                                                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={editingLocationData.state}
                                                onChange={(e) => onLocationChange('state', e.target.value)}
                                                placeholder="State"
                                                className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={onUpdateLocation}
                                            disabled={isSavingLocation}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {isSavingLocation ? "Saving..." : "Update"}
                                        </button>
                                        <button
                                            onClick={onCancelLocationEdit}
                                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${isVerified
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'}`}>
                                    {isVerified ? '✓ Verified Driver' : 'Unverified'}
                                </span>
                            </div>

                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Progress to {vipLevel > 0 ? vipDetails.nextLevelName : 'Green VIP'}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {referralCount}/{vipLevel > 0 ? vipDetails.referralsForNext : 15} referrals
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                                        style={{
                                            width: `${vipLevel > 0 ? vipDetails.progressPercentage :
                                                Math.min((referralCount / 15) * 100, 100)}%`
                                        }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    {vipLevel > 0
                                        ? `${vipDetails.nextReferralsNeeded} more referrals for next level`
                                        : `${15 - referralCount} more referrals to become Green VIP`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Preference Toggle */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 text-lg">📱</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">WhatsApp Preferred</p>
                                    <p className="text-xs text-gray-600">
                                        {whatsappPreferred
                                            ? "Passengers can contact you via WhatsApp"
                                            : "Passengers contact you via regular calls"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onToggleWhatsapp}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${whatsappPreferred ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ${whatsappPreferred ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Stats Grid */}
                <div className="lg:w-1/2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                            <p className="text-xs font-semibold text-yellow-700 mb-2">Rating</p>
                            <p className="text-2xl font-bold text-gray-800">{averageRating}</p>
                            <p className="text-xs text-gray-500 mt-1">⭐ ({ratingsCount} reviews)</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                            <p className="text-xs font-semibold text-green-700 mb-2">Customers</p>
                            <p className="text-2xl font-bold text-gray-800">{customersCarried}</p>
                            <p className="text-xs text-gray-500 mt-1">Total passengers</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                            <p className="text-xs font-semibold text-purple-700 mb-2">Referrals</p>
                            <p className="text-2xl font-bold text-gray-800">{referralCount}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                <div
                                    className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all"
                                    style={{
                                        width: `${vipLevel > 0 ? vipDetails.progressPercentage :
                                            Math.min((referralCount / 15) * 100, 100)}%`
                                    }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {vipLevel > 0 ? `VIP Level ${vipLevel}` : `Need ${15 - referralCount} more for VIP`}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                            <p className="text-xs font-semibold text-blue-700 mb-2">Vehicles</p>
                            <p className="text-2xl font-bold text-gray-800">{vehiclesCount}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {vipLevel === 0
                                    ? `${Math.max(0, 2 - vehiclesCount)} more available`
                                    : vipLevel <= 3
                                        ? `${Math.max(0, 10 - vehiclesCount)} more available`
                                        : 'Unlimited'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="w-full lg:w-auto">
                        <ShareButton
                            userId={driverData?.id}
                            title="Book a Professional Driver on Nomopoventures!"
                            text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <button
                            onClick={onAddVehicle}
                            className="flex-1 lg:flex-none bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2.5 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all text-sm font-medium shadow-md"
                        >
                            + Add Vehicle {!canAddVehicle && `(${vehiclesCount} added)`}
                        </button>

                        <button
                            onClick={onUpgradeVIP}
                            className="flex-1 lg:flex-none bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all text-sm font-medium shadow-md"
                        >
                            {vipLevel > 0 ? '⭐ Upgrade VIP' : '🌟 Become VIP'}
                        </button>

                        <button
                            onClick={onPlayGame}
                            className="flex-1 lg:flex-none bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2.5 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium shadow-md"
                        >
                            🎮 Play Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};