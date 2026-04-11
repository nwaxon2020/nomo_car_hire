"use client"
import React from 'react';
import { FaSearch, FaSnowflake, FaCheckCircle, FaFilter } from 'react-icons/fa';

interface SearchFiltersProps {
    searchLocation: string;
    setSearchLocation: (val: string) => void;
    selectedCategory: string;
    setSelectedCategory: (val: string) => void;
    showACOnly: boolean;
    setShowACOnly: (val: boolean) => void;
    showVerifiedOnly: boolean;
    setShowVerifiedOnly: (val: boolean) => void;
    filteredDriversCount: number;
}

export default function SearchFilters({
    searchLocation,
    setSearchLocation,
    selectedCategory,
    setSelectedCategory,
    showACOnly,
    setShowACOnly,
    showVerifiedOnly,
    setShowVerifiedOnly,
    filteredDriversCount
}: SearchFiltersProps) {
    return (
        <div className="p-3 sm:px-6 sm:py-3 bg-gray-950 border border-white/5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
                <FaFilter className="text-purple-400 text-xs" />
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Filter Vehicles</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Search Location */}
                <div className="relative">
                    <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-purple-500 text-xs pointer-events-none" />
                    <input
                        type="text"
                        placeholder="City, state or location..."
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all"
                    />
                </div>

                {/* Car Category */}
                <div>
                    <select
                        className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all appearance-none cursor-pointer"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="all" className="bg-gray-900">All Categories</option>
                        <option value="sedan" className="bg-gray-900">Sedan</option>
                        <option value="bus" className="bg-gray-900">Bus</option>
                        <option value="suv" className="bg-gray-900">SUV</option>
                        <option value="truck" className="bg-gray-900">Truck</option>
                        <option value="van" className="bg-gray-900">Van</option>
                        <option value="keke" className="bg-gray-900">Keke</option>
                        <option value="luxury" className="bg-gray-900">Luxury</option>
                    </select>
                </div>

                {/* Toggle Filters */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowACOnly(!showACOnly)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${showACOnly
                            ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                            : 'bg-gray-900 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                            }`}
                    >
                        <FaSnowflake className={showACOnly ? 'text-blue-400' : 'text-gray-600'} />
                        AC Only
                    </button>
                    <button
                        onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${showVerifiedOnly
                            ? 'bg-green-500/20 border-green-400/50 text-green-300'
                            : 'bg-gray-900 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
                            }`}
                    >
                        <FaCheckCircle className={showVerifiedOnly ? 'text-green-400' : 'text-gray-600'} />
                        Verified
                    </button>
                </div>

                {/* Results Count */}
                <div className="w-full flex items-center justify-end">
                    <div className="w-full flex items-center justify-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        <span className="text-purple-300 font-black text-sm">
                            {filteredDriversCount} <span className="text-[10px] text-purple-400/70 uppercase tracking-widest">{filteredDriversCount === 1 ? 'car' : 'cars'} found</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
