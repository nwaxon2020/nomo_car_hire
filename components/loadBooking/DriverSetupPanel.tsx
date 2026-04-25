"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCar, FaMapMarkerAlt, FaMoneyBillWave, FaClock,
  FaLock, FaCheckCircle, FaChevronRight, FaBan,
} from "react-icons/fa";
import { EligibleVehicle, isVehicleEligible, getPassengerSeats, getTodayString } from "./types";
import DriverVehicleConfirmModal from "./DriverVehicleConfirmModal";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_LIBRARIES: ("places" | "geometry")[] = ["places"];

interface DriverSetupPanelProps {
  driverId: string;
  driverName: string;
  driverFirstName: string;
  driverPhone: string;
  driverImage?: string;
  driverCity: string;
  driverState: string;
  driverLocation?: { lat?: number; lng?: number; address?: string };
  vipLevel?: number;
  isVerified?: boolean;
  driverTrustScore?: number;
  whatsappPreferred?: boolean;
  vehicles: EligibleVehicle[];
  lockedVehicleId?: string; // already locked for today
  onSessionCreated: (bookingId: string) => void;
}

export default function DriverSetupPanel({
  driverId,
  driverName,
  driverFirstName,
  driverPhone,
  driverImage,
  driverCity,
  driverState,
  driverLocation,
  vipLevel,
  isVerified,
  driverTrustScore,
  whatsappPreferred,
  vehicles,
  lockedVehicleId,
  onSessionCreated,
}: DriverSetupPanelProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<EligibleVehicle | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [step, setStep] = useState<"select" | "setup">("select");

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_LIBRARIES,
  });

  // Form fields
  const [destination, setDestination] = useState("");
  const [destinationLat, setDestinationLat] = useState(0);
  const [destinationLng, setDestinationLng] = useState(0);
  const [meetingPoint, setMeetingPoint] = useState(driverLocation?.address || "");
  const [meetingLat, setMeetingLat] = useState(driverLocation?.lat || 0);
  const [meetingLng, setMeetingLng] = useState(driverLocation?.lng || 0);
  const [fare, setFare] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destInputRef = useRef<HTMLInputElement>(null);
  const meetingInputRef = useRef<HTMLInputElement>(null);
  const destAcRef = useRef<google.maps.places.Autocomplete | null>(null);
  const meetingAcRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Attach Google Places Autocomplete directly to destination input
  useEffect(() => {
    if (!isLoaded || !destInputRef.current || destAcRef.current) return;
    const ac = new google.maps.places.Autocomplete(destInputRef.current, {
      fields: ["formatted_address", "name", "geometry", "address_components"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      // Get detailed components for Nigeria (LGA, City, State)
      const name = place.name || "";
      const addressComponents = place.address_components || [];
      const lga = addressComponents.find(c => c.types.includes("administrative_area_level_2"))?.long_name || "";
      const city = addressComponents.find(c => c.types.includes("locality"))?.long_name || "";
      const state = addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.long_name || "";
      let fullAddr = place.formatted_address || "";
      
      // Clean up the full address of Plus Codes
      fullAddr = fullAddr.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/g, "").trim().replace(/^[,.\s]+|[,.\s]+$/g, "");

      const firstPart = fullAddr.split(",")[0].trim();
      let displayName = (name && !name.includes("+")) ? name : firstPart;
      displayName = displayName.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/g, "").trim();

      // Build a verbose header: Name, City/LGA, State
      const headerParts = [displayName];
      const area = city || lga; // Use City or LGA as the second part
      if (area && !displayName.toLowerCase().includes(area.toLowerCase())) headerParts.push(area);
      if (state && !displayName.toLowerCase().includes(state.toLowerCase()) && !area.toLowerCase().includes(state.toLowerCase())) {
        headerParts.push(state);
      }
      
      const header = headerParts.join(", ");
      let cleanAddr = `${header} (${fullAddr})`;
      cleanAddr = cleanAddr.replace(/^[,.\s]+|[,.\s]+$/g, "");
      
      setDestination(cleanAddr);
      if (destInputRef.current) destInputRef.current.value = cleanAddr;
      if (place.geometry?.location) {
        setDestinationLat(place.geometry.location.lat());
        setDestinationLng(place.geometry.location.lng());
      }
    });
    destAcRef.current = ac;
  }, [isLoaded]);

  // Attach Google Places Autocomplete directly to meeting point input
  useEffect(() => {
    if (!isLoaded || !meetingInputRef.current || meetingAcRef.current) return;
    const ac = new google.maps.places.Autocomplete(meetingInputRef.current, {
      fields: ["formatted_address", "name", "geometry", "address_components"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const name = place.name || "";
      const addressComponents = place.address_components || [];
      const lga = addressComponents.find(c => c.types.includes("administrative_area_level_2"))?.long_name || "";
      const city = addressComponents.find(c => c.types.includes("locality"))?.long_name || "";
      const state = addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.long_name || "";
      let fullAddr = place.formatted_address || "";
      
      fullAddr = fullAddr.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/g, "").trim().replace(/^[,.\s]+|[,.\s]+$/g, "");

      const firstPart = fullAddr.split(",")[0].trim();
      let displayName = (name && !name.includes("+")) ? name : firstPart;
      displayName = displayName.replace(/[A-Z0-9]{4,8}\+[A-Z0-9]{2,8}/g, "").trim();

      const headerParts = [displayName];
      const area = city || lga;
      if (area && !displayName.toLowerCase().includes(area.toLowerCase())) headerParts.push(area);
      if (state && !displayName.toLowerCase().includes(state.toLowerCase()) && !area.toLowerCase().includes(state.toLowerCase())) {
        headerParts.push(state);
      }
      
      const header = headerParts.join(", ");
      let cleanAddr = `${header} (${fullAddr})`;
      cleanAddr = cleanAddr.replace(/^[,.\s]+|[,.\s]+$/g, "");

      setMeetingPoint(cleanAddr);
      if (meetingInputRef.current) meetingInputRef.current.value = cleanAddr;
      if (place.geometry?.location) {
        setMeetingLat(place.geometry.location.lat());
        setMeetingLng(place.geometry.location.lng());
      }
    });
    meetingAcRef.current = ac;
  }, [isLoaded]);

  // FIX: Force Google Suggestions to follow the input on scroll
  useEffect(() => {
    const handleScroll = () => {
      const pacContainers = document.querySelectorAll('.pac-container') as NodeListOf<HTMLElement>;
      pacContainers.forEach(container => {
        container.style.display = 'none'; // Hide it when scrolling to avoid "floating" artifacts
      });
    };

    // Listen to the main dashboard scroll if it exists, otherwise window
    const scrollContainer = document.querySelector('.overflow-y-auto') || window;
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // FIX: Match suggestions width to input width
  useEffect(() => {
    const matchWidth = (e: FocusEvent) => {
      const input = e.target as HTMLInputElement;
      const width = input.offsetWidth;
      // We use a small delay to ensure the container has been created/rendered by Google
      setTimeout(() => {
        const containers = document.querySelectorAll('.pac-container') as NodeListOf<HTMLElement>;
        containers.forEach(c => {
          c.style.width = `${width}px`;
        });
      }, 10);
    };

    const dIn = destInputRef.current;
    const mIn = meetingInputRef.current;
    dIn?.addEventListener('focus', matchWidth);
    mIn?.addEventListener('focus', matchWidth);
    return () => {
      dIn?.removeEventListener('focus', matchWidth);
      mIn?.removeEventListener('focus', matchWidth);
    };
  }, [isLoaded]);

  // Pre-select locked vehicle
  const lockedVehicle = vehicles.find((v) => v.id === lockedVehicleId);
  useEffect(() => {
    if (lockedVehicle) {
      setSelectedVehicle(lockedVehicle);
      setStep("setup");
    }
  }, [lockedVehicleId]);

  const handleSelectVehicle = (vehicle: EligibleVehicle) => {
    if (!isVehicleEligible(vehicle.passengers, vehicle.carType)) return;
    setSelectedVehicle(vehicle);
    if (!lockedVehicleId) {
      setShowConfirm(true);
    } else {
      setStep("setup");
    }
  };

  const handleVehicleConfirm = async () => {
    if (!selectedVehicle) return;
    setConfirmLoading(true);
    try {
      // Lock this vehicle in the user's Firestore doc for today
      await setDoc(
        doc(db, "users", driverId),
        {
          bookingVehicleId: selectedVehicle.id,
          bookingVehicleDate: getTodayString(),
        },
        { merge: true }
      );
      setShowConfirm(false);
      setStep("setup");
      toast.success("Vehicle locked in for today!");
    } catch {
      toast.error("Failed to lock vehicle. Try again.");
    } finally {
      setConfirmLoading(false);
    }
  };


  const handleSubmit = async () => {
    if (!selectedVehicle) return;

    // Use refs to get the absolutely latest value, avoiding keystroke state lag
    const finalDestination = destInputRef.current?.value || destination;
    const finalMeeting = meetingInputRef.current?.value || meetingPoint;

    if (!finalDestination.trim()) { toast.error("Enter a destination"); return; }
    if (!finalMeeting.trim()) { toast.error("Enter your meeting point"); return; }
    if (!fare || Number(fare) < 1) { toast.error("Enter a valid fare amount"); return; }
    if (!departureTime) { toast.error("Set your departure time"); return; }

    setSubmitting(true);
    try {
      const passengerSeats = getPassengerSeats(selectedVehicle.passengers, selectedVehicle.carType);

      const bookingRef = await addDoc(collection(db, "loadBookings"), {
        driverId,
        driverName,
        driverFirstName,
        driverPhone,
        driverImage: driverImage || "",
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.carName} ${selectedVehicle.carModel}`,
        vehicleType: selectedVehicle.carType,
        vehicleColor: selectedVehicle.exteriorColor,
        vehiclePlate: selectedVehicle.plateNumber,
        vehicleSideImage: selectedVehicle.images?.side || selectedVehicle.images?.front || "",
        vehicleImages: selectedVehicle.images || {},
        totalSeats: passengerSeats,
        bookedCount: 0,
        destination: finalDestination,
        destinationLat: destinationLat || 0,
        destinationLng: destinationLng || 0,
        meetingPoint: finalMeeting,
        meetingPointLat: meetingLat || 0,
        meetingPointLng: meetingLng || 0,
        fare: Number(fare),
        departureTime,
        status: "active",
        date: getTodayString(),
        driverCity,
        driverState,
        vipLevel: vipLevel || 0,
        isVerified: isVerified || false,
        driverTrustScore: driverTrustScore ?? 100,
        whatsappPreferred: whatsappPreferred || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create seat documents
      const seatsPromises = [];
      for (let i = 1; i <= passengerSeats; i++) {
        seatsPromises.push(
          setDoc(doc(db, "loadBookings", bookingRef.id, "seats", String(i)), {
            seatNumber: i,
            status: "available",
            customerId: null,
            customerName: null,
            customerImage: null,
            trustScore: null,
            bookedAt: null,
          })
        );
      }
      await Promise.all(seatsPromises);

      toast.success("Load booking session created!");
      onSessionCreated(bookingRef.id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create session. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showConfirm && selectedVehicle && (
          <DriverVehicleConfirmModal
            vehicle={selectedVehicle}
            onConfirm={handleVehicleConfirm}
            onCancel={() => { setShowConfirm(false); setSelectedVehicle(null); }}
            loading={confirmLoading}
          />
        )}
      </AnimatePresence>

      {step === "select" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-4">
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              Select Your Vehicle
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              Choose the car you'll be using for today's load booking
            </p>
          </div>

          <div className="space-y-3">
            {vehicles.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <FaCar size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-[11px] font-bold uppercase tracking-widest">No vehicles found in your fleet</p>
              </div>
            )}
            {vehicles.map((v) => {
              const eligible = isVehicleEligible(v.passengers, v.carType);
              const isKeke = v.carType?.toLowerCase() === "keke";
              const pSeats = getPassengerSeats(v.passengers, v.carType);
              const img = v.images?.side || v.images?.front || "/car_select.jpg";
              const isLocked = lockedVehicleId && lockedVehicleId !== v.id;
              const isThisLocked = lockedVehicleId === v.id;

              return (
                <motion.div
                  key={v.id}
                  whileHover={eligible && !isLocked ? { scale: 1.01 } : {}}
                  onClick={() => eligible && !isLocked && handleSelectVehicle(v)}
                  className={`relative rounded-xl border overflow-hidden transition-all ${isThisLocked
                    ? "border-amber-500/60 bg-amber-500/10 cursor-pointer"
                    : eligible && !isLocked
                      ? "border-white/10 bg-gray-800/50 cursor-pointer hover:border-amber-500/40"
                      : "border-white/5 bg-gray-800/30 cursor-not-allowed"
                    } ${!eligible ? "opacity-50" : ""}`}
                >
                  {/* Blur overlay for ineligible */}
                  {!eligible && (
                    <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                      <div className="bg-black/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <FaBan className="text-red-400" size={12} />
                        <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                          {isKeke ? "Keke" : pSeats < 4 ? "Too few seats (<4)" : "Too many seats (>6)"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Lock badge for other vehicles when one is locked */}
                  {isLocked && (
                    <div className="absolute inset-0 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl bg-black/40">
                      <div className="bg-black/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <FaLock className="text-amber-400" size={12} />
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                          Different vehicle locked today
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="w-20 h-16 rounded-lg shrink-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${img})` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-white font-black text-sm leading-tight">
                            {v.carName} {v.carModel}
                          </h3>
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wide mt-0.5">
                            {v.exteriorColor} • {v.carType}
                          </p>
                          <p className="text-gray-500 text-[9px] font-mono mt-0.5">{v.plateNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${eligible
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                            {pSeats} seats
                          </span>
                          {isThisLocked && (
                            <span className="text-[8px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                              LOCKED TODAY
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {eligible && !isLocked && (
                      <FaChevronRight className="text-gray-600 shrink-0" size={12} />
                    )}
                    {isThisLocked && (
                      <FaCheckCircle className="text-amber-400 shrink-0" size={16} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* SETUP FORM */
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {/* Selected vehicle chip */}
          {selectedVehicle && (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5">
              <div className="w-12 h-10 rounded-lg overflow-hidden border border-amber-500/20 bg-gray-900 flex-shrink-0">
                {(selectedVehicle.images?.side || selectedVehicle.images?.front) ? (
                  <img 
                    src={selectedVehicle.images?.side || selectedVehicle.images?.front} 
                    alt="Vehicle" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaCar className="text-amber-500/40" size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-xs uppercase tracking-tight">
                    {selectedVehicle.carName} {selectedVehicle.carModel}
                  </p>
                  <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-500/20">
                    {selectedVehicle.carType}
                  </span>
                </div>
                <p className="text-amber-500/60 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                  {getPassengerSeats(selectedVehicle.passengers, selectedVehicle.carType)} Seats · {selectedVehicle.plateNumber} · {selectedVehicle.exteriorColor}
                </p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <FaLock className="text-amber-400" size={10} />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Destination */}
            <div>
              <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block flex items-center gap-1.5">
                <FaMapMarkerAlt className="text-red-400" size={9} /> Destination / Last Bus Stop
              </label>
              <input
                ref={destInputRef}
                type="text"
                defaultValue={destination}
                placeholder="e.g. Ojota Bus Stop, Lagos"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500 placeholder-gray-600 transition-colors"
              />
              {!isLoaded && (
                <p className="text-[9px] text-gray-600 mt-1 italic">Loading location suggestions...</p>
              )}
            </div>

            {/* Meeting Point */}
            <div>
              <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block flex items-center gap-1.5">
                <FaMapMarkerAlt className="text-green-400" size={9} /> Your Meeting Point (Where customers board)
              </label>
              <input
                ref={meetingInputRef}
                type="text"
                defaultValue={meetingPoint}
                placeholder="e.g. Ikeja City Mall, Ikeja"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500 placeholder-gray-600 transition-colors"
              />
              <p className="text-[10px] text-orange-300 font-semibold mt-1">
                Ensure this is a safe, recognizable, and public location.
              </p>
            </div>

            {/* Fare */}
            <div>
              <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block flex items-center gap-1.5">
                <FaMoneyBillWave className="text-emerald-400" size={9} /> Amount Per Seat (₦)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">₦</span>
                <input
                  type="number"
                  value={fare}
                  onChange={(e) => setFare(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-white text-sm outline-none focus:border-amber-500 placeholder-gray-600 transition-colors"
                />
              </div>
            </div>

            {/* Departure Time */}
            <div>
              <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block flex items-center gap-1.5">
                <FaClock className="text-blue-400" size={9} /> Estimated Departure Time
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black uppercase tracking-widest text-sm rounded-xl shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Go Live — Start Load Booking
                  <FaChevronRight size={12} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
