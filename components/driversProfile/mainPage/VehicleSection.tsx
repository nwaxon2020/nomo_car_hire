// components/driverProfile/VehicleSection.tsx
import React, { useRef, useEffect } from 'react'; // Added useEffect
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { VehicleCard } from '@/components/driversProfile/VehicleCard';
import { Vehicle } from '@/components/driversProfile/driver';

interface VehicleSectionProps {
    vehicles: Vehicle[];
    onAddVehicle: () => void;
    onEditVehicle: (vehicle: Vehicle) => void;
    onDeleteVehicle: (id?: string) => void;
    onMarkAvailable: (id: string) => void;
}

export const VehicleSection: React.FC<VehicleSectionProps> = ({
    vehicles,
    onAddVehicle,
    onEditVehicle,
    onDeleteVehicle,
    onMarkAvailable
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- NEW SCROLL LOGIC FOR NOTIFICATIONS ---
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && vehicles.length > 0) {
            const targetId = hash.replace('#', '');
            // Small timeout ensures the DOM has rendered the cards
            const timer = setTimeout(() => {
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [vehicles]);
    // ------------------------------------------

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 340;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="bg-[#0f172a] border border-slate-800 rounded-md md:rounded-xl p-4 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        My Fleet
                        <span className="bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border border-blue-500/20">
                            Live View
                        </span>
                    </h2>
                </div>

                {/* Navigation Buttons & Count */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-2 rounded-full bg-slate-800/50 border border-slate-700 text-white hover:bg-blue-600 transition-all active:scale-90"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-full bg-slate-800/50 border border-slate-700 text-white hover:bg-blue-600 transition-all active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {vehicles.length === 0 ? (
                <div className="group relative flex flex-col items-center justify-center py-16 bg-[#0f172a]/60 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden min-w-[320px] md:min-w-[380px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

                    <div className="text-center mb-8 relative z-10">
                        <div className="bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full border border-slate-700 mb-4 inline-block">
                            Empty Slot
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">
                            Register Vehicle
                        </h3>
                        <p className="text-slate-500 text-xs font-medium mt-2 max-w-[220px] leading-relaxed">
                            Ready to expand your fleet? Add a new luxury asset to your profile.
                        </p>
                    </div>

                    <button
                        onClick={onAddVehicle}
                        className="relative z-10 flex items-center gap-3 bg-white hover:bg-blue-600 text-slate-900 hover:text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all duration-500 group/btn shadow-[0_10px_20px_rgba(0,0,0,0.3)] active:scale-95"
                    >
                        <div className="bg-slate-100 group-hover/btn:bg-white/20 p-1 rounded-lg transition-colors">
                            <Plus size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                        </div>
                        Add Vehicle
                    </button>

                    <div className="absolute bottom-6 flex items-center gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Ready</span>
                    </div>
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex flex-col md:flex-row gap-6 overflow-y-auto md:overflow-x-auto max-h-[65rem] md:max-h-none pb-6 no-scrollbar snap-y md:snap-x snap-mandatory scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {vehicles.map((v) => (
                        <div
                            key={v.id}
                            id={v.id} // ADDED ID HERE
                            className="min-w-full md:min-w-[320px] snap-start transition-transform duration-300 scroll-mt-32" // ADDED scroll-mt-32
                        >
                            <VehicleCard
                                vehicle={v}
                                onEdit={() => onEditVehicle(v)}
                                onDelete={() => onDeleteVehicle(v.id)}
                                onMarkAvailable={() => onMarkAvailable(v.id!)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};