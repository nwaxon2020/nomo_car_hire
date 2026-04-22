"use client";

import LoadBookingUi from "@/ui/load-booking";
import LocationGuard from "@/components/mobility/LocationGuard";
import TicketGuard from "@/components/mobility/TicketGuard";

export default function LoadBookingPage() {
    return (
        <TicketGuard>
            <LocationGuard>
                <LoadBookingUi />
            </LocationGuard>
        </TicketGuard>
    );
}
