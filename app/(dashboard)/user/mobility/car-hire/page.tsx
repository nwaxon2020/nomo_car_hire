import CarHireUi from "@/ui/car-hire";
import LocationGuard from "@/components/mobility/LocationGuard";

export default function CarHire() {
  return (
    <LocationGuard>
      <CarHireUi />
    </LocationGuard>
  );
}
