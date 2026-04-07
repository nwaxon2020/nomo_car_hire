import { Timestamp } from "firebase/firestore";

export interface BookingRequestType {
  id: string;
  userId: string;
  userName: string;
  carType: string;
  budget: string;
  location: string;
  state?: string;
  city?: string;
  startDate: string;
  endDate: string;
  passengers: string;
  tripType: string;
  description: string;
  negotiable: boolean;
  urgent: boolean;
  status: "active" | "fulfilled" | "expired";
  offers: OfferType[];
  views: number;
  createdAt: any;
  expiresAt: string;
  isSameCity?: boolean;
  destination?: string;
  hasNewBid?: boolean;
  userHasMadeOffer?: boolean;
  userWasRejected?: boolean;
  userIsBlocked?: boolean;
  rejectedOnce?: string[];
  rejectedTwice?: string[];
  vipLevel?: number;
}

export interface OfferType {
  id?: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  carColor?: string;
  hasAC: boolean;
  price: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: any;
  read?: boolean;
  vehicleId?: string;
  vehicleDetails?: any;
}

export interface UserType {
  isDriver?: boolean;
  phoneNumber?: string;
  fullName?: string;
  location?: string;
  state?: string;
  city?: string;
  vipLevel?: number;
  [key: string]: any;
}
