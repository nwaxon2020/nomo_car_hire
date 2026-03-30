// types/driver.ts
import { Timestamp } from "firebase/firestore";

export interface Vehicle {
    id?: string;
    driverId: string;
    carName: string;
    carModel: string;
    carType: string;
    passengers: number;
    ac: boolean;
    plateNumber: string;
    exteriorColor: string;
    interiorColor: string;
    images: { front: string; side: string; back: string; interior: string; };
    description?: string;
    status?: "available" | "unavailable" | "maintenance";
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Comment {
    id: string;
    passengerId: string;
    passengerName: string;
    text: string;
    createdAt: Timestamp;
    driverId: string;
}

export interface VIPDetails {
    vipLevel: number;
    prestigeLevel: number;
    referralCount: number;
    nextReferralsNeeded: number;
    referralsForNext: number;
    progressPercentage: number;
    isMaxLevel: boolean;
    isExpired: boolean;
    currentLevelName: string;
    nextLevelName: string;
}

export const VIP_CONFIG = {
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