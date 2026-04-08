import CarHireUi from "@/ui/car-hire";
import LocationGuard from "@/components/mobility/LocationGuard";
import TicketGuard from "@/components/mobility/TicketGuard";

export default function CarHire() {
  return (
    <TicketGuard>
      <LocationGuard>
        <CarHireUi />
      </LocationGuard>
    </TicketGuard>
  );
}
