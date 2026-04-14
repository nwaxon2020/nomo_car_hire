import BookingUi from "@/ui/Bookings";
import LocationGuard from "@/components/mobility/LocationGuard";
import TicketGuard from "@/components/mobility/TicketGuard";
import WaitingFormat from "@/components/WaitingFormat";
import { FaCar } from "react-icons/fa";

export default function Bookings() {
  const waitingProps = {
    name: "Mobility Bookings",
    icon: <FaCar size={64} />
  };

  const waiting = <WaitingFormat {...waitingProps} />;

  return (
    <TicketGuard>
      <LocationGuard>
        <BookingUi />
        {/* {waiting} */}
      </LocationGuard>
    </TicketGuard>
  );
}
