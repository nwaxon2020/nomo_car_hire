// components/driver/VIPStar.tsx
import React from 'react';

interface VIPStarProps {
    level: number;
    prestigeLevel?: number;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    isExpired?: boolean;
}

const VIP_CONFIG = {
    levels: [
        { level: 1, name: "Green VIP", color: "green", stars: 1, referralsRequired: 15, price: 5000 },
        { level: 2, name: "Yellow VIP", color: "yellow", stars: 2, referralsRequired: 20, price: 7500 },
        { level: 3, name: "Purple VIP", color: "purple", stars: 3, referralsRequired: 25, price: 11000 },
        { level: 4, name: "Gold VIP", color: "gold", stars: 4, referralsRequired: 30, price: 15000 },
        { level: 5, name: "Black VIP", color: "black", stars: 5, referralsRequired: 35, price: 20000 },
    ],
    maxLevel: 5,
    referralMultiplier: 5,
};

export const VIPStar: React.FC<VIPStarProps> = ({
    level,
    prestigeLevel = 0,
    size = "md",
    showLabel = true,
    isExpired = false
}) => {
    if (level <= 0) return null;

    const vipDetails = VIP_CONFIG.levels[level - 1];
    if (!vipDetails) return null;

    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6"
    };

    const getStarColor = (color: string) => {
        const colors: any = {
            green: "text-green-500",
            yellow: "text-yellow-500",
            purple: "text-purple-500",
            gold: "text-yellow-600",
            black: "text-gray-700"
        };
        return colors[color] || colors.green;
    };

    const getBackgroundColor = (color: string) => {
        const colors: any = {
            green: "bg-gradient-to-br from-green-100 to-green-300 border-green-300",
            yellow: "bg-gradient-to-br from-yellow-100 to-yellow-300 border-yellow-300",
            purple: "bg-gradient-to-br from-purple-100 to-purple-300 border-purple-300",
            gold: "bg-gradient-to-br from-yellow-200 to-yellow-400 border-yellow-400",
            black: "bg-gradient-to-br from-gray-800 to-black border-gray-700"
        };
        return colors[color] || colors.green;
    };

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getBackgroundColor(vipDetails.color)} border shadow-sm ${isExpired ? 'opacity-60' : ''}`}>
            {isExpired && (
                <span className="text-xs text-red-600 font-semibold mr-1">EXPIRED</span>
            )}
            <div className="flex items-center gap-0.5">
                {Array.from({ length: vipDetails.stars }).map((_, i) => (
                    <svg
                        key={i}
                        className={`${sizeClasses[size]} ${getStarColor(vipDetails.color)} fill-current ${isExpired ? 'opacity-50' : ''}`}
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                ))}
            </div>
            {prestigeLevel > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${vipDetails.color === 'black' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'
                    }`}>
                    LV{prestigeLevel}
                </span>
            )}
            {showLabel && (
                <span className={`text-xs font-semibold ${vipDetails.color === 'black' ? 'text-white' : vipDetails.color === 'gold' ? 'text-gray-900' : 'text-gray-800'
                    }`}>
                    {vipDetails.name}
                    {isExpired && ' (Expired)'}
                </span>
            )}
        </div>
    );
};