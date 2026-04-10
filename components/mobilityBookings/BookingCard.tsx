"use client"
import React from 'react';
import Image from 'next/image';
import {
    FaStar, FaCheckCircle, FaUsers, FaSnowflake,
    FaChevronRight, FaComment, FaWhatsapp, FaPhone,
    FaFlag, FaCrown, FaLocationArrow
} from 'react-icons/fa';
import { Driver, VehicleLog, DriverWithVehicle } from './types';
import { getVehicleImages, calculateDistance } from './utils';

interface BookingCardProps {
    driver: DriverWithVehicle;
    vehicle: VehicleLog;
    currentUser: any;
    customerLocation: { lat: number; lng: number } | null;
    onBook: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onSelect: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onPreChat: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onWhatsApp: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onCall: (phone: string) => void;
    onFlag: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
}

export default function BookingCard({
    driver,
    vehicle,
    currentUser,
    customerLocation,
    onBook,
    onSelect,
    onPreChat,
    onWhatsApp,
    onCall,
    onFlag
}: BookingCardProps) {
    const vehicleImages = getVehicleImages(vehicle);
    const vipLevel = Math.max(driver.vipLevel || 0, driver.purchasedVipLevel || 0);
    const distance = customerLocation
        ? calculateDistance(customerLocation.lat, customerLocation.lng, driver.location?.lat || 0, driver.location?.lng || 0)
        : null;

    // Dynamic styling based on VIP level
    const isBlackVip = vipLevel === 5;
    const isGoldVip = vipLevel === 4;

    // Default: purple for all users
    let cardBg = "bg-gradient-to-br from-purple-950 via-violet-900 to-indigo-950";
    let borderColor = "border-purple-700/60 shadow-purple-900/30 shadow-lg";
    let accentColor = "text-purple-300";
    let badgeBg = "bg-purple-600";
    let textColor = "text-white";
    let subTextColor = "text-purple-300/80";
    let gridBg = "bg-white/5 border-white/10";
    let iconBg = "bg-white/10";
    let iconColor = "text-purple-300";

    if (isBlackVip) {
        cardBg = "bg-gradient-to-br from-gray-900 via-gray-800 to-black";
        borderColor = "border-amber-500/50 shadow-amber-500/10 shadow-lg";
        accentColor = "text-amber-400";
        badgeBg = "bg-amber-500";
        textColor = "text-white";
        subTextColor = "text-amber-400/80";
        gridBg = "bg-white/5 border-white/10";
        iconBg = "bg-white/10";
        iconColor = "text-amber-400";
    } else if (isGoldVip) {
        cardBg = "bg-gradient-to-br from-amber-950 via-yellow-900 to-amber-950";
        borderColor = "border-amber-400/50 shadow-amber-500/20 shadow-md";
        accentColor = "text-amber-300";
        badgeBg = "bg-amber-500";
        textColor = "text-white";
        subTextColor = "text-amber-300/80";
        gridBg = "bg-white/5 border-white/10";
        iconBg = "bg-white/10";
        iconColor = "text-amber-400";
    }

    return (
        <div
            className={`${cardBg} rounded-2xl overflow-hidden border ${borderColor} hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 transform group cursor-pointer`}
        >
            <div onClick={() => onSelect(driver, vehicle)}>
                {/* Car Image Section */}
                <div className="relative h-52 sm:h-60 w-full overflow-hidden">
                    <Image
                        src={vehicleImages[0]}
                        alt={`${vehicle.carName} ${vehicle.carModel}`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* VIP and Verified Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                        {driver.verified && (
                            <div className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center shadow-lg border border-white/20">
                                <FaCheckCircle className="mr-1.5" /> Verified
                            </div>
                        )}
                        {isBlackVip && (
                            <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-full flex items-center shadow-lg border border-amber-300/50">
                                <FaCrown className="mr-1.5" /> Premium Black VIP
                            </div>
                        )}
                        {isGoldVip && (
                            <div className="bg-gradient-to-r from-yellow-300 to-amber-500 text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-full flex items-center shadow-lg border border-amber-300/50">
                                <FaCrown className="mr-1.5" /> Gold VIP
                            </div>
                        )}
                        <div className="bg-green-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg border border-white/20">
                            View Details
                        </div>
                    </div>

                    {/* Proximity Badge */}
                    {distance !== null && (
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <FaLocationArrow className="text-blue-400 text-[8px]" />
                            {distance.toFixed(1)} km away
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="px-3 pt-3">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className={`font-black uppercase tracking-tight text-base leading-tight ${textColor}`}>
                                {vehicle.carName} {vehicle.carModel}
                            </h3>
                            <div className="flex items-center gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const rating = Math.round(driver.averageRating || 0);
                                    return (
                                        <FaStar
                                            key={star}
                                            size={10}
                                            className={star <= rating ? "text-amber-400" : "text-gray-500"}
                                        />
                                    );
                                })}
                            </div>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${subTextColor}`}>
                                {vehicle.carType} • {vehicle.exteriorColor}
                            </p>
                        </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 mb-4 p-2 rounded-xl border ${gridBg}`}>
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-lg ${iconBg}`}>
                                <FaUsers className={iconColor} size={10} />
                            </div>
                            <span className={`text-[10px] font-bold ${textColor}`}>{vehicle.passengers} Seats</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-lg ${iconBg}`}>
                                <FaSnowflake className={vehicle.ac ? 'text-green-400' : 'text-red-400'} size={10} />
                            </div>
                            <span className={`text-[10px] font-bold ${textColor}`}>{vehicle.ac ? 'AC' : 'No AC'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className='px-3 pb-3'>
                <div className="space-y-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBook(driver, vehicle);
                        }}
                        className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${isBlackVip
                            ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                            : isGoldVip
                                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                                : 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/30'
                            }`}
                    >
                        Book Car
                        <FaChevronRight size={10} />
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => onPreChat(driver, vehicle)}
                            className="py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider bg-blue-600 border-blue-400 text-white hover:bg-white/20"
                        >
                            <FaComment /> Chat
                        </button>
                        <button
                            onClick={() => driver.whatsappPreferred ? onWhatsApp(driver, vehicle) : onCall(driver.phoneNumber)}
                            className="py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider bg-green-600 border-green-400 text-white hover:bg-green-500/20 hover:border-green-500/30"
                        >
                            {driver.whatsappPreferred ? <FaWhatsapp /> : <FaPhone />} {driver.whatsappPreferred ? "WHATSAPP" : "Call"}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onFlag(driver, vehicle);
                            }}
                            className="py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider bg-red-600 border-red-400 text-white hover:bg-red-500/20"
                        >
                            <FaFlag /> Flag
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
