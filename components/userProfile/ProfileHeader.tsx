// components/profile/ProfileHeader.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import ShareButton from "@/components/sharebutton";
import WordGuessGame from "@/components/wordGame/wordGuessGame";

interface ProfileHeaderProps {
    userData: any;
    userId: string;
    referralPoints: number;
    freeRides: number;
    pointsToNextFreeRide: number;
    progressPercentage: number;
    uploadingImage: boolean;
    editingName: boolean;
    newName: string;
    setNewName: (name: string) => void;
    setEditingName: (editing: boolean) => void;
    handleUpdateName: () => void;
    handleProfileImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    userData,
    userId,
    referralPoints,
    freeRides,
    pointsToNextFreeRide,
    progressPercentage,
    uploadingImage,
    editingName,
    newName,
    setNewName,
    setEditingName,
    handleUpdateName,
    handleProfileImageChange,
}) => {
    const [game, setGame] = useState(false);
    const [showShareTooltip, setShowShareTooltip] = useState(false);

    const capitalizeFullName = (name: string) => {
        return name
            .split(" ")
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative mb-8 overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-r from-gray-800/50 via-gray-900/50 to-black/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10" />

                <div className="relative py-6 px-4 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Profile Section */}
                        <div className="flex-1">
                            <div className="flex items-center gap-6">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50" />
                                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-purple-500/50">
                                        {userData.photoURL || userData.profileImage ? (
                                            <img
                                                src={userData.photoURL || userData.profileImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-3xl font-bold">
                                                {userData.fullName?.charAt(0).toUpperCase() || "U"}
                                            </div>
                                        )}
                                    </div>

                                    {/* Verified Badge - Absolute Bottom Right */}
                                    {userData.verified && (
                                        <div className="absolute bottom-1 right-1 z-10 bg-blue-500 rounded-full p-1 border-2 border-gray-900 shadow-lg">
                                            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}

                                    <label className="absolute -bottom-1 -left-1 bg-gray-800 border border-gray-600 rounded-full p-2 cursor-pointer hover:bg-gray-700 transition-colors shadow-lg z-20">
                                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleProfileImageChange}
                                            disabled={uploadingImage}
                                        />
                                    </label>
                                    {uploadingImage && (
                                        <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </motion.div>

                                <div className="flex-1">
                                    {editingName ? (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex flex-col sm:flex-row items-start gap-3"
                                        >
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-xl text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleUpdateName}
                                                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingName(false);
                                                        setNewName(userData.fullName || "");
                                                    }}
                                                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                                {capitalizeFullName(userData.fullName || "Unnamed User")}
                                            </h1>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setEditingName(true)}
                                                className="text-gray-400 hover:text-white transition-colors"
                                                title="Edit name"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </motion.button>
                                        </div>
                                    )}
                                    <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 mt-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-sm text-gray-400">Active Member</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-600">•</span>
                                            <span className="text-sm text-gray-400">
                                                Passenger since {new Date(userData.createdAt?.toDate?.() || Date.now()).getFullYear()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* VIP Badge */}
                                    {userData.vip && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 200 }}
                                            className=""
                                        >
                                            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-sm border border-yellow-500/30 px-3 py-0.5 rounded-full">
                                                <motion.span
                                                    animate={{ rotate: [0, 10, -10, 0] }}
                                                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                                                    className="text-yellow-400 text-[10px]"
                                                >
                                                    ⭐
                                                </motion.span>
                                                <span className="text-yellow-400 text-[10px] font-semibold">VIP Customer</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Free Ride Progress */}
                            {freeRides > 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 px-4 py-2 rounded-xl"
                                >
                                    <motion.span
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                                        className="text-yellow-400 text-xl"
                                    >
                                        ★
                                    </motion.span>
                                    <span className="text-yellow-400 font-semibold">
                                        You have {freeRides} free ride{freeRides > 1 ? 's' : ''} available!
                                    </span>
                                </motion.div>
                            ) : referralPoints > 0 && (
                                <div className="mt-6">
                                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                                        <span>Progress to Free Ride</span>
                                        <span>{pointsToNextFreeRide} points needed</span>
                                    </div>
                                    <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercentage}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {referralPoints} points earned • Share your link to earn more!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-4 min-w-[280px]">
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-700/50"
                            >
                                <div className="text-2xl font-bold text-white">{referralPoints}</div>
                                <div className="text-xs text-gray-400 mt-1">Points</div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-700/50"
                            >
                                <div className="text-2xl font-bold text-yellow-400">{freeRides}</div>
                                <div className="text-xs text-gray-400 mt-1">Free Rides</div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-4 text-center border border-gray-700/50"
                            >
                                <div className="text-2xl font-bold text-purple-400">{userData.referralCount || 0}</div>
                                <div className="text-xs text-gray-400 mt-1">Referrals</div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setGame(true)}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                        >
                            🎮 Play Game
                        </motion.button>

                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative flex-1 sm:flex-none"
                            onMouseEnter={() => setShowShareTooltip(true)}
                            onMouseLeave={() => setShowShareTooltip(false)}
                        >
                            <ShareButton
                                userId={userId}
                                title="Get a Free Ride on Nomopoventures!"
                                text="Join me on Nomopoventures for amazing rides! Use my link to sign up and earn points. 🚗✨"
                            />
                            <AnimatePresence>
                                {showShareTooltip && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-xs text-gray-300 rounded-lg whitespace-nowrap"
                                    >
                                        Share and earn 2 points per referral!
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Game Modal */}
            <AnimatePresence>
                {game && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setGame(false)} // Click background to close
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the game itself
                            className="w-full max-w-xl"
                        >
                            <WordGuessGame onClose={() => setGame(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};