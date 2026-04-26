"use client";

import { Suspense } from "react";
import LoadBookingUi from "@/ui/load-booking";
import LocationGuard from "@/components/mobility/LocationGuard";
import TicketGuard from "@/components/mobility/TicketGuard";
import WaitingFormat from "@/components/WaitingFormat";
import { FaCar } from "react-icons/fa";

export default function LoadBookingPage() {

    const waitingProps = {
        name: "Load Booking",
        icon: <FaCar size={64} />
    };

    const waiting = <WaitingFormat {...waitingProps} />;

    return (
        <TicketGuard>
            <LocationGuard>
                <Suspense fallback={<div className="min-h-screen bg-[#0B0B12] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div></div>}>
                    <LoadBookingUi />
                </Suspense>
                {/* {waiting} */}
            </LocationGuard>
        </TicketGuard>
    );
}
