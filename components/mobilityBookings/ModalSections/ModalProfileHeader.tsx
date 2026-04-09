"use client"
import Image from 'next/image';
import {
    FaMapMarkerAlt, FaPhone, FaWhatsapp, FaEnvelope,
    FaCheckCircle, FaTimesCircle, FaComment
} from 'react-icons/fa';
import VIPStar from '../ui/VIPStar';
import { Driver, VehicleLog } from '../types';

interface ModalProfileHeaderProps {
    driver: Driver;
    vehicle: VehicleLog;
    onSetDriverInfo: (v: boolean) => void;
    onSetPreChat: (v: boolean) => void;
    onPhoneCall: (p: string) => void;
    onWhatsAppMessage: (d: any, v: any) => void;
    getDriverAddress: (d: any) => string;
}

export default function ModalProfileHeader({
    driver,
    vehicle,
    onSetDriverInfo,
    onSetPreChat,
    onPhoneCall,
    onWhatsAppMessage,
    getDriverAddress
}: ModalProfileHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Driver Image */}
            <div className="flex-shrink-0">
                <Image
                    src={driver.profileImage || "/per.png"}
                    alt="Driver's profile picture"
                    width={150}
                    height={150}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-700"
                />
            </div>

            {/* Driver Info */}
            <div className="relative flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">{driver.firstName} {driver.lastName}</h1>
                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-400">
                        <FaMapMarkerAlt className="mr-2 text-gray-400" />
                        <span>{getDriverAddress(driver)}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                        <FaPhone className="mr-3 text-gray-400" />
                        <span className="font-medium">{driver.phoneNumber}</span>
                        {driver.whatsappPreferred && (
                            <span className="ml-2 text-xs text-green-400 flex items-center">
                                <FaWhatsapp className="mr-1" /> WhatsApp Available
                            </span>
                        )}
                    </div>
                    {driver.email && (
                        <div className="flex items-center text-gray-300">
                            <FaEnvelope className="mr-3 text-gray-400" />
                            <span>{driver.email}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${driver.verified ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                            {driver.verified ? (
                                <>
                                    <FaCheckCircle className="mr-2 inline" />
                                    Verified Driver
                                </>
                            ) : (
                                <>
                                    <FaTimesCircle className="mr-2 inline" />
                                    Not Verified
                                </>
                            )}
                        </span>

                        {driver.vipLevel && driver.vipLevel > 0 && (
                            <VIPStar
                                vipLevel={driver.vipLevel}
                                prestigeLevel={driver.prestigeLevel || 0}
                                size="md"
                            />
                        )}
                    </div>
                </div>

                {/* Contact Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {/* Pre-Chat Button */}
                    <button
                        onClick={() => {
                            onSetDriverInfo(false);
                            setTimeout(() => onSetPreChat(true), 300);
                        }}
                        className="py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                        <FaComment className="mr-2" />
                        Chat with Driver
                    </button>

                    {/* Call Driver Button */}
                    <button
                        onClick={() => onPhoneCall(driver.phoneNumber)}
                        className="py-3 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                    >
                        <FaPhone className="mr-2" />
                        Call Driver
                    </button>

                    {/* Direct WhatsApp */}
                    {driver.whatsappPreferred && (
                        <div className="absolute top-0 right-1 md:static">
                            <button
                                onClick={() => onWhatsAppMessage(driver, vehicle)}
                                className="w-12 h-12 md:w-full text-white font-semibold rounded-full md:rounded-lg transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
                            >
                                <FaWhatsapp className="text-4xl md:text-sm md:mr-2" /> <span className="hidden md:block">WhatsApp</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
