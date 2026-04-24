"use client";

import { motion } from "framer-motion";
import { FaCar, FaLock, FaExclamationTriangle, FaCheck, FaTimes } from "react-icons/fa";
import { EligibleVehicle } from "./types";

interface DriverVehicleConfirmModalProps {
  vehicle: EligibleVehicle;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DriverVehicleConfirmModal({
  vehicle,
  onConfirm,
  onCancel,
  loading = false,
}: DriverVehicleConfirmModalProps) {
  const frontImg =
    vehicle.images?.front || vehicle.images?.side || "/car_select.jpg";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-amber-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/40 to-orange-600/30 border-b border-amber-500/20 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
            <FaLock className="text-amber-400" size={16} />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-widest text-sm text-white">
              Confirm Vehicle
            </h3>
            <p className="text-[9px] text-amber-400/70 font-bold uppercase tracking-wider">
              Day-Lock Warning
            </p>
          </div>
        </div>

        {/* Vehicle preview */}
        <div className="p-4">
          <div
            className="relative h-36 rounded-xl overflow-hidden mb-4 border border-white/5"
            style={{
              backgroundImage: `url(${frontImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <h4 className="text-white font-black text-base leading-tight">
                {vehicle.carName} {vehicle.carModel}
              </h4>
              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {vehicle.exteriorColor} • {vehicle.carType} • {vehicle.plateNumber}
              </p>
            </div>
          </div>

          {/* Warning box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start gap-2.5">
            <FaExclamationTriangle className="text-amber-400 mt-0.5 shrink-0" size={14} />
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
                Important — Read Before Confirming
              </p>
              <p className="text-[10px] text-gray-300 leading-relaxed font-medium">
                Once you confirm, <strong className="text-white">this vehicle will be locked in for today.</strong> You will{" "}
                <strong className="text-red-400">not be able to switch</strong> to another vehicle until{" "}
                <strong className="text-white">tomorrow</strong>. Customers will be matched to this car for today's load booking.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-white/5 rounded-xl p-3 mb-5 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-gray-500 font-bold uppercase tracking-wider">Passenger Seats</p>
              <p className="text-white font-black mt-0.5">{vehicle.passengers} seats</p>
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase tracking-wider">Plate No.</p>
              <p className="text-white font-black mt-0.5 font-mono">{vehicle.plateNumber}</p>
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase tracking-wider">Type</p>
              <p className="text-white font-black mt-0.5 capitalize">{vehicle.carType}</p>
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase tracking-wider">Color</p>
              <p className="text-white font-black mt-0.5">{vehicle.exteriorColor}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <FaTimes size={10} /> Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FaCheck size={10} /> Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
