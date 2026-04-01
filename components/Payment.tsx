"use client"

import React from "react";

interface VIPLevel {
    level: number;
    name: string;
    price: number;
}

interface PaymentProps {
    selectedLevelData: VIPLevel | undefined;
    processing: boolean;
    onInitiate: (level: number) => void;
}

export default function PaymentSection({ selectedLevelData, processing, onInitiate }: PaymentProps) {
    if (!selectedLevelData) return null;

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-8 border border-blue-200">
            <h2 className="md:text-xl font-semibold text-gray-800 mb-4">Complete Your Purchase</h2>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm md:text-base">Selected Plan:</span>
                    <span className="font-semibold text-sm md:text-lg text-gray-900">
                        {selectedLevelData.name}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm md:text-base">Amount:</span>
                    <span className="text-xl md:text-2xl font-bold text-gray-900">
                        ₦{selectedLevelData.price.toLocaleString()}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm md:text-base">Duration:</span>
                    <span className="font-medium text-sm md:text-base text-gray-900">1 Year (365 days)</span>
                </div>
                <div className="pt-4 border-t border-blue-200">
                    <button
                        onClick={() => onInitiate(selectedLevelData.level)}
                        disabled={processing}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold text-sm md:text-base hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-md"
                    >
                        {processing ? 'Processing Purchase...' : 'Complete Purchase Now'}
                    </button>
                    <p className="text-center text-xs md:text-sm text-gray-500 mt-3">
                        By purchasing, you agree to our Terms of Service.
                    </p>
                </div>
            </div>
        </div>
    );
}