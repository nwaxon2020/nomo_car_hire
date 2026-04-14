"use client";

import TransportHubUi from "@/ui/transport-hub";
import LocationGuard from "@/components/mobility/LocationGuard";
import WaitingFormat from "@/components/WaitingFormat";
import { FaCar } from "react-icons/fa";

export default function TransportHubPage() {

    const waitingProps = {
        name: "Transport Hub",
        icon: <FaCar size={64} />
    };

    const waiting = <WaitingFormat {...waitingProps} />;

    return (
        <LocationGuard>
            <TransportHubUi />
            {/* {waiting} */}
        </LocationGuard>
    );
}
