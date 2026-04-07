"use client";

import { AlertCircle } from "lucide-react";

interface MaxRequestsWarningProps {
  userRequestCount: number;
  vipLevel: number;
}

export default function MaxRequestsWarning({
  userRequestCount,
  vipLevel
}: MaxRequestsWarningProps) {
  const getMaxBookings = (level: number) => {
    if (level >= 5) return 8;
    if (level === 4) return 5;
    if (level === 3) return 4;
    if (level === 2) return 3;
    if (level === 1) return 2;
    return 1;
  };
  const maxLimit = getMaxBookings(vipLevel);

  if (userRequestCount >= maxLimit) {
    return (
      <div className="mb-2 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-1 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800">Maximum Requests Reached</h4>
            <p className="text-xs text-red-700">
              You have {userRequestCount} active requests (maximum is {maxLimit}). Delete one to create a new request.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
