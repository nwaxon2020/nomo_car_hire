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
    onSelect,
    onPreChat,
    onWhatsApp,
    onCall,
    onFlag
}: BookingCardProps) {
    const vehicleImages = getVehicleImages(vehicle);
    const vipLevel = Math.max(driver.vipLevel || 0, driver.purchasedVipLevel || 0);
    const distance = customerLocation 
        ? calculateDistance(customerLocation.lat, customerLocation.lng, driver.location?.latitude || 0, driver.location?.longitude || 0)
        : null;

    // Dynamic styling based on VIP level
    const isBlackVip = vipLevel === 5;
    const isGoldVip = vipLevel === 4;
    
    let cardBg = "bg-white";
    let borderColor = "border-gray-200";
    let accentColor = "text-blue-600";
    let badgeBg = "bg-blue-600";

    if (isBlackVip) {
        cardBg = "bg-gradient-to-br from-gray-900 via-gray-800 to-black";
        borderColor = "border-amber-500/50 shadow-amber-500/10 shadow-lg";
        accentColor = "text-amber-400";
        badgeBg = "bg-amber-500";
    } else if (isGoldVip) {
        cardBg = "bg-gradient-to-br from-amber-50/50 to-amber-100/50";
        borderColor = "border-amber-300 shadow-amber-200/50 shadow-md";
        accentColor = "text-amber-600";
        badgeBg = "bg-amber-600";
    } else if (vipLevel >= 1) {
        cardBg = "bg-gradient-to-br from-purple-50/50 to-violet-100/50";
        borderColor = "border-purple-300 shadow-purple-200/50 shadow-md";
        accentColor = "text-purple-600";
        badgeBg = "bg-purple-600";
    }

    return (
        <div className={`${cardBg} rounded-xl max-rounded-xl shadow-sm md:shadow-md overflow-hidden border ${borderColor} hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 group`}>
            {/* Car Image Section */}
            <div className="relative h-44 sm:h-52 w-full overflow-hidden">
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
            <div className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className={`font-black uppercase tracking-tight text-lg leading-tight ${isBlackVip ? 'text-white' : 'text-gray-900'}`}>
                            {vehicle.carName} {vehicle.carModel}
                        </h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isBlackVip ? 'text-amber-400/80' : 'text-gray-500'}`}>
                            {vehicle.carType} • {vehicle.exteriorColor}
                        </p>
                    </div>
                    { (driver.averageRating ?? 0) > 0 && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isBlackVip ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'} border border-amber-500/20`}>
                            <FaStar size={10} />
                            <span className="font-black text-xs">{(driver.averageRating ?? 0).toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <div className={`grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl border ${isBlackVip ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isBlackVip ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                            <FaUsers className={isBlackVip ? 'text-amber-400' : 'text-gray-400'} size={12} />
                        </div>
                        <span className={`text-xs font-bold ${isBlackVip ? 'text-gray-300' : 'text-gray-600'}`}>{vehicle.passengers} Seats</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isBlackVip ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                            <FaSnowflake className={vehicle.ac ? 'text-green-500' : 'text-red-400'} size={12} />
                        </div>
                        <span className={`text-xs font-bold ${isBlackVip ? 'text-gray-300' : 'text-gray-600'}`}>{vehicle.ac ? 'AC Active' : 'No AC'}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                    <button
                        onClick={() => onSelect(driver, vehicle)}
                        className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                            isBlackVip 
                                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20' 
                                : 'bg-gray-900 hover:bg-black text-white'
                        }`}
                    >
                        View Details
                        <FaChevronRight size={10} />
                    </button>
                    
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => onPreChat(driver, vehicle)}
                            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider ${
                                isBlackVip 
                                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            <FaComment /> Chat
                        </button>
                        <button 
                            onClick={() => driver.whatsappPreferred ? onWhatsApp(driver, vehicle) : onCall(driver.phoneNumber)}
                            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider ${
                                isBlackVip 
                                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-600'
                            }`}
                        >
                            {driver.whatsappPreferred ? <FaWhatsapp /> : <FaPhone />} {driver.whatsappPreferred ? "WhatsApp" : "Call"}
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onFlag(driver, vehicle);
                            }}
                            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider ${
                                isBlackVip 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                                    : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
                            }`}
                        >
                            <FaFlag /> Flag
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
