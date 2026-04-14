'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { FaLocationArrow, FaExternalLinkAlt } from 'react-icons/fa';

export default function LiveTracking({ driverId }: { driverId: string }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMap = useRef<google.maps.Map | null>(null);
    const driverMarker = useRef<google.maps.Marker | null>(null);

    const [locationData, setLocationData] = useState<any>(null);
    const [driverName, setDriverName] = useState('Nomo Driver');
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        const loader: any = new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
            version: "weekly",
        });

        loader.load().then(() => {
            if (!mapRef.current) return;

            // 1. Initialize Map with Nomo Luxury Dark Theme
            googleMap.current = new google.maps.Map(mapRef.current, {
                center: { lat: 6.5244, lng: 3.3792 }, // Defaults to Lagos
                zoom: 16,
                styles: luxuryDarkStyle,
                disableDefaultUI: true,
                zoomControl: false,
            });

            // 2. Listen to Firebase for real-time movement
            const unsub = onSnapshot(doc(db, "users", driverId), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const loc = data.location;

                    setDriverName(`${data.firstName} ${data.lastName}` || 'Nomo Driver');

                    if (loc && loc.lat && loc.lng) {
                        const newPos = { lat: loc.lat, lng: loc.lng };
                        setLocationData(loc);

                        if (!driverMarker.current) {
                            // 3. Create the Car Marker
                            driverMarker.current = new google.maps.Marker({
                                position: newPos,
                                map: googleMap.current,
                                title: "Driver Location",
                                icon: {
                                    url: "/car-icon.png", // Ensure this exists in /public
                                    scaledSize: new google.maps.Size(45, 45),
                                    anchor: new google.maps.Point(22, 22),
                                }
                            });
                        } else {
                            // 4. Smoothly move the car
                            driverMarker.current.setPosition(newPos);
                        }

                        // 5. Follow the car
                        googleMap.current?.panTo(newPos);
                        setStatus("Live Tracking Active");
                    }
                }
            });

            return () => unsub();
        }).catch((e: Error) => {
            console.error("Map Error:", e);
            setStatus("Offline");
        });
    }, [driverId]);

    // External Navigation Link
    const googleMapsLink = locationData
        ? `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`
        : "#";

    return (
        <div className="py-4 md:py-10 relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0a] group">

            {/* The Map Canvas */}
            <div ref={mapRef} className="w-full h-[450px] md:h-[550px]" />

            {/* Top Status Bar */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-emerald-500/30 flex items-center gap-3 pointer-events-auto">
                    <div className="relative">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute" />
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">{status}</span>
                </div>
            </div>

            {/* Bottom Info Panel (Merged from SimpleMap UI) */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <FaLocationArrow className="text-blue-500 text-xl animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base leading-none mb-1">{driverName}</h3>
                            <p className="text-slate-400 text-xs truncate max-w-[200px] md:max-w-xs italic">
                                {locationData?.address || "Fetching current position..."}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={googleMapsLink}
                            target="_blank"
                            className="flex-1 md:flex-none px-5 py-3 bg-white hover:bg-blue-600 hover:text-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            Open Maps <FaExternalLinkAlt />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// THE LUXURY DARK STYLE
const luxuryDarkStyle: google.maps.MapTypeStyle[] = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#0a0a0a" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#747474" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "poi",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#1a1a1a" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "transit",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#000000" }]
    }
];