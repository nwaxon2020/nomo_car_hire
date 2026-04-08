"use client"
import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

interface ListingStarsProps {
    rating: number;
    size?: "sm" | "md" | "lg";
}

export default function ListingStars({ rating, size = "sm" }: ListingStarsProps) {
    const stars = [];
    const sizeMap = {
        sm: 12,
        md: 16,
        lg: 20
    };
    
    const iconSize = sizeMap[size];

    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars.push(<FaStar key={i} size={iconSize} className="text-yellow-400" />);
        } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
            stars.push(<FaStarHalfAlt key={i} size={iconSize} className="text-yellow-400" />);
        } else {
            stars.push(<FaRegStar key={i} size={iconSize} className="text-gray-400" />);
        }
    }

    return <div className="flex items-center gap-0.5">{stars}</div>;
}
