"use client";

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
                <LoadBookingUi />
                {/* {waiting} */}
            </LocationGuard>
        </TicketGuard>
    );
}
