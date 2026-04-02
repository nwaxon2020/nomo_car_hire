// components/driverProfile/VIPModals.tsx
import React from 'react';
import { VIPStar } from '@/components/driversProfile/VIPStar';

interface VIPModalsProps {
    showVIPModal: boolean;
    setShowVIPModal: (show: boolean) => void;
    vipLevel: number;
    driverId: string;
    onVIPPurchase: (level: number) => void;
}

export const VIPModals: React.FC<VIPModalsProps> = ({
    showVIPModal,
    setShowVIPModal,
    vipLevel,
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
                                    onVIPPurchase(0);
                                }}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all text-center"
                            >
                                {vipLevel > 0 ? 'Upgrade Level' : 'Become VIP'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};