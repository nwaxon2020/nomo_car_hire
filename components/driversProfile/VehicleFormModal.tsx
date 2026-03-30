// components/driver/VehicleFormModal.tsx
import React, { useState, useEffect } from 'react';
import { VehicleImageUpload } from './VehicleImageUpload';
import { toast } from 'react-hot-toast';

interface VehicleFormData {
    carName: string;
    carModel: string;
    carType: string;
    passengers: number;
    ac: boolean;
    plateNumber: string;
    exteriorColor: string;
    interiorColor: string;
    description: string;
    status: 'available' | 'unavailable' | 'maintenance';
}

interface VehicleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, images: any) => Promise<void>;
    editingVehicle?: any;
    isLoading?: boolean;
    canAddVehicle?: boolean;
    vehicleLimitMessage?: string;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    editingVehicle,
    isLoading = false,
    canAddVehicle = true,
    vehicleLimitMessage = ''
}) => {
    const [formData, setFormData] = useState<VehicleFormData>({
        carName: '',
        carModel: '',
        carType: 'sedan',
        passengers: 4,
        ac: true,
        plateNumber: '',
        exteriorColor: '',
        interiorColor: '',
        description: '',
        status: 'available'
    });

    const [images, setImages] = useState<{
        front: File | null;
        side: File | null;
        back: File | null;
        interior: File | null;
    }>({
        front: null,
        side: null,
        back: null,
        interior: null
    });

    const [previews, setPreviews] = useState<{
        front?: string;
        side?: string;
        back?: string;
        interior?: string;
    }>({});

    useEffect(() => {
        if (editingVehicle) {
            setFormData({
                carName: editingVehicle.carName,
                carModel: editingVehicle.carModel,
                carType: editingVehicle.carType || 'sedan',
                passengers: editingVehicle.passengers,
                ac: editingVehicle.ac,
                plateNumber: editingVehicle.plateNumber,
                exteriorColor: editingVehicle.exteriorColor || '',
                interiorColor: editingVehicle.interiorColor || '',
                description: editingVehicle.description || '',
                status: editingVehicle.status || 'available'
            });
            setPreviews(editingVehicle.images);
        } else {
            resetForm();
        }
    }, [editingVehicle]);

    const resetForm = () => {
        setFormData({
            carName: '',
            carModel: '',
            carType: 'sedan',
            passengers: 4,
            ac: true,
            plateNumber: '',
            exteriorColor: '',
            interiorColor: '',
            description: '',
            status: 'available'
        });
        setImages({
            front: null,
            side: null,
            back: null,
            interior: null
        });
        setPreviews({});
    };

    const handleImageChange = (type: string, file: File | null) => {
        setImages(prev => ({ ...prev, [type]: file }));
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        } else if (editingVehicle?.images[type]) {
            setPreviews(prev => ({ ...prev, [type]: editingVehicle.images[type] }));
        }
    };

    const validateForm = (): boolean => {
        const errors: string[] = [];

        if (!formData.carName.trim()) errors.push("Vehicle name is required");
        if (!formData.carModel.trim()) errors.push("Vehicle model is required");
        if (!formData.plateNumber.trim()) errors.push("Plate number is required");
        if (!formData.exteriorColor.trim()) errors.push("Exterior color is required");
        if (!formData.interiorColor.trim()) errors.push("Interior color is required");

        const plateRegex = /^[A-Z0-9]{3,10}$/i;
        if (formData.plateNumber.trim() && !plateRegex.test(formData.plateNumber.trim())) {
            errors.push("Plate number should be 3-10 alphanumeric characters");
        }

        const colorRegex = /^[a-zA-Z\s]{2,20}$/;
        if (formData.exteriorColor.trim() && !colorRegex.test(formData.exteriorColor.trim())) {
            errors.push("Exterior color should be 2-20 letters only");
        }
        if (formData.interiorColor.trim() && !colorRegex.test(formData.interiorColor.trim())) {
            errors.push("Interior color should be 2-20 letters only");
        }

        if (!editingVehicle) {
            if (!images.front) errors.push("Front view photo is required");
            if (!images.side) errors.push("Side view photo is required");
            if (!images.back) errors.push("Back view photo is required");
            if (!images.interior) errors.push("Interior view photo is required");
        }

        if (!editingVehicle && !canAddVehicle) {
            errors.push(vehicleLimitMessage || "Vehicle limit reached!");
        }

        if (errors.length > 0) {
            toast.error(`Please fix the following:\n• ${errors.join('\n• ')}`, { duration: 5000 });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const submissionData = {
            ...formData,
            plateNumber: formData.plateNumber.trim().toUpperCase(),
            carName: formData.carName.trim(),
            carModel: formData.carModel.trim(),
            exteriorColor: formData.exteriorColor.trim(),
            interiorColor: formData.interiorColor.trim(),
            description: formData.description.trim()
        };

        await onSubmit(submissionData, images);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
                <button
                    onClick={() => {
                        resetForm();
                        onClose();
                    }}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                >
                    ×
                </button>

                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {editingVehicle ? 'Update your vehicle details' : 'Fill in the details to add your vehicle'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vehicle Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.carName}
                                onChange={(e) => setFormData({ ...formData, carName: e.target.value })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., Toyota Camry"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vehicle Model <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.carModel}
                                onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., 2022 LE"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Plate Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.plateNumber}
                                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., ABC123DE"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vehicle Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.carType}
                                onChange={(e) => setFormData({ ...formData, carType: e.target.value })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                required
                            >
                                <option value="sedan">Sedan</option>
                                <option value="suv">SUV</option>
                                <option value="truck">Truck</option>
                                <option value="van">Van</option>
                                <option value="bus">Bus</option>
                                <option value="keke">Keke</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Exterior Color <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.exteriorColor}
                                onChange={(e) => setFormData({ ...formData, exteriorColor: e.target.value })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., Red, Blue, Black"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Interior Color <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.interiorColor}
                                onChange={(e) => setFormData({ ...formData, interiorColor: e.target.value })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., Black, Beige, Gray"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Passengers <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.passengers}
                                onChange={(e) => setFormData({ ...formData, passengers: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                required
                            >
                                <option value={2}>2</option>
                                <option value={4}>4</option>
                                <option value={6}>6</option>
                                <option value={8}>8</option>
                                <option value={10}>10+</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="available">Available</option>
                                <option value="unavailable">Unavailable</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="ac"
                            checked={formData.ac}
                            onChange={(e) => setFormData({ ...formData, ac: e.target.checked })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="ac" className="ml-2 text-sm text-gray-700">
                            Air Conditioning Available
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Describe your vehicle features..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Vehicle Images <span className="text-red-500">*</span>
                            <span className="text-xs text-gray-500 ml-2">(All 4 photos required for new vehicles, max 5MB each)</span>
                        </label>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <VehicleImageUpload
                                label="Front View"
                                type="front"
                                existingImage={editingVehicle?.images?.front}
                                onFileChange={handleImageChange}
                                required={!editingVehicle}
                                preview={previews.front}
                            />
                            <VehicleImageUpload
                                label="Side View"
                                type="side"
                                existingImage={editingVehicle?.images?.side}
                                onFileChange={handleImageChange}
                                required={!editingVehicle}
                                preview={previews.side}
                            />
                            <VehicleImageUpload
                                label="Back View"
                                type="back"
                                existingImage={editingVehicle?.images?.back}
                                onFileChange={handleImageChange}
                                required={!editingVehicle}
                                preview={previews.back}
                            />
                            <VehicleImageUpload
                                label="Interior View"
                                type="interior"
                                existingImage={editingVehicle?.images?.interior}
                                onFileChange={handleImageChange}
                                required={!editingVehicle}
                                preview={previews.interior}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {isLoading ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};