"use client"
import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { ContactedDriver } from './types';

interface QuickViewHistoryProps {
    quickViewHistory: ContactedDriver | null;
    driverInfo: boolean;
    handleQuickViewClick: () => void;
    handleClearQuickView: () => void;
    formatDate: (timestamp: any) => string;
}

export default function QuickViewHistory({ 
    quickViewHistory, 
    driverInfo, 
    handleQuickViewClick, 
    handleClearQuickView,
    formatDate
}: QuickViewHistoryProps) {
    if (!quickViewHistory || driverInfo) return null;

    return (
        <div className="mt-6 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-start sm:items-center">
                <div
                    onClick={handleQuickViewClick}
                    className="cursor-pointer hover:bg-blue-100 p-2 rounded-lg flex-1"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-blue-800 text-lg">Recent Driver</h3>
                        <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                            Click to view details
                        </span>
                    </div>
                    <p className="text-gray-700">{quickViewHistory.driverName} - {quickViewHistory.vehicleName} {quickViewHistory.vehicleModel}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <small className="text-blue-600">Contact: {quickViewHistory.phoneNumber}</small>
                    </div>
                    <small className="text-gray-500 text-sm">
                        Last contacted: {formatDate(quickViewHistory.lastContacted)}
                    </small>
                </div>
                <button
                    onClick={handleClearQuickView}
                    className="text-red-500 hover:text-red-700 ml-2"
                    title="Remove from history"
                >
                    <FaTrash />
                </button>
            </div>
        </div>
    );
}
