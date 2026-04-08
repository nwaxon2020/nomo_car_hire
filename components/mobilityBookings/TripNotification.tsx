"use client"
import React from 'react';

interface TripNotificationProps {
    show: boolean;
    message: string;
    onClose: () => void;
}

export default function TripNotification({ show, message, onClose }: TripNotificationProps) {
    if (!show) return null;

    const isSuccess = message.toLowerCase().includes('successfully');
    const isError = message.toLowerCase().includes('failed') || 
                  message.toLowerCase().includes('not authorized') || 
                  message.toLowerCase().includes('not found');

    return (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
            <div className={`border rounded-lg shadow-lg p-4 max-w-sm ${
                isSuccess ? 'bg-green-50 border-green-200' : 
                isError ? 'bg-red-50 border-red-200' : 
                'bg-yellow-50 border-yellow-200'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSuccess ? 'bg-green-100 text-green-600' : 
                        isError ? 'bg-red-100 text-red-600' : 
                        'bg-yellow-100 text-yellow-600'
                    }`}>
                        {isSuccess ? <span className="text-lg">✓</span> : 
                         isError ? <span className="text-lg">✗</span> : 
                         <span className="text-lg">⚠</span>}
                    </div>
                    <div className="flex-1">
                        <p className={`font-medium ${
                            isSuccess ? 'text-green-800' : 
                            isError ? 'text-red-800' : 
                            'text-yellow-800'
                        }`}>
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`${
                            isSuccess ? 'text-green-400 hover:text-green-600' : 
                            isError ? 'text-red-400 hover:text-red-600' : 
                            'text-yellow-400 hover:text-yellow-600'
                        }`}
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    );
}
