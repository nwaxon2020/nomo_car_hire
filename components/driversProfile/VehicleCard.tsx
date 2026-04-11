// components/driver/VehicleCard.tsx
import React, { useState, useEffect } from 'react';
import {
    Edit3, Trash2, CheckCircle, Clock,
    ChevronLeft, ChevronRight, X, ShieldCheck,
    User, Wind, Paintbrush, FileText, ChevronDown, ChevronUp, Bookmark
} from 'lucide-react';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';

interface Vehicle {
    id?: string; // Add this if you use v.id
    carName: string;
    carModel: string;
    carType: string;
    plateNumber: string;
    passengers: number;
    ac: boolean;
    exteriorColor: string;
    interiorColor: string;
    description?: string;
    // Add question marks to make these optional
    status?: 'available' | 'unavailable' | 'maintenance';
    isApproved?: boolean;
    images: {
        front: string;
        side: string;
        back: string;
        interior: string;
        license?: string;
        ownership?: string;
        insurance?: string;
    };
}

interface VehicleCardProps {
    vehicle: Vehicle;
    isOnlyVehicle?: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onMarkAvailable: () => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
    vehicle,
    isOnlyVehicle = false,
    onEdit,
    onDelete,
    onMarkAvailable
}) => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [showNoDocsOverlay, setShowNoDocsOverlay] = useState(false);
    const [isBookingVehicle, setIsBookingVehicle] = useState(false);
    const [settingBooking, setSettingBooking] = useState(false);
    const [isVehicleChangeLocked, setIsVehicleChangeLocked] = useState(false);

    // Listen for booking vehicle status
    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || !vehicle.id) return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setIsBookingVehicle(data.bookingVehicleId === vehicle.id);
                
                if (data.bookingVehicleLastUpdated) {
                    const lastUpdated = data.bookingVehicleLastUpdated.toDate();
                    const locked = (Date.now() - lastUpdated.getTime()) < (24 * 60 * 60 * 1000);
                    setIsVehicleChangeLocked(locked);
                } else {
                    setIsVehicleChangeLocked(false);
                }
            }
        });
        return () => unsubscribe();
    }, [vehicle.id]);

    const handleSetBookingVehicle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (isVehicleChangeLocked) {
             toast.error("You can only change your active vehicle once every 24 hours.");
             return;
        }
        
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || !vehicle.id) return;

        setSettingBooking(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                bookingVehicleId: isBookingVehicle ? null : vehicle.id,
                bookingVehicleLastUpdated: serverTimestamp()
            });
            toast.success(isBookingVehicle ? 'Booking vehicle deselected' : `${vehicle.carName} set as your booking vehicle!`);
        } catch (err) {
            toast.error('Failed to update booking vehicle');
        } finally {
            setSettingBooking(false);
        }
    };

    const allImages = [
        { url: vehicle.images.front, label: 'Front View' },
        { url: vehicle.images.side, label: 'Side View' },
        { url: vehicle.images.back, label: 'Rear View' },
        { url: vehicle.images.interior, label: 'Interior' },
        { url: vehicle.images.license, label: 'Vehicle License' },
        { url: vehicle.images.ownership, label: 'Ownership Paper' },
        { url: vehicle.images.insurance, label: 'Insurance' },
    ].filter(img => img.url);

    const firstDocIndex = allImages.findIndex(img => 
        ['Vehicle License', 'Ownership Paper', 'Insurance'].includes(img.label)
    );

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLightboxIndex((prev) => (prev !== null && prev < allImages.length - 1 ? prev + 1 : 0));
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : allImages.length - 1));
    };

    // Status Styling Logic
    const getStatusStyles = () => {
        switch (vehicle.status) {
            case 'available': return 'bg-emerald-500/90 border-emerald-400 text-white';
            case 'maintenance': return 'bg-gray-500/90 border-gray-400 text-white';
            case 'unavailable': return 'bg-red-500/90 border-red-400 text-white';
            default: return 'bg-blue-500/90 border-blue-400 text-white';
        }
    };

    return (
        <>
            <div className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full relative">

                {/* Image Section */}
                <div className="relative h-44 w-full overflow-hidden cursor-pointer" onClick={() => setLightboxIndex(0)}>
                    <img
                        src={vehicle.images.front}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt={vehicle.carName}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {vehicle.isApproved && (
                            <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg border border-blue-400 animate-in zoom-in">
                                <ShieldCheck size={16} fill="currentColor" className="text-white fill-blue-200" />
                            </div>
                        )}
                    </div>

                    <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md border transition-colors ${getStatusStyles()}`}>
                            {vehicle.status}
                        </span>
                    </div>

                    <div className="absolute bottom-3 left-3 text-white">
                        <h3 className="font-bold text-base leading-tight drop-shadow-md">
                            {vehicle.carName}
                        </h3>
                        <p className="text-[10px] opacity-90 font-medium tracking-wide">
                            {vehicle.carModel.toUpperCase()} • {vehicle.carType}
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 flex-1 flex flex-col">
                    {/* Improved Details Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <User size={14} className="text-blue-500" />
                            <span className="text-[11px] font-bold text-gray-700">{vehicle.passengers} Seats</span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <Wind size={14} className="text-blue-500" />
                            <span className="text-[11px] font-bold text-gray-700">{vehicle.ac ? 'Full AC' : 'No AC'}</span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            <Paintbrush size={14} className="text-blue-500" />
                            <span className="text-[11px] font-bold text-gray-700 truncate capitalize">{vehicle.exteriorColor}</span>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                            <FileText size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black text-blue-700 uppercase">{vehicle.plateNumber}</span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (firstDocIndex !== -1) {
                                setLightboxIndex(firstDocIndex); 
                            } else {
                                setShowNoDocsOverlay(true);
                            }
                        }}
                        className="w-full mb-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                    >
                        <FileText size={14} /> Check Car Papers
                    </button>

                    {/* Description Toggle */}
                    {vehicle.description && (
                        <div className="mb-4">
                            <button
                                onClick={() => setShowDescription(!showDescription)}
                                className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:text-blue-800 transition-colors"
                            >
                                {showDescription ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {showDescription ? 'Hide Details' : 'View Description'}
                            </button>

                            {showDescription && (
                                <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 animate-in slide-in-from-top-1 duration-200">
                                    <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                        "{vehicle.description}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}



                    {/* Admin Approval Message */}
                    <div className={`mt-auto mb-4 p-2.5 rounded-xl border flex items-center gap-2 ${vehicle.isApproved
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                        {vehicle.isApproved ? <CheckCircle size={14} /> : <Clock size={14} />}
                        <span className="text-[10px] font-bold leading-tight">
                            {vehicle.isApproved
                                ? 'Verified: Ready for operations.'
                                : 'Pending: Under document review.'}
                        </span>
                    </div>

                    {/* Set as Booking Vehicle Button */}
                    {isOnlyVehicle ? (
                        <button disabled className="w-full mb-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-2 shadow-sm bg-emerald-500 border-emerald-400 text-white shadow-emerald-200 cursor-default">
                            <CheckCircle size={14} /> Auto-Selected (Only Vehicle)
                        </button>
                    ) : (
                        <button
                            onClick={handleSetBookingVehicle}
                            disabled={settingBooking || isVehicleChangeLocked}
                            className={`w-full mb-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border-2 shadow-sm ${
                                isBookingVehicle
                                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-200'
                                    : isVehicleChangeLocked
                                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            {isVehicleChangeLocked && !isBookingVehicle ? <Clock size={14} /> : <Bookmark size={14} fill={isBookingVehicle ? 'white' : 'none'} />}
                            {settingBooking ? 'Updating...' : isBookingVehicle ? '✓ Booking Vehicle (Active)' : isVehicleChangeLocked ? 'Locked (24H)' : 'Set as Booking Vehicle'}
                        </button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onEdit}
                            className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
                        >
                            <Edit3 size={14} /> Edit
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* FULL SCREEN LIGHTBOX OVERLAY (Existing Logic) */}
            {lightboxIndex !== null && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute top-6 left-0 right-0 flex justify-between px-6 items-center">
                        <div className="text-white">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{allImages[lightboxIndex].label}</p>
                            <p className="text-sm">{lightboxIndex + 1} / {allImages.length}</p>
                        </div>
                        <button
                            onClick={() => setLightboxIndex(null)}
                            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/5 rounded-full text-white hover:bg-white/20 transition-all">
                        <ChevronLeft size={32} />
                    </button>
                    <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/5 rounded-full text-white hover:bg-white/20 transition-all">
                        <ChevronRight size={32} />
                    </button>

                    <img
                        src={allImages[lightboxIndex].url}
                        className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
                        alt="Full view"
                    />
                </div>
            )}

            {/* ERROR OVERLAY FOR MISSING PAPERS */}
            {showNoDocsOverlay && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNoDocsOverlay(false); }} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">No Papers Uploaded</h3>
                        <p className="text-sm text-gray-500 mb-6 font-medium">
                            It looks like no legal documents have been submitted for this {vehicle.carName} yet.
                        </p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNoDocsOverlay(false); }}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};