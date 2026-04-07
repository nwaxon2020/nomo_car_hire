"use client";

import LoadBookingUi from "@/ui/load-booking";
import LocationGuard from "@/components/mobility/LocationGuard";

export default function LoadBookingPage() {
    return (
        <LocationGuard>
            <LoadBookingUi />
        </LocationGuard>
    );
}
