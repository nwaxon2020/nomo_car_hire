// components/driverProfile/DeleteVehicleModal.tsx
import React from 'react';

interface DeleteVehicleModalProps {
    showDeleteModal: boolean;
    setShowDeleteModal: (show: boolean) => void;
    onDelete: () => void;
    setVehicleToDelete: (id: string | null) => void;
}

export const DeleteVehicleModal: React.FC<DeleteVehicleModalProps> = ({
    showDeleteModal,
    setShowDeleteModal,
    onDelete,
    setVehicleToDelete
}) => {
    if (!showDeleteModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl text-red-600">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Vehicle</h3>
                    <p className="text-gray-600 mb-4">
                        Are you sure you want to delete this vehicle? This action cannot be undone.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-3">
                    <button
                        onClick={() => {
                            setShowDeleteModal(false);
                            setVehicleToDelete(null);
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all text-center"
                    >
                        Delete Vehicle
                    </button>
                </div>
            </div>
        </div>
    );
};