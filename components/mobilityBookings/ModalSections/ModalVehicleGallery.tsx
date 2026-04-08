"use client"
import React from 'react';
import Image from 'next/image';
import { VehicleLog } from '../types';
import { getVehicleImages } from '../utils';

interface ModalVehicleGalleryProps {
    vehicle: VehicleLog;
    mainImage: string;
    onSetMainImage: (img: string) => void;
}

export default function ModalVehicleGallery({ vehicle, mainImage, onSetMainImage }: ModalVehicleGalleryProps) {
    const images = getVehicleImages(vehicle);
    
    return (
        <div className="mb-4">
            <h3 className="text-lg font-bold text-white mb-3">Vehicle Gallery</h3>
            <div className="relative h-76 bg-gray-800 rounded-lg overflow-hidden mb-4">
                <Image
                    src={mainImage || images[0]}
                    alt="Car Image"
                    fill
                    className="object-contain w-full h-full"
                />
            </div>
            <div className="flex justify-center items-center gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSetMainImage(img)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                            mainImage === img ? "border-blue-500" : "border-gray-700"
                        }`}
                    >
                        <Image
                            src={img}
                            alt="car thumbnail"
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
