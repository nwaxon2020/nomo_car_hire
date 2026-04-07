import BookingUi from "@/ui/Bookings";
import LocationGuard from "@/components/mobility/LocationGuard";
import { Waiting } from "@/ui/Bookings";

export default function Bookings() {
  return (
    <LocationGuard>
      <BookingUi />
      {/* <Waiting /> */}
    </LocationGuard>
  );
}
