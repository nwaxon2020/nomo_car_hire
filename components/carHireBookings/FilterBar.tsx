"use client";

import { Car, AlertCircle, Calendar, Navigation, MapPin } from 'lucide-react';

interface FilterBarProps {
  stats: {
    active: number;
    urgent: number;
    todayRequests: number;
  };
  filter: "all" | "urgent" | "nearby";
  setFilter: (filter: "all" | "urgent" | "nearby") => void;
  isDriver: boolean;
  driverState?: string;
  driverCity?: string;
}

export default function FilterBar({
  stats,
  filter,
  setFilter,
  isDriver,
  driverState,
  driverCity
}: FilterBarProps) {
  return (
    <div className="-mt-6 w-full bg-white shadow-sm p-3 md:px-6 mb-8">
      <div className="flex flex-col justify-center md:justify-between items-center md:flex-row gap-4 text-center md:text-left">
        <div>
          <h1 className="font-bold text-gray-900">Booking Requests</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="text-xs flex items-center gap-1">
              <Car className="w-4 h-4" />
              {stats.active} active
            </span>
            <span className="text-xs flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              {stats.urgent} urgent
            </span>
            <span className="text-xs flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {stats.todayRequests} today
            </span>
            {filter === "nearby" && isDriver && (driverState || driverCity) && (
              <span className="text-xs flex items-center gap-1 text-green-600">
                <Navigation className="w-4 h-4" />
                {driverCity ? `${driverCity}, ${driverState}` : driverState}
              </span>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs ${filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("urgent")}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-xs ${filter === "urgent"
              ? "bg-orange-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Urgent</span>
            <span className="sm:hidden">Urg</span>
          </button>
          {isDriver && (
            <button
              onClick={() => setFilter("nearby")}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-xs ${filter === "nearby"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Nearby</span>
              <span className="sm:hidden">Near</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
