import BookingUi from "@/ui/Bookings";
import LocationGuard from "@/components/mobility/LocationGuard";
import TicketGuard from "@/components/mobility/TicketGuard";


export default function Bookings() {
  return (
    <TicketGuard>
      <LocationGuard>
        <BookingUi />
        {/* <Waiting /> */}
      </LocationGuard>
    </TicketGuard>
  );
}
