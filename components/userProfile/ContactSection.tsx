// components/profile/ContactSection.tsx
"use client";

import { motion } from "framer-motion";

export const ContactSection: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative mb-8 overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 backdrop-blur-sm border border-gray-700/50"
        >
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative p-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">
                    We're Here to Help
                </h2>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                    For complaints, enquiries, reports and much more — our team is available
                    <span className="text-purple-400 font-semibold"> 24/7</span>.
                </p>
                <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="mailto:nomopoventures@yahoo.com"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-8 py-4 rounded-xl text-white font-semibold transition-all shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Us Today!
                </motion.a>
            </div>
        </motion.div>
    );
};