"use client"
import React from 'react';
import { VIP_CONFIG } from '../types';

interface VIPStarProps {
    vipLevel: number;
    prestigeLevel?: number;
    size?: "sm" | "md" | "lg";
}

const getVIPDetails = (vipLevel: number, prestigeLevel: number = 0) => {
    if (vipLevel <= 0) return { name: "", color: "", stars: 0 };

    const vipInfo = VIP_CONFIG.levels.find(level => level.level === vipLevel);
    if (!vipInfo) return { name: "", color: "", stars: 0 };

    return {
        name: vipInfo.name,
        color: vipInfo.color,
        stars: vipInfo.stars,
        level: vipLevel,
        prestigeLevel,
        displayName: prestigeLevel > 0
            ? `${vipInfo.name} LV${prestigeLevel}`
            : vipInfo.name
    };
};

export default function VIPStar({
    vipLevel,
    prestigeLevel = 0,
    size = "sm"
}: VIPStarProps) {
    if (vipLevel <= 0) return null;

    const vipDetails = getVIPDetails(vipLevel, prestigeLevel);
    if (!vipDetails.name) return null;

    const sizeClasses = {
        sm: "w-3 h-3",
        md: "w-4 h-4",
        lg: "w-5 h-5"
    };

    const getColorClass = (color: string) => {
        const colors: Record<string, string> = {
            green: "text-green-500 bg-green-100",
            yellow: "text-yellow-500 bg-yellow-100",
            purple: "text-purple-500 bg-purple-100",
            gold: "text-yellow-600 bg-yellow-100",
            black: "text-gray-900 bg-gray-100"
        };
        return colors[color] || colors.green;
    };

    const getBorderClass = (color: string) => {
        const colors: Record<string, string> = {
            green: "border-green-300",
            yellow: "border-yellow-300",
            purple: "border-purple-300",
            gold: "border-yellow-400",
            black: "border-gray-300"
        };
        return colors[color] || colors.green;
    };

    const getTextClass = (color: string) => {
        const colors: Record<string, string> = {
            green: "text-green-800",
            yellow: "text-yellow-800",
            purple: "text-purple-800",
            gold: "text-yellow-900",
            black: "text-gray-900"
        };
        return colors[color] || colors.green;
    };

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getColorClass(vipDetails.color)} ${getBorderClass(vipDetails.color)} border`}>
            <div className="flex items-center gap-0.5">
                {Array.from({ length: vipDetails.stars }).map((_, i) => (
                    <svg
                        key={i}
                        className={`${sizeClasses[size]} fill-current`}
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                ))}
            </div>
            {prestigeLevel > 0 && (
                <span className="text-xs font-bold px-1 py-0.5 rounded bg-gray-800 text-white">
                    LV{prestigeLevel}
                </span>
            )}
            <span className={`text-xs font-semibold ${getTextClass(vipDetails.color)}`}>
                {vipDetails.name}
            </span>
        </div>
    );
}
