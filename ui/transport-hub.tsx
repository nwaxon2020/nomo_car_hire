"use client";

import React from 'react';
import { Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

const TransportHubUi = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white/10 backdrop-blur-md p-12 rounded-3xl border border-white/20 shadow-2xl"
            >
                <div className="bg-blue-500/20 p-6 rounded-full inline-block mb-6">
                    <Navigation size={64} className="text-blue-500 animate-pulse" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Transport Hub
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                    Your central hub for managing all transport-related activities is currently under development. Stay tuned!
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-semibold shadow-lg hover:bg-gray-800 transition-colors">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    Coming Soon
                </div>
            </motion.div>
        </div>
    );
};

export default TransportHubUi;
