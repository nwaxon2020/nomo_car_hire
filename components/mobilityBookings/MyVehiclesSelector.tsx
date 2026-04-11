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

    if (vehicles.length <= 1) return null;

    return (
        <div className="relative mb-6 group">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-gray-500">
                    Active Vehicle Selector
                    {isLocked && <span className="text-[9px] text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">LOCKED (24H)</span>}
                </h3>
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
            </div>

            <div
                ref={scrollRef}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-x-auto no-scrollbar scroll-smooth py-5 px-2"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {vehicles.map((vehicle) => {
                    const isSelected = vehicle.id === selectedVehicleId;
                    const image = vehicle.images?.front ||
                        vehicle.images?.side ||
                        vehicle.images?.back ||
                        vehicle.images?.interior ||
                        getDefaultVehicleImage(vehicle.carType);

                    return (
                        <div
                            key={vehicle.id}
                            onClick={() => {
                                if (!isSelected && !isLocked) {
                                    onSelect(vehicle);
                                }
                            }}
                            className={`flex-shrink-0 transition-all duration-500 ${
                                isSelected 
                                ? 'scale-105 z-10 cursor-default' 
                                : isLocked 
                                    ? 'scale-95 opacity-30 grayscale cursor-not-allowed' 
                                    : 'scale-95 opacity-60 hover:opacity-100 hover:scale-100 cursor-pointer'
                                }`}
                        >
                            <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                                isSelected
                                ? 'border-emerald-500 shadow-xl shadow-emerald-500/40'
                                : isLocked
                                    ? 'border-gray-800 bg-gray-900 border-dashed'
                                    : 'border-gray-800 bg-gray-900'
                                }`}>
                                <div className="relative h-20 sm:h-48 bg-gray-800">
                                    <Image
                                        src={image}
                                        alt={vehicle.carName}
                                        fill
                                        className="object-cover"
                                    />
                                    {isSelected && (
                                        <div className="absolute top-1 right-1 bg-emerald-500 text-white p-1 rounded-full shadow-sm">
                                            <FaCheckCircle size={10} />
                                        </div>
                                    )}
                                </div>
                                <div className={`p-2 text-center transition-colors ${
                                    isSelected 
                                    ? 'bg-emerald-500 text-white' 
                                    : isLocked 
                                        ? 'bg-gray-900 text-gray-600 border-t border-gray-800' 
                                        : 'bg-gray-900 text-gray-400 border-t border-gray-800 hover:text-white'
                                    }`}>
                                    <p className="text-[10px] sm:text-xs font-black uppercase truncate tracking-tighter mb-0.5">
                                        {vehicle.carName}
                                    </p>
                                    {isSelected ? (
                                        <p className="text-[8px] sm:text-[10px] font-bold text-emerald-100 uppercase leading-none">
                                            Active Vehicle
                                        </p>
                                    ) : (
                                        <p className={`text-[8px] sm:text-[10px] font-bold uppercase leading-none ${isLocked ? 'text-red-900' : 'text-gray-500'}`}>
                                            {isLocked ? "Locked" : "Tap to Switch"}
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
