"use client";
import React, { useRef } from 'react';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight, FaCheckCircle } from 'react-icons/fa';
import { VehicleLog } from './types';
import { getDefaultVehicleImage } from './utils';

interface MyVehiclesSelectorProps {
    vehicles: VehicleLog[];
    selectedVehicleId: string;
    onSelect: (vehicle: VehicleLog) => void;
    isLocked?: boolean;
}

export default function MyVehiclesSelector({
    vehicles,
    selectedVehicleId,
    onSelect,
    isLocked = false
}: MyVehiclesSelectorProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left'
                ? scrollLeft - clientWidth * 0.7
                : scrollLeft + clientWidth * 0.7;

            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative mb-6 group">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-gray-500">
                    Active Vehicle Selector
                    {isLocked && <span className="text-[9px] text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">LOCKED (TODAY)</span>}
                </h3>
                {vehicles.length > 1 && (
                    <div className="hidden md:flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                )}
            </div>

            <div
                ref={scrollRef}
                className={`grid gap-3 overflow-x-auto no-scrollbar scroll-smooth py-5 px-2 ${
                    vehicles.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 sm:grid-cols-3'
                }`}
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {vehicles.map((vehicle) => {
                    const isSelected = vehicle.id === selectedVehicleId;
                    const isApproved = vehicle.isApproved || vehicle.status === 'approved';
                    const isPending = vehicle.status === 'pending';
                    const isRejected = vehicle.status === 'rejected';
                    
                    const image = vehicle.images?.front ||
                        vehicle.images?.side ||
                        vehicle.images?.back ||
                        vehicle.images?.interior ||
                        getDefaultVehicleImage(vehicle.carType);

                    return (
                        <div
                            key={vehicle.id}
                            onClick={() => {
                                if (!isSelected && !isLocked && isApproved) {
                                    onSelect(vehicle);
                                }
                            }}
                            className={`flex-shrink-0 transition-all duration-500 ${
                                isSelected 
                                ? 'scale-105 z-10 cursor-default' 
                                : isLocked || !isApproved
                                    ? 'scale-95 opacity-50 grayscale cursor-not-allowed' 
                                    : 'scale-95 opacity-70 hover:opacity-100 hover:scale-100 cursor-pointer'
                                }`}
                        >
                            <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                                isSelected
                                ? 'border-emerald-500 shadow-xl shadow-emerald-500/40'
                                : isLocked || !isApproved
                                    ? 'border-gray-800 bg-gray-900 border-dashed'
                                    : 'border-white px-2 py-0 border-opacity-5 bg-gray-900'
                                }`}>
                                <div className="relative h-24 sm:h-48 bg-gray-800 overflow-hidden">
                                    <Image
                                        src={image}
                                        alt={vehicle.carName}
                                        fill
                                        className={`object-cover ${!isApproved ? 'opacity-40' : ''}`}
                                    />
                                    
                                    {/* Status Badges */}
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        {isPending && (
                                            <span className="px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Pending Review</span>
                                        )}
                                        {isRejected && (
                                            <span className="px-2 py-1 bg-red-600 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Rejected</span>
                                        )}
                                        {isApproved && !isSelected && (
                                            <span className="px-2 py-1 bg-blue-600 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Ready to Hire</span>
                                        )}
                                    </div>

                                    {isSelected && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-xl animate-bounce">
                                            <FaCheckCircle size={12} />
                                        </div>
                                    )}
                                </div>
                                <div className={`p-3 text-center transition-colors ${
                                    isSelected 
                                    ? 'bg-emerald-500 text-white' 
                                    : !isApproved 
                                        ? 'bg-gray-950 text-gray-600 border-t border-gray-800' 
                                        : 'bg-gray-900 text-gray-400 border-t border-gray-800 hover:text-white'
                                    }`}>
                                    <p className="text-[10px] sm:text-xs font-black uppercase truncate tracking-tight mb-0.5">
                                        {vehicle.carName}
                                    </p>
                                    {isSelected ? (
                                        <p className="text-[8px] sm:text-[10px] font-bold text-emerald-100 uppercase tracking-widest">
                                            Active Booking Car
                                        </p>
                                    ) : (
                                        <p className={`text-[8px] sm:text-[10px] font-bold uppercase ${isLocked || !isApproved ? 'text-gray-600' : 'text-gray-500'}`}>
                                            {isPending ? "Waiting for Approval" : isRejected ? "Action Required" : isLocked ? "Locked for Today" : "Tap to Activate"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
