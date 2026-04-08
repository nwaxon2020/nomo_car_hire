"use client"
import React from 'react';
import { FaSearch, FaSnowflake, FaCheckCircle } from 'react-icons/fa';

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
        <div className="mt-8 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 lg:grid-cols-4 md:items-center gap-4">
                {/* Search Location */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by city, state, or location..."
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder:text-gray-400 placeholder:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                    <FaSearch className="absolute top-5 left-3 text-gray-400" />
                </div>

                {/* Select Car category */}
                <div>
                    <select
                        className="text-gray-700 outline-blue-600 w-full p-3 border-2 border-gray-300 rounded-lg"
                        name="category"
                        id="category"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="sedan">Sedan</option>
                        <option value="bus">Bus</option>
                        <option value="suv">SUV</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="keke">Keke</option>
                        <option value="luxury">Luxury</option>
                    </select>
                </div>

                {/* Filter Checkboxes */}
                <div className="flex flex-col space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showACOnly}
                            onChange={(e) => setShowACOnly(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700 font-medium flex items-center">
                            <FaSnowflake className="mr-2 text-blue-500" />
                            AC Cars Only
                        </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showVerifiedOnly}
                            onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-gray-700 font-medium flex items-center">
                            <FaCheckCircle className="mr-2 text-green-500" />
                            Verified Drivers Only
                        </span>
                    </label>
                </div>

                {/* Results Count */}
                <div className="flex items-center justify-end">
                    <span className="text-gray-600 font-semibold">
                        {filteredDriversCount} {filteredDriversCount === 1 ? 'car' : 'cars'} available
                    </span>
                </div>
            </div>
        </div>
    );
}
