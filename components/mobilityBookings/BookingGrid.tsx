"use client"
import React from 'react';
import { FaCar } from 'react-icons/fa';
import BookingCard from './BookingCard';
import { Driver, VehicleLog, DriverWithVehicle } from './types';

interface BookingGridProps {
    filteredDrivers: { driver: DriverWithVehicle; vehicle: VehicleLog }[];
    currentUser: any;
    customerLocation: { lat: number; lng: number } | null;
    onBook: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onSelect: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onPreChat: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onWhatsApp: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
    onCall: (phone: string) => void;
    onFlag: (driver: DriverWithVehicle, vehicle: VehicleLog) => void;
}

export default function BookingGrid({
    filteredDrivers,
    currentUser,
    customerLocation,
    onBook,
    onSelect,
    onPreChat,
    onWhatsApp,
    onCall,
    onFlag
}: BookingGridProps) {
    return (
        <div id="search-results" className="p-3 px-1 pt-0 max-h-[65rem] overflow-y-auto">
            {filteredDrivers.length === 0 ? (
                <div className="text-center py-12">
                    <FaCar className="text-5xl text-gray-300 mb-4 mx-auto" />
                    <h3 className="text-xl text-gray-600 mb-2">No Cars Found</h3>
                    <p className="text-gray-500">Try adjusting your search filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {filteredDrivers.map(({ driver, vehicle }, index) => (
                        <BookingCard
                            key={`${driver.id}-${vehicle.id}-${index}`}
                            driver={driver}
                            vehicle={vehicle}
                            currentUser={currentUser}
                            customerLocation={customerLocation}
                            onBook={onBook}
                            onSelect={onSelect}
                            onPreChat={onPreChat}
                            onWhatsApp={onWhatsApp}
                            onCall={onCall}
                            onFlag={onFlag}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
