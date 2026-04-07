"use client";

import { useState } from "react";
import { X, Car } from "lucide-react";

interface VehiclePreviewModalProps {
  vehicle: any;
  onClose: () => void;
}

export default function VehiclePreviewModal({
  vehicle,
  onClose
}: VehiclePreviewModalProps) {
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            {vehicle.make} {vehicle.model}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {vehicle.images?.length > 0 ? (
            <>
              <img
                src={vehicle.images[previewImageIndex]}
                alt="Vehicle"
                className="w-full h-full object-contain"
              />
              {vehicle.images.length > 1 && (
                <>
                  <button
                    onClick={() => setPreviewImageIndex(prev => (prev === 0 ? vehicle.images.length - 1 : prev - 1))}
                    className="absolute left-2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setPreviewImageIndex(prev => (prev === vehicle.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    &gt;
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-gray-500 flex flex-col items-center gap-2">
              <Car className="w-12 h-12" />
              No images available
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-900">
          <div className="flex gap-2 justify-center">
            {vehicle.images?.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setPreviewImageIndex(i)}
                className={`w-2 h-2 rounded-full ${i === previewImageIndex ? 'bg-blue-500 w-4' : 'bg-gray-700'} transition-all`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
