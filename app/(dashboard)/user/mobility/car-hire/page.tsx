import CarHireUi from "@/ui/car-hire";
import LocationGuard from "@/components/mobility/LocationGuard";
import TicketGuard from "@/components/mobility/TicketGuard";
import { FaCar } from "react-icons/fa";
import WaitingFormat from "@/components/WaitingFormat";

export default function CarHire() {

  const waitingProps = {
    name: "Car Hire",
    icon: <FaCar size={64} />
  };

  const waiting = <WaitingFormat {...waitingProps} />;


  return (
    <TicketGuard>
      <LocationGuard>
        <CarHireUi />
        {/* {waiting} */}
      </LocationGuard>
    </TicketGuard>
  );
}
