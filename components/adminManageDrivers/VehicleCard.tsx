"use client";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { toast } from "react-hot-toast";
import { FaWind, FaUsers, FaCheckCircle, FaEye, FaCarSide, FaExclamationTriangle, FaChevronLeft, FaChevronRight } from "react-icons/fa";

import { triggerNotification } from "@/lib/notifications";

export default function VehicleCard({ car }: any) {
  const [showDocs, setShowDocs] = useState(false);
  const [selectedView, setSelectedView] = useState<string>("front");
  const [showConfirm, setShowConfirm] = useState(false); // Confirmation overlay state

  const paperImages = [
    { url: car.images?.license, label: "License" },
    { url: car.images?.ownership, label: "Ownership" },
    { url: car.images?.insurance, label: "Insurance" },
    { url: car.images?.roadworthiness, label: "Roadworthiness" }
  ].filter(img => img.url);
  const [paperIndex, setPaperIndex] = useState(0);

  const nextPaper = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperIndex((prev) => (prev + 1) % paperImages.length);
  };
  const prevPaper = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperIndex((prev) => (prev - 1 + paperImages.length) % paperImages.length);
  };

  const mainImage = car.images?.[selectedView] || car.images?.front || "";

  // Logic to check if the car was added in the last 24 hours
  const isNew = car.createdAt && (Date.now() - new Date(car.createdAt).getTime() < 86400000);

  const handleApproveVehicle = async () => {
    try {
      await updateDoc(doc(db, "vehicleLog", car.id), {
        status: "approved",
        isApproved: true,
        approvedAt: new Date().toISOString()
      });

      await triggerNotification(
        car.driverId,
        "Vehicle Approved! ✅",
        `Your ${car.carName} has been verified and is now live.`,
        "success",
        `/user/driver-profile/${car.driverId}#${car.id}` // <--- Targeted URL
      );

      toast.success(`${car.carName} Approved!`);
      setShowConfirm(false);
    } catch (error) {
      console.error(error);
      toast.error("Permissions Denied: Only designated admins can approve.");
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
            disabled={car.isApproved === true}
            className={`flex-1 py-2 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-all 
              ${car.isApproved === true ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            onClick={() => setShowConfirm(true)}
          >
            <FaCheckCircle />
            {car.isApproved === true ? "APPROVED" : "APPROVE"}
          </button>

        </div>
      </div>

      {showDocs && paperImages.length > 0 && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <button onClick={() => setShowDocs(false)} className="absolute top-6 right-6 text-white text-3xl hover:text-red-500 z-50 transition-colors">✕</button>
          
          <button onClick={prevPaper} className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white z-50 transition-colors">
            <FaChevronLeft size={40} />
          </button>
          
          <button onClick={nextPaper} className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white z-50 transition-colors">
            <FaChevronRight size={40} />
          </button>

          <div className="max-w-4xl w-full text-center relative flex flex-col items-center justify-center h-full">
            <h3 className="text-white text-xl font-bold mb-1 uppercase tracking-tighter">
              {paperImages[paperIndex].label} • {car.plateNumber}
            </h3>
            <p className="text-gray-400 text-xs mb-6 font-bold">{paperIndex + 1} / {paperImages.length}</p>
            <img src={paperImages[paperIndex].url} className="w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" alt={paperImages[paperIndex].label} />
          </div>
        </div>
      )}

      {showDocs && paperImages.length === 0 && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <button onClick={() => setShowDocs(false)} className="absolute top-6 right-6 text-white text-3xl hover:text-red-500 z-50 transition-colors">✕</button>
          <h3 className="text-white text-xl font-bold uppercase tracking-tighter">No Papers Uploaded</h3>
          <p className="text-gray-400 text-sm mt-2">The driver has not uploaded any documents.</p>
        </div>
      )}
    </div>
  );

}
