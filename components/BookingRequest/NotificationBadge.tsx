// NotificationBadge.tsx
"use client";

import { FaEnvelope, FaBell } from "react-icons/fa";

interface NotificationBadgeProps {
    count: number;
    type: "driver" | "customer";
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    className?: string;
    size?: "sm" | "md" | "lg"; // Add this line
}

export default function NotificationBadge({ 
    count, 
    type, 
    position = "top-right",
    className = "",
    size = "md" // Add default value
    }: NotificationBadgeProps) {
    if (count <= 0) return null;
    
    // Define size classes
    const sizeClasses = {
        sm: "h-4 w-4 text-[10px]",
        md: "h-5 w-5 text-xs",
        lg: "h-6 w-6 text-sm"
    };
    
    const iconSizes = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6"
    };

    const positionClasses = {
        "top-right": "top-0 right-0 transform translate-x-1/2 -translate-y-1/2",
        "top-left": "top-0 left-0 transform -translate-x-1/2 -translate-y-1/2",
        "bottom-right": "bottom-0 right-0 transform translate-x-1/2 translate-y-1/2",
        "bottom-left": "bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2",
    };

    const bgColor = type === "driver" 
        ? "bg-red-500 border-red-600" 
        : "bg-green-500 border-green-600";
    
    const iconColor = type === "driver" 
        ? "text-red-200" 
        : "text-green-200";

    return (
        <div className={`relative inline-flex ${className}`}>
        {type === "driver" ? (
            <FaBell className={`${iconSizes[size]} ${iconColor}`} />
        ) : (
            <FaEnvelope className={`${iconSizes[size]} ${iconColor}`} />
        )}
        
        <span className={`
            absolute ${positionClasses[position]}
            ${bgColor} 
            text-white 
            font-bold 
            rounded-full 
            ${sizeClasses[size]}
            flex 
            items-center 
            justify-center
            shadow-lg
            animate-pulse
            border
        `}>
            {count > 99 ? "99+" : count}
        </span>
        </div>
    );
}