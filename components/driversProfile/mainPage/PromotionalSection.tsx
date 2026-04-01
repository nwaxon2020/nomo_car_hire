// components/driverProfile/PromotionalSection.tsx
import React from 'react';
import ShareButton from '@/components/sharebutton';

interface PromotionalSectionProps {
    driverId: string;
    vipLevel: number;
    onUpgradeVIP: () => void;
}

export const PromotionalSection: React.FC<PromotionalSectionProps> = ({
    driverId,
    vipLevel,
    onUpgradeVIP
}) => {
    return (
        <>
            {/* Promotion Cards Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl overflow-hidden shadow-lg">
                    <div className="h-40 bg-blue-100 overflow-hidden">
                        <img
                            src="/driverShareProfile.jpeg"
                            alt="Driver Sharing Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg">
                                🔗
                            </div>
                            <h3 className="font-bold text-blue-800">Share Link to Upgrade Your VIP Status</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            Share your driver profile! Get referrals to climb VIP levels. Higher VIP levels get priority in search results and more bookings!
                        </p>
                        <div className="mt-4">
                            <ShareButton
                                userId={driverId}
                                title="Book a Professional Driver on *NOMO CARS*!"
                                text="Need a reliable driver? Book with me on Nomo Cars! I provide safe, comfortable rides with professional service. Use my link to book your ride! 🚗✨"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl overflow-hidden shadow-lg">
                    <div className="h-40 bg-yellow-100 overflow-hidden">
                        <img
                            src="/vipcard.avif"
                            alt="VIP Driver Benefits"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-lg">
                                ⭐
                            </div>
                            <h3 className="font-bold text-yellow-800">
                                {vipLevel > 0 ? 'Upgrade Your VIP Level' : 'Become a VIP Driver'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            VIP drivers appear first in search results and get more bookings! Upgrade your VIP level to get started
                        </p>
                        <button
                            onClick={onUpgradeVIP}
                            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-2.5 rounded-xl font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md"
                        >
                            {vipLevel > 0 ? 'Upgrade VIP Level' : 'Become VIP'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-center shadow-xl border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-3">
                    We're Here to Help
                </h2>
                <p className="text-gray-300 mb-6 leading-relaxed">
                    For complaints, enquiries, reports and much more — our team is available
                    <span className="text-white font-semibold"> 24/7</span>.
                </p>
                <a
                    href="mailto:nomopoventures@yahoo.com"
                    className="inline-block bg-red-700 hover:bg-red-600 px-8 py-3 rounded-xl text-white font-semibold transition-all shadow-lg"
                >
                    Contact Us Today!
                </a>
            </div>
        </>
    );
};