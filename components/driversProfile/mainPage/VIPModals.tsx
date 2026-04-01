// components/driverProfile/VIPModals.tsx
import React from 'react';
import { VIPStar } from '@/components/driversProfile/VIPStar';
import { VIP_CONFIG } from '@/components/driversProfile/driver';
import ShareButton from '@/components/sharebutton';

interface VIPModalsProps {
    showVIPModal: boolean;
    setShowVIPModal: (show: boolean) => void;
    showVIPUpgradeModal: boolean;
    setShowVIPUpgradeModal: (show: boolean) => void;
    vipLevel: number;
    prestigeLevel: number;
    referralCount: number;
    vipDetails: any;
    purchasedVipLevel: number;
    driverId: string;
    onVIPPurchase: (level: number) => void;
}

export const VIPModals: React.FC<VIPModalsProps> = ({
    showVIPModal,
    setShowVIPModal,
    showVIPUpgradeModal,
    setShowVIPUpgradeModal,
    vipLevel,
    prestigeLevel,
    referralCount,
    vipDetails,
    purchasedVipLevel,
    driverId,
    onVIPPurchase
}) => {
    return (
        <>
            {/* VIP Limit Modal */}
            {showVIPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setShowVIPModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                        >
                            ×
                        </button>

                        <div className="text-center mb-4">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <VIPStar level={vipLevel || 1} size="lg" showLabel={false} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                {vipLevel === 0 ? 'Upgrade to VIP Driver' : 'Upgrade VIP Level'}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {vipLevel === 0
                                    ? "You can only add 2 vehicles as a regular driver. Upgrade to VIP to add more vehicles!"
                                    : `You can add up to ${vipLevel <= 3 ? '10' : 'unlimited'} vehicles at VIP Level ${vipLevel}. Upgrade to add more!`}
                            </p>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
                            <h4 className="font-semibold text-green-800 mb-2">VIP Vehicle Limits:</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Regular Driver: <strong>2 vehicles max</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Green/Yellow/Purple VIP: <strong>10 vehicles max</strong></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Gold/Black VIP: <strong>Unlimited vehicles</strong></span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-3">
                            <button
                                onClick={() => setShowVIPModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Maybe Later
                            </button>
                            <button
                                onClick={() => {
                                    setShowVIPModal(false);
                                    setShowVIPUpgradeModal(true);
                                }}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all text-center"
                            >
                                {vipLevel > 0 ? 'Upgrade Level' : 'Become VIP'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIP Upgrade Modal */}
            {showVIPUpgradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setShowVIPUpgradeModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                        >
                            ×
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                {vipLevel > 0 ? 'Upgrade VIP Level' : 'Become a VIP Driver'}
                            </h3>
                            <p className="text-gray-600">Earn through referrals or purchase to level up!</p>
                        </div>

                        {/* Current VIP Status */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <VIPStar level={vipLevel} prestigeLevel={prestigeLevel} size="lg" showLabel={true} />
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Current Status</h4>
                                        <p className="text-sm text-gray-600">
                                            {vipLevel > 0 ? (
                                                vipLevel < VIP_CONFIG.maxLevel ? (
                                                    `Need ${vipDetails.nextReferralsNeeded} more referrals for next level`
                                                ) : (
                                                    `Prestige Level ${prestigeLevel}`
                                                )
                                            ) : (
                                                "Start your VIP journey!"
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center md:text-right">
                                    <div className="text-2xl font-bold text-gray-800">{referralCount}</div>
                                    <div className="text-sm text-gray-600">Total Referrals</div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Progress to {vipLevel > 0 ? vipDetails.nextLevelName : 'Green VIP'}</span>
                                    <span>
                                        {referralCount}/{vipLevel > 0 ? vipDetails.referralsForNext : VIP_CONFIG.levels[0].referralsRequired}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                                        style={{ width: `${vipLevel > 0 ? vipDetails.progressPercentage : (referralCount / VIP_CONFIG.levels[0].referralsRequired) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* VIP Levels Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {VIP_CONFIG.levels.map((level) => {
                                const isCurrentLevel = vipLevel === level.level;
                                const isUnlocked = vipLevel >= level.level;
                                const canPurchase = purchasedVipLevel < level.level;
                                const canEarnByReferral = referralCount >= level.referralsRequired;

                                return (
                                    <div
                                        key={level.level}
                                        className={`border rounded-xl p-4 transition-all duration-300 ${isCurrentLevel
                                            ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                            : isUnlocked
                                                ? 'border-blue-300 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex justify-center mb-3">
                                            <VIPStar level={level.level} size="lg" showLabel={false} />
                                        </div>
                                        <h4 className="text-lg font-semibold text-center mb-2">{level.name}</h4>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Referrals Needed:</span>
                                                <span className={`font-medium ${canEarnByReferral ? 'text-green-600' : ''}`}>
                                                    {level.referralsRequired}
                                                    {canEarnByReferral && ' ✓'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Price:</span>
                                                <span className="font-medium">₦{level.price.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`font-medium ${isCurrentLevel ? 'text-green-600' :
                                                    isUnlocked ? 'text-blue-600' :
                                                        'text-gray-600'
                                                    }`}>
                                                    {isCurrentLevel ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <button
                                                onClick={() => onVIPPurchase(level.level)}
                                                disabled={!canPurchase}
                                                className={`w-full py-2 rounded-lg font-medium transition-all ${!canPurchase
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                                                    }`}
                                            >
                                                {!canPurchase ? 'Already Unlocked' : 'Purchase Now'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mb-6">
                            <h4 className="font-semibold text-purple-800 mb-2">How VIP Works:</h4>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span><strong>Two Ways to Level Up:</strong> Get referrals OR purchase directly</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span><strong>Vehicle Limits:</strong> Regular (2), VIP 1-3 (10), VIP 4-5 (Unlimited)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span><strong>Search Priority:</strong> Higher VIP levels appear first in search results</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <h4 className="font-semibold text-amber-800 mb-2">Earn VIP Through Referrals</h4>
                            <p className="text-sm text-gray-700 mb-3">
                                {vipLevel > 0
                                    ? `You have ${referralCount} referrals. Need ${vipDetails.nextReferralsNeeded} more for next level!`
                                    : `You have ${referralCount} referrals. Need ${VIP_CONFIG.levels[0].referralsRequired - referralCount} more to become Green VIP!`
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <ShareButton
                                        userId={driverId}
                                        title="Book a Professional Driver on Nomopoventures!"
                                        text="Need a reliable driver? Book with me on Nomopoventures! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => setShowVIPUpgradeModal(false)}
                                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};