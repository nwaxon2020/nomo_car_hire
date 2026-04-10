"use client";

import TransportHubUi from "@/ui/transport-hub";
import LocationGuard from "@/components/mobility/LocationGuard";

export default function TransportHubPage() {
    return (
        <LocationGuard>
            <TransportHubUi />
            {/* <Waiting /> */}
        </LocationGuard>
    );
}
