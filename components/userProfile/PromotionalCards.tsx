// components/profile/PromotionalCards.tsx
"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface PromotionalCardsProps {
    onUpgradeVIP: () => void;
    onBookKeke: () => void;
}

export const PromotionalCards: React.FC<PromotionalCardsProps> = ({
    onUpgradeVIP,
    onBookKeke,
}) => {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const cards = [
        {
            icon: "🎁",
            title: "Share & Earn",
            image: "/customerSmiling.jpeg",
            description: "Invite friends, earn 2 points each! Score 20 points and unlock a FREE ride!",
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
            description: "Anywhere is possible with our app! Hire a Keke Napep and enjoy an easier, faster journey.",
            button: "Book Now",
            action: "keke"
        }
    ];

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-12 px-2 md:px-0 "
        >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
                Earn Free Rides!
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ y: -10 }}
                        onHoverStart={() => setHoveredCard(index)}
                        onHoverEnd={() => setHoveredCard(null)}
                        className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative h-48 overflow-hidden">
                            <img
                                src={card.image}
                                alt={card.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full p-2">
                                <span className="text-2xl">{card.icon}</span>
                            </div>
                        </div>
                        <div className="relative p-6">
                            <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                            <p className="text-gray-400 text-sm mb-4">{card.description}</p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    if (card.action === "share") {
                                        document.getElementById('share-link')?.scrollIntoView({ behavior: 'smooth' });
                                    } else if (card.action === "vip") {
                                        onUpgradeVIP();
                                    } else if (card.action === "keke") {
                                        onBookKeke();
                                    }
                                }}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                            >
                                {card.button}
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.section>
    );
};