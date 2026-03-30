// components/driver/VehicleImageUpload.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface VehicleImageUploadProps {
    label: string;
    type: 'front' | 'side' | 'back' | 'interior';
    existingImage?: string;
    onFileChange: (type: string, file: File | null) => void;
    required?: boolean;
    preview?: string;
}

export const VehicleImageUpload: React.FC<VehicleImageUploadProps> = ({
    label,
    type,
    existingImage,
    onFileChange,
    required = false,
    preview
}) => {
    const [imagePreview, setImagePreview] = useState<string>(preview || existingImage || '');
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (preview) {
            setImagePreview(preview);
        } else if (existingImage) {
            setImagePreview(existingImage);
        }
    }, [preview, existingImage]);

    const handleFileChange = (file: File | null) => {
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size should be less than 5MB");
                return;
            }
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                toast.error(`${label} must be a JPG, PNG, or WebP image`);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            onFileChange(type, file);
        } else {
            setImagePreview(existingImage || '');
            onFileChange(type, null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileChange(file);
        } else {
            toast.error('Please drop an image file');
        }
    };

    return (
        <div className="text-center">
            <label className="block text-xs font-medium text-gray-600 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                className={`relative w-full h-32 border-2 border-dashed rounded-lg overflow-hidden transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${imagePreview ? 'border-solid' : 'border-dashed'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {imagePreview ? (
                    <img src={imagePreview} alt={`${label} preview`} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-2xl">📸</span>
                        <span className="text-xs mt-1">{label}</span>
                        <span className="text-[10px] mt-1 text-gray-400">Drag & drop or click</span>
                    </div>
                )}
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required={required && !existingImage && !preview}
                />
            </div>
        </div>
    );
};