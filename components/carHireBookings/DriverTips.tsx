"use client";

import { AlertCircle, Check } from "lucide-react";

interface DriverTipsProps {
  driverCity?: string;
  driverState?: string;
  driverBids: {
    used: number;
    limit: number;
  };
}

export default function DriverTips({
  driverCity,
  driverState,
  driverBids
}: DriverTipsProps) {
  return (
    <div className="mx-2 mt-6 md:mt-8 md:mx-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-lg self-start">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Tips for Drivers</h4>
          <ul className="space-y-2 text-gray-700 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Nearby Filter:</strong> Shows requests matching your Registered location: {driverCity ? `${driverCity}, ${driverState}` : driverState || "Set your location in profile"}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Visibility increases when you purcase VIPs, Boosts, or Subscribe to a Plan</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>You can only make one offer per request. Making a new offer will replace your previous one.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>You have used <strong>{driverBids.used}</strong> out of <strong>{driverBids.limit}</strong> bids this month.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
