"use client";

import { Truck } from 'lucide-react';
import { motion } from 'framer-motion';

const LoadBookingUi = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white/10 backdrop-blur-md p-12 rounded-3xl border border-white/20 shadow-2xl"
            >
                <div className="bg-green-500/20 p-6 rounded-full inline-block mb-6">
                    <Truck size={64} className="text-green-500 animate-pulse" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Load Booking
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                    We are building a seamless way for you to book and manage load logistics. This feature will be available very soon!
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-semibold shadow-lg hover:bg-gray-800 transition-colors">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Coming Soon
                </div>
            </motion.div>
        </div>
    );
};

export default LoadBookingUi;
