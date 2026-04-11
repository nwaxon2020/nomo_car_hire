import MobilityView from "@/ui/MobilityView";
import { Suspense } from "react";

export default function MobilityPage() {
  return (
    <Suspense fallback={<div></div>}>
      <MobilityView />
    </Suspense>
  );
}
