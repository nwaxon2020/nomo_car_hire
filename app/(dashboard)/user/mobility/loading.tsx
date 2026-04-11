import React from 'react';

export default function Loading() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm z-50 fixed inset-0">
            <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-emerald-500/30 rounded-full absolute border-t-transparent animate-spin" />
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-6 text-sm font-black uppercase tracking-widest text-emerald-600 animate-pulse">Loading Bookings...</p>
            </div>
        </div>
    );
}
