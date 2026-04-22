import { Timestamp } from "firebase/firestore";

export interface LoadBooking {
  id: string;
  driverId: string;
  driverName: string;
  driverFirstName: string;
  driverPhone: string;
  driverImage?: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  vehicleColor: string;
  vehiclePlate: string;
  totalSeats: number;
  bookedCount: number;
  destination: string;
  meetingPoint: string;
  meetingPointLat?: number;
  meetingPointLng?: number;
  fare: number;
  departureTime: string; // "HH:MM" 24h format
  status: "active" | "departed" | "cancelled";
  date: string; // YYYY-MM-DD
  driverCity: string;
  driverState: string;
  vipLevel?: number;
  isVerified?: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface LoadSeat {
  seatNumber: number; // 1 = front, 2-4 = middle, 5-6 = back
  status: "available" | "booked";
  customerId?: string;
  customerName?: string;
  customerImage?: string;
  trustScore?: number;
  bookedAt?: any;
}

export interface EligibleVehicle {
  id: string;
  carName: string;
  carModel: string;
  carType: string;
  exteriorColor: string;
  passengers: number; // total seats INCLUDING driver
  plateNumber: string;
  images?: {
    front?: string;
    side?: string;
    back?: string;
    interior?: string;
  };
  status?: string;
  isApproved?: boolean;
}

// Seat layout constants
export const SEAT_LAYOUT = {
  front: [1],        // Passenger next to driver
  middle: [2, 3, 4], // Middle row
  back: [5, 6],      // Back row
};

export const KEKE_SEAT_LAYOUT = {
  front: [],
  middle: [1, 2, 3],
  back: [],
};

/**
 * Determines if a vehicle is eligible for Load Booking.
 * - Keke (tricycle): always eligible
 * - Others: must have 4–6 passenger seats (passengers - 1)
 *   i.e. total seats (incl. driver) must be 5–7
 */
export const isVehicleEligible = (passengers: number, carType: string): boolean => {
  const type = carType?.toLowerCase();
  if (type === "keke") return true;
  const passengerSeats = passengers - 1;
  return passengerSeats >= 4 && passengerSeats <= 6;
};

/** Returns how many passenger seats a vehicle has */
export const getPassengerSeats = (passengers: number, carType: string): number => {
  if (carType?.toLowerCase() === "keke") return Math.min(passengers, 3);
  return Math.max(0, passengers - 1);
};

/** Returns the seat layout rows for a vehicle */
export const getSeatLayout = (
  passengerSeats: number,
  carType: string
): { front: number[]; middle: number[]; back: number[] } => {
  if (carType?.toLowerCase() === "keke") {
    if (passengerSeats <= 2) return { front: [], middle: [1, 2], back: [] };
    return { front: [], middle: [1, 2, 3], back: [] };
  }
  if (passengerSeats === 4) {
    return { front: [1], middle: [2, 3, 4], back: [] };
  }
  if (passengerSeats === 5) {
    return { front: [1], middle: [2, 3, 4], back: [5] };
  }
  // 6 seats
  return { front: [1], middle: [2, 3, 4], back: [5, 6] };
};

/** Returns today as YYYY-MM-DD string */
export const getTodayString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** Returns the first day of the current month as a Date */
export const getFirstOfCurrentMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/** Gets tomorrow's date as YYYY-MM-DD */
export const getTomorrowString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
};

export interface TrustInfo {
  trustScore: number;           // 0-100
  trustCancels: number;         // Rolling count, resets every 3rd cancel
  trustLastReset?: any;         // Timestamp of last monthly reset
  trustExhaustedAt?: string;    // YYYY-MM-DD when trust hit 0
  loadOnceAllowed?: boolean;    // True after exhaustion: one final booking allowed
  loadOnceUsedDate?: string;    // YYYY-MM-DD when they used the once-allowed booking
  loadBlockedUntil?: string;    // YYYY-MM-DD: blocked until this date after final cancel
}

export const DEFAULT_TRUST: TrustInfo = {
  trustScore: 100,
  trustCancels: 0,
};
