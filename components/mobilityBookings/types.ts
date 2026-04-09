import { Timestamp } from "firebase/firestore";

export interface VehicleLog {
    id: string;
    carName: string;
    carModel: string;
    carType: string;
    exteriorColor: string;
    passengers: number;
    ac: boolean;
    description: string;
    status: string;
    driverId: string;
    images?: {
        front?: string;
        back?: string;
        side?: string;
        interior?: string;
    };
}

export interface Comment {
    id?: string;
    userId: string;
    userName: string;
    userEmail: string;
    firstName?: string;
    lastName?: string;
    comment: string;
    rating?: number;
    createdAt: any;
    updatedAt?: any;
}

export interface Driver {
    id: string;
    uid: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    city: string;
    state: string;
    country: string;
    verified: boolean;
    whatsappPreferred: boolean;
    profileImage?: string;
    vehicleLog: string[];
    comments?: Comment[];
    ratings?: number[];
    averageRating?: number;
    totalRatings?: number;
    customersCarried?: string[];
    isVip?: boolean;
    vipLevel?: number;
    purchasedVipLevel?: number;
    prestigeLevel?: number;
    referralCount?: number;
    vipBadge?: string;
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        address?: string;
        timestamp?: any;
        isSharing: boolean;
        vehicleId?: string;
    };
    isLocationActive?: boolean;
    locationSharedAt?: any;
    lastLocationUpdate?: any;
}

export interface DriverWithVehicle extends Driver {
    vehicles: VehicleLog[];
}

export interface TripHistory {
    id?: string;
    tripId: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    driverImage?: string;
    vehicleId: string;
    vehicleName: string;
    vehicleModel: string;
    vehicleType: string;
    vehicleImage?: string;
    pickupLocation: string;
    destination: string;
    fare: number;
    status: 'active' | 'completed' | 'cancelled';
    startTime: any;
    endTime?: any;
    rating?: number;
    review?: string;
    createdAt: any;
    updatedAt: any;
}

export interface ContactedDriver {
    id?: string;
    driverId: string;
    driverName: string;
    phoneNumber: string;
    vehicleId: string;
    vehicleName: string;
    vehicleModel: string;
    contactDate: any;
    lastContacted: any;
    timestamp?: any;
}

export interface HiredCar {
    id?: string;
    driverId: string;
    vehicleId: string;
    driverName: string;
    vehicleName: string;
    vehicleModel: string;
    hireDate: any;
    lastHired: any;
    timestamp?: any;
}

export interface Trip {
    id: string;
    driverId: string;
    vehicleId: string;
    customerId: string;
    customerName: string;
    pickupLocation: string;
    destination: string;
    fare: number;
    status: string;
    startTime: Timestamp | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    endTime?: Timestamp;
    driverLocation?: {
        lat: number;
        lng: number;
        address?: string;
        timestamp: Timestamp;
    };
    routePolyline?: string;
    currentLocation?: {
        lat: number;
        lng: number;
        address?: string;
        timestamp: Timestamp;
    };
}

export interface DirectOffer {
    id: string;
    customerId: string;
    customerName: string;
    driverId: string;
    driverName: string;
    vehicleId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'timeout';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    customerLocation?: {
        lat: number;
        lng: number;
        address?: string;
    };
    fare?: number;
    pickupLocation?: string;
    destination?: string;
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
