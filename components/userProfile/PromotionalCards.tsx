"use client";

import { motion } from "framer-motion";
import ShareButton from "@/components/sharebutton";

interface PromotionalCardsProps {
    userId: string;
    onUpgradeVIP: () => void;
    onBookKeke: () => void;
}

export const PromotionalCards: React.FC<PromotionalCardsProps> = ({
    userId,
    onUpgradeVIP,
    onBookKeke,
}) => {
    const cards = [
        {
            icon: "🎁",
            title: "Share & Earn",
            image: "/customerSmiling.jpeg",
            description: "Invite friends, earn 2 points each! Score 20 points and unlock a FREE ride! You also stand a chance to become our ambassador.",
            button: "Share Now",
            action: "share"
        },
        {
            icon: "⭐",
            title: "VIP Service",
            image: "/driverSmiling.webp",
            description: "Become a VIP member and enjoy premium comfort rides, earn points, and unlock free ride rewards.",
            button: "Upgrade to VIP",
            action: "vip"
        },
        {
            icon: "🛺",
            title: "Keke Napep",
            image: "/keke.jpeg",
            description: "Find a Keke Napep near you! Book instantly and enjoy an easier, faster journey with drivers in your radius.",
            button: "Book Now",
            action: "keke"
        }
    ];

    // Reusable tailwind classes for consistency
    const buttonStyles = "w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20";

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 px-2 md:px-0"
        >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
                Earn Free Rides!
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ y: -10 }}
                        className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
                    >
                        <div className="relative h-48 overflow-hidden">
                            <img src={card.image} alt={card.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
                                <span className="text-2xl">{card.icon}</span>
                            </div>
                        </div>

                        <div className="relative p-6">
                            <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                            <p className="text-gray-400 text-sm mb-4">{card.description}</p>

                            {card.action === "share" ? (
                                /* PASSING CUSTOM BUTTON AS CHILDREN:
                                   This allows ShareButton to handle the referral logic 
                                   while using your specific card button styling.
                                */
                                <ShareButton
                                    userId={userId}
                                    title="Get a Free Ride on *NOMO CARS*!"
                                    text="Join me on Nomo Cars for amazing rides! Use my link to sign up and earn points. 🚗✨"
                                >
                                    <div className={buttonStyles + " flex items-center justify-center cursor-pointer"}>
                                        {card.button}
                                    </div>
                                </ShareButton>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => card.action === "vip" ? onUpgradeVIP() : onBookKeke()}
                                    className={buttonStyles}
                                >
                                    {card.button}
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.section>
    );
};