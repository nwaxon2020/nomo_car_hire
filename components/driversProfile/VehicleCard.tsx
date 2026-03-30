// components/driver/VehicleCard.tsx
import React from 'react';
import { Vehicle } from './driver';

interface VehicleCardProps {
    vehicle: Vehicle;
    selectedMainImage: string;
    onThumbnailClick: (imageUrl: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    onMarkAvailable: () => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
    vehicle,
    selectedMainImage,
    onThumbnailClick,
    onEdit,
    onDelete,
    onMarkAvailable
}) => {
    const capitalizeFullName = (name: string) =>
        name?.split(" ").filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ") || "Professional Driver";

    return (
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all duration-300">
            <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                <img
                    src={selectedMainImage || vehicle.images.front}
                    className="w-full h-full object-cover"
                    alt={vehicle.carName}
                />
                <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm
            ${vehicle.status === 'available' ? 'bg-green-100 text-green-800 border border-green-200' :
                            vehicle.status === 'unavailable' ? 'bg-red-100 text-red-800 border border-red-200' :
                                'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                        {vehicle.status ? `${vehicle.status.charAt(0).toUpperCase()}${vehicle.status.slice(1)}` : 'Available'}
                    </span>
                    {vehicle.status !== 'available' && (
                        <button
                            onClick={onMarkAvailable}
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors shadow-sm"
                        >
                            Mark Available
                        </button>
                    )}
                </div>
            </div>

            <div className="flex justify-center items-center gap-2 mb-4 border-b border-gray-200 pb-3">
                {(['front', 'side', 'back', 'interior'] as const).map((view) => (
                    <img
                        key={view}
                        src={vehicle.images[view]}
                        className={`w-14 h-14 rounded-md object-cover border-2 cursor-pointer transition-all duration-200 hover:scale-105
              ${selectedMainImage === vehicle.images[view]
                                ? "border-blue-500 shadow-lg"
                                : "border-gray-300 hover:border-gray-400"}`}
                        onClick={() => onThumbnailClick(vehicle.images[view])}
                        alt={`${view} view`}
                    />
                ))}
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {capitalizeFullName(vehicle.carName)}
                    </h3>
                    <span className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-2 py-1 rounded-full capitalize font-medium">
                        {vehicle.carType}
                    </span>
                </div>
                <p className="text-sm text-gray-600 mb-2 font-medium">{vehicle.carModel.toUpperCase()}</p>
                <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">Plate: {vehicle.plateNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-500">👤</span>
                    <span className="text-gray-700">{vehicle.passengers} seats</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-500">❄️</span>
                    <span className="text-gray-700">{vehicle.ac ? 'AC' : 'No AC'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-500">🎨</span>
                    <span className="text-gray-700 capitalize">{vehicle.exteriorColor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-500">🛋️</span>
                    <span className="text-gray-700 capitalize">{vehicle.interiorColor}</span>
                </div>
            </div>

            {vehicle.description && (
                <p className="text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 line-clamp-2 border border-blue-100">
                    {vehicle.description}
                </p>
            )}

            <div className="flex justify-between pt-3 border-t border-gray-200">
                <button
                    onClick={onEdit}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <span>✏️</span> Edit
                </button>
                <button
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <span>🗑️</span> Delete
                </button>
            </div>
        </div>
    );
};