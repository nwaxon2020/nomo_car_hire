import React from 'react';
import { VIPStar, getVehicleLimit } from './VIPStar';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import ShareButton from '@/components/sharebutton';
import { FaWhatsapp, FaMapMarkerAlt, FaUsers, FaStar, FaCar, FaUserCheck } from 'react-icons/fa';

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
    onUpgradeVIP: () => void;
    onPlayGame: () => void;
    onBuyTicket: () => void;
    whatsappPreferred: boolean;
    onToggleWhatsapp: () => void;
    vipDetails: any;
    onMarkContacted?: () => void;
    isContacted?: boolean;
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
    onUpgradeVIP,
    onPlayGame,
    onBuyTicket,
    whatsappPreferred,
    onToggleWhatsapp,
    vipDetails,
    onMarkContacted,
    isContacted
}) => {
    // Vehicle limit shown in stats
    const maxVehicles = getVehicleLimit(vipLevel);

    // FIX: Fallback check for the ID to prevent "NO-ID" errors
    const effectiveUserId = driverData?.uid || driverData?.id || "";

    return (
        <div className="bg-slate-900 border border-emerald-500/20 shadow-2xl rounded md:rounded-xl px-3 py-5 md:p-6 mb-8 overflow-hidden relative">

            {/* Subtle Premium Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -z-10" />

            {/* Flag Alert Banner */}
            {(driverData?.flags > 0 || driverData?.status === 'flagged') && (
                <div className="relative z-20 bg-red-600/90 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-3 border-b border-red-500/50 overflow-hidden mx-[-12px] md:mx-[-24px] mt-[-20px] md:mt-[-24px] mb-6">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <span className="text-white text-lg animate-pulse">🚩</span>
                    <div className="flex flex-col md:flex-row items-center gap-2">
                        <span className="text-white font-black uppercase italic text-[10px] tracking-widest">
                            Account Flagged
                        </span>
                        {driverData.flagReason && (
                            <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] text-white font-medium border border-white/20">
                                Reason: {driverData.flagReason}
                            </span>
                        )}
                    </div>
                    <div className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-[9px] text-white font-black uppercase tracking-tighter">
                        {driverData.flags || 1} Reports
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                {/* Left Column - Profile Info */}
                <div className="lg:w-1/2 flex flex-col gap-5 ">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-2 border-emerald-500/30 p-1 bg-slate-800 shadow-2xl">
                                {driverData?.profileImage ? (
                                    <img
                                        src={driverData.profileImage}
                                        alt="Driver Profile"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-emerald-400 text-3xl font-black">
                                        {driverData?.firstName?.charAt(0).toUpperCase() || "D"}
                                    </div>
                                )}
                            </div>
                            {/* Blue Verified Badge */}
                            {isVerified && (
                                <div className="absolute bottom-1 right-1 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg">
                                    <FaUserCheck className="text-xs" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <div className="relative flex flex-col sm:flex-row items-center gap-3 mb-2">
                                <h1 className="text-3xl font-black text-white tracking-tight">
                                    {driverData?.fullName || "Professional Driver"}
                                </h1>
                                <div className='md:absolute top-10 right-0'>
                                    {vipLevel > 0 && (
                                        <VIPStar level={vipLevel} prestigeLevel={prestigeLevel} size="md" showLabel={true} />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 mb-4">
                                <FaMapMarkerAlt className="text-emerald-500" />
                                <span className="text-sm font-medium tracking-wide uppercase">
                                    {driverData?.city || "Unknown City"}, {driverData?.state || "State"}
                                </span>
                            </div>

                            {/* VIP Progress Bar */}
                            <div className="w-full max-w-sm">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Level Progress
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-400">
                                        {referralCount}/{vipLevel > 0 ? vipDetails.referralsForNext : 15}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 border border-white/5">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-1000"
                                        style={{
                                            width: `${vipLevel > 0 ? vipDetails.progressPercentage :
                                                Math.min((referralCount / 15) * 100, 100)}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Preference */}
                    <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${whatsappPreferred ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                <FaWhatsapp className="text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight">WhatsApp Priority</p>
                                <p className="text-xs text-slate-400">
                                    {whatsappPreferred ? "Instant WhatsApp messaging enabled" : "Standard phone calls only"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onToggleWhatsapp}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 focus:outline-none ${whatsappPreferred ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ${whatsappPreferred ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                </div>

                {/* Right Column - Stats Grid */}
                <div className="lg:w-1/2">
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                        {[
                            { label: 'Rating', val: averageRating, sub: `${ratingsCount} reviews`, icon: <FaStar />, color: 'from-amber-400/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
                            { label: 'Passengers', val: customersCarried, sub: 'Total Bookings', icon: <FaUsers />, color: 'from-emerald-400/20 to-teal-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                            { label: 'Referrals', val: referralCount, sub: `Level ${vipLevel || 0}`, icon: <FaStar />, color: 'from-purple-400/20 to-indigo-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
                            { label: 'Vehicles', val: vehiclesCount, sub: `Limit: ${maxVehicles}`, icon: <FaCar />, color: 'from-blue-400/20 to-cyan-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
                        ].map((stat, i) => (
                            <div key={i} className={`bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl p-3 flex flex-col justify-center items-center text-center backdrop-blur-sm group hover:scale-[1.02] transition-transform`}>
                                <div className={`${stat.text} flex items-center justify-center gap-2 text-lg mb-1 opacity-80 group-hover:opacity-100`}>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                    <p>{stat.icon}</p>
                                </div>

                                <p className="text-2xl font-black text-white">{stat.val}</p>
                                <p className="text-[9px] text-slate-400 mt-1 font-medium">{stat.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Buttons Section */}
            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="w-full lg:w-auto flex flex-col gap-2">
                    <ExpiryCountdown userData={driverData} />
                    {/* UPDATED: Passing the effectiveUserId which checks both uid and id */}
                    <ShareButton
                        userId={effectiveUserId}
                        title="Book a Professional Driver on NOMO CARS!"
                        text={`Need a reliable driver? Book ${driverData?.fullName || 'me'} on Nomo Cars! 🚗✨`}
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 justify-center sm:justify-end gap-2 md:gap-3 md:gap-4 w-full lg:w-auto">
                    <button
                        onClick={onBuyTicket}
                        className="mb-3 md:mb-0 px-3 md:px-6 py-4 md:py-3 col-span-2 sm:col-span-1 rounded-md md:rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)]"
                    >
                        🎫 Buy Ticket
                    </button>

                    <button
                        onClick={onUpgradeVIP}
                        className="px-3 md:px-6 py-3 rounded-md md:rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)]"
                    >
                        {vipLevel > 0 ? '⭐ Upgrade VIP' : '🌟 Become VIP'}
                    </button>

                    <button
                        onClick={onPlayGame}
                        className="px-3 md:px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md md:rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                    >
                        🎮 Play Game
                    </button>


                </div>
            </div>
        </div>
    );
};