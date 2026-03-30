"use client";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "react-hot-toast";
import { FaWind, FaUsers, FaCheckCircle, FaEye, FaCarSide, FaExclamationTriangle } from "react-icons/fa";

import { triggerNotification } from "@/lib/notifications";

export default function VehicleCard({ car }: any) {
  const [showDocs, setShowDocs] = useState(false);
  const [selectedView, setSelectedView] = useState<string>("front");
  const [showConfirm, setShowConfirm] = useState(false); // Confirmation overlay state

  const mainImage = car.images?.[selectedView] || car.images?.front || "";

  // Logic to check if the car was added in the last 24 hours
  const isNew = car.createdAt && (Date.now() - new Date(car.createdAt).getTime() < 86400000);

  const handleApproveVehicle = async () => {
    try {
      // Updates the specific vehicle in the vehicleLog collection
      await updateDoc(doc(db, "vehicleLog", car.id), {
        status: "approved",
        approvedAt: new Date().toISOString()
      });

      // ADD THIS: Notify the owner/driver
      await triggerNotification(
        car.driverId, // Ensure this field exists in your car object
        "Vehicle Approved! ✅",
        `Your ${car.carName} has been verified and is now live.`,
        "success",
        "/user/my-vehicles"
      );

      toast.success(`${car.carName} Approved!`);
      setShowConfirm(false); // Close overlay after success
    } catch (error) {
      toast.error("Failed to approve vehicle");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-[350px] relative">

      {/* Confirmation Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in duration-200">
          <FaExclamationTriangle className="text-amber-500 text-2xl mb-2" />
          <p className="text-xs font-black text-gray-800 uppercase mb-3">Approve {car.carName}?</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 bg-gray-200 text-gray-800 text-[10px] font-bold rounded"
            >
              CANCEL
            </button>
            <button
              onClick={handleApproveVehicle}
              className="flex-1 py-2 bg-green-600 text-white text-[10px] font-bold rounded"
            >
              CONFIRM
            </button>
          </div>
        </div>
      )}

      {/* 2. New Vehicle Bubbling Indicator */}
      {isNew && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse shadow-lg">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span> NEW ENTRY
        </div>
      )}

      {/* Top: Image Section */}
      <div className="relative h-55 w-full bg-gray-100">
        <img src={mainImage} alt={car.carName} className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1.5 bg-black/30 backdrop-blur-sm p-1 rounded-md">
          {car.images && Object.entries(car.images).map(([key, url]: any) => (
            <button
              key={key}
              onClick={() => setSelectedView(key)}
              className={`w-8 h-8 rounded border-2 overflow-hidden transition-all ${selectedView === key ? "border-amber-400 scale-110" : "border-white/50 opacity-70"
                }`}
            >
              <img src={url} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: Info Section */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h4 className="font-black text-gray-800 text-sm uppercase leading-tight">
              {car.carName} <span className="font-medium text-gray-500">{car.carModel}</span>
            </h4>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
              {car.plateNumber}
            </span>
          </div>
          <div className="flex gap-3 mt-2 py-2 border-y border-gray-50">
            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600"><FaUsers /> {car.passengers}</span>
            <span className={`flex items-center gap-1 text-[11px] font-bold ${car.ac ? 'text-blue-500' : 'text-gray-400'}`}><FaWind /> AC</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-600 capitalize"><FaCarSide /> {car.exteriorColor}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => setShowDocs(true)} className="flex-[2] py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold rounded flex items-center justify-center gap-2 transition-colors">
            <FaEye /> VIEW PAPERS
          </button>

          {/* 1. Updated Approve Button with Confirmation Trigger */}
          <button
            disabled={car.status === "approved"}
            className={`flex-1 py-2 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-all ${car.status === "approved" ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            onClick={() => setShowConfirm(true)}
          >
            <FaCheckCircle /> {car.status === "approved" ? "APPROVED" : "APPROVE"}
          </button>
        </div>
      </div>

      {showDocs && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <button onClick={() => setShowDocs(false)} className="absolute top-6 right-6 text-white text-3xl">✕</button>
          <div className="max-w-4xl w-full">
            <h3 className="text-white text-xl font-bold mb-4 uppercase tracking-tighter">Documents: {car.plateNumber}</h3>
            <img src={car.images?.side} className="w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" alt="Car Papers" />
          </div>
        </div>
      )}
    </div>
  );
}