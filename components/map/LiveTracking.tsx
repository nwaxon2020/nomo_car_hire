'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { FaLocationArrow, FaExternalLinkAlt, FaWifi } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

interface LocationData {
    lat: number;
    lng: number;
    address?: string;
    heading?: number;
    speed?: number;
    timestamp?: any;
}

// ─── Luxury Dark Theme ────────────────────────────────────────────────────────
const luxuryDarkStyle: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#747474' }] },
    { elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a2a' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a2a2a' }] },
];

const defaultCenter = { lat: 6.5244, lng: 3.3792 }; // Lagos

// Shared libraries array (defined outside component to avoid re-renders)
const LIBRARIES: ('places' | 'geometry')[] = ['places'];

export default function LiveTracking({ driverId }: { driverId: string }) {
    const googleMap = useRef<google.maps.Map | null>(null);
    const driverMarkerRef = useRef<google.maps.Marker | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [driverName, setDriverName] = useState('Nomo Driver');
    const [status, setStatus] = useState('Connecting...');
    const [isOnline, setIsOnline] = useState(true);
    const [showFallback, setShowFallback] = useState(false);
    const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Load Google Maps API via useJsApiLoader (fixes Bug A & B) ────────────
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    });

    // ─── Fallback: if Google Maps errors or takes > 15s, show OSM ────────────
    useEffect(() => {
        if (loadError) {
            setShowFallback(true);
            setStatus('Backup Map Active');
            return;
        }

        // Safety timeout: show OSM fallback if Maps takes too long on slow connections
        fallbackTimerRef.current = setTimeout(() => {
            if (!isLoaded) {
                setShowFallback(true);
                setStatus('Backup Map Active');
            }
        }, 15000);

        return () => {
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        };
    }, [loadError, isLoaded]);

    // ─── Clear fallback once Maps loads successfully ──────────────────────────
    useEffect(() => {
        if (isLoaded && !loadError) {
            setShowFallback(false);
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        }
    }, [isLoaded, loadError]);

    // ─── Network monitoring ────────────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Network restored');
            setStatus('Reconnecting...');
        };
        const handleOffline = () => {
            setIsOnline(false);
            setStatus('No Internet');
            toast.error('Network connection lost');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ─── Smooth animation for car movement ────────────────────────────────────
    const animateCarMovement = (newPos: { lat: number; lng: number }) => {
        if (!driverMarkerRef.current || !lastPositionRef.current) {
            driverMarkerRef.current?.setPosition(newPos);
            lastPositionRef.current = newPos;
            return;
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const startPos = lastPositionRef.current;
        const endPos = newPos;
        const startTime = performance.now();
        const duration = 1000;

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            const lat = startPos.lat + (endPos.lat - startPos.lat) * easeProgress;
            const lng = startPos.lng + (endPos.lng - startPos.lng) * easeProgress;

            driverMarkerRef.current?.setPosition({ lat, lng });

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                lastPositionRef.current = endPos;
                animationFrameRef.current = null;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // ─── Firebase listener for driver location ────────────────────────────────
    useEffect(() => {
        if (!driverId) return;

        let unsub: (() => void) | undefined;

        const driverRef = doc(db, 'users', driverId);
        unsub = onSnapshot(
            driverRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const loc = data.location;

                    const firstName = data.firstName || '';
                    const lastName = data.lastName || '';
                    setDriverName(`${firstName} ${lastName}`.trim() || 'Nomo Driver');

                    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                        const newPos = { lat: loc.lat, lng: loc.lng };
                        setLocationData(loc);

                        // Update marker position (smooth animation)
                        if (driverMarkerRef.current) {
                            animateCarMovement(newPos);

                            // Update heading icon if available
                            if (loc.heading) {
                                driverMarkerRef.current.setIcon({
                                    url: '/car-icon.svg',
                                    scaledSize: new google.maps.Size(50, 50),
                                    anchor: new google.maps.Point(25, 25),
                                });
                            }
                        }

                        // Pan map to new position
                        if (googleMap.current) {
                            googleMap.current.panTo(newPos);
                        }

                        setStatus('Live Tracking Active');
                    } else {
                        setStatus('Waiting for GPS signal...');
                    }
                } else {
                    setStatus('Driver not found');
                }
            },
            (error) => {
                console.error('Firestore error:', error);
                setStatus('Connection error');
                toast.error('Lost connection to tracking service');
            }
        );

        const timeoutId = setTimeout(() => {
            if (!locationData) {
                setStatus('Waiting for driver to share location');
            }
        }, 10000);

        return () => {
            if (unsub) unsub();
            clearTimeout(timeoutId);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (driverMarkerRef.current) driverMarkerRef.current.setMap(null);
        };
    }, [driverId]);

    // ─── External navigation links ─────────────────────────────────────────────
    const googleMapsLink = locationData
        ? `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`
        : '#';
    const wazeLink = locationData
        ? `https://www.waze.com/ul?ll=${locationData.lat},${locationData.lng}&navigate=yes`
        : '#';

    // ─── OpenStreetMap fallback bbox ──────────────────────────────────────────
    const osmSrc = locationData
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${locationData.lng - 0.02}%2C${locationData.lat - 0.02}%2C${locationData.lng + 0.02}%2C${locationData.lat + 0.02}&layer=mapnik&marker=${locationData.lat}%2C${locationData.lng}`
        : `https://www.openstreetmap.org/export/embed.html?bbox=3.3592%2C6.5044%2C3.3992%2C6.5444&layer=mapnik`;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="py-4 md:py-10 relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0a] group">

            {/* ─── Map Canvas ─────────────────────────────────────────────── */}
            {showFallback ? (
                /* OpenStreetMap fallback */
                <div className="relative w-full h-[450px] md:h-[550px] bg-slate-800 overflow-hidden">
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={osmSrc}
                        title="Backup Map"
                    />
                    <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-black text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg z-10">
                        Backup Map Active — Google Maps unavailable
                    </div>
                </div>
            ) : !isLoaded ? (
                /* Loading state */
                <div className="w-full h-[450px] md:h-[550px] bg-slate-900 flex flex-col items-center justify-center text-white">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">Initializing Live Tracking...</p>
                </div>
            ) : (
                /* Google Maps */
                <div className="w-full h-[450px] md:h-[550px]">
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={locationData ? { lat: locationData.lat, lng: locationData.lng } : defaultCenter}
                        zoom={16}
                        options={{
                            styles: luxuryDarkStyle,
                            disableDefaultUI: true,
                            zoomControl: true,
                            zoomControlOptions: {
                                position: google.maps.ControlPosition.RIGHT_BOTTOM,
                            },
                            mapTypeControl: false,
                            fullscreenControl: true,
                            fullscreenControlOptions: {
                                position: google.maps.ControlPosition.RIGHT_BOTTOM,
                            },
                        }}
                        onLoad={(map) => {
                            googleMap.current = map;
                        }}
                        onUnmount={() => {
                            googleMap.current = null;
                        }}
                    >
                        {locationData && (
                            <Marker
                                position={{ lat: locationData.lat, lng: locationData.lng }}
                                title={`${driverName} — Driver Location`}
                                icon={{
                                    url: '/car-icon.svg',
                                    scaledSize: new google.maps.Size(50, 50),
                                    anchor: new google.maps.Point(25, 25),
                                }}
                                onLoad={(marker) => {
                                    // Store ref for smooth animation
                                    driverMarkerRef.current = marker;
                                    lastPositionRef.current = { lat: locationData.lat, lng: locationData.lng };
                                }}
                                onUnmount={() => {
                                    driverMarkerRef.current = null;
                                }}
                            />
                        )}
                    </GoogleMap>
                </div>
            )}

            {/* ─── Top Status Bar ─────────────────────────────────────────── */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-20">
                <div className="bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-emerald-500/30 flex items-center gap-3 pointer-events-auto">
                    <div className="relative">
                        <div className={`w-2.5 h-2.5 rounded-full absolute ${status === 'Live Tracking Active' ? 'bg-emerald-500 animate-ping' : ''}`} />
                        <div className={`w-2.5 h-2.5 rounded-full relative ${status === 'Live Tracking Active' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">{status}</span>
                </div>

                {!isOnline && (
                    <div className="bg-red-500/80 backdrop-blur-xl px-3 py-1 rounded-xl flex items-center gap-2 pointer-events-auto">
                        <FaWifi className="text-white text-xs" />
                        <span className="text-[8px] font-black text-white uppercase">Offline</span>
                    </div>
                )}
            </div>

            {/* ─── Bottom Info Panel ───────────────────────────────────────── */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <FaLocationArrow className="text-blue-500 text-xl animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base leading-none mb-1">{driverName}</h3>
                            <p className="text-slate-400 text-xs truncate max-w-[200px] md:max-w-xs">
                                {locationData?.address || 'Fetching current position...'}
                            </p>
                            {locationData?.speed !== undefined && (
                                <p className="text-emerald-400 text-[8px] font-black uppercase mt-1">
                                    Speed: {Math.round((locationData.speed || 0) * 3.6)} km/h
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 md:flex-none px-5 py-3 bg-white hover:bg-blue-600 hover:text-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            Google Maps <FaExternalLinkAlt size={10} />
                        </a>
                        <a
                            href={wazeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 md:flex-none px-5 py-3 bg-[#33ccff] hover:bg-[#2bb0d9] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            Waze <FaExternalLinkAlt size={10} />
                        </a>
                    </div>
                </div>
            </div>

            {/* ─── Waiting for Driver Overlay ──────────────────────────────── */}
            {!locationData && isLoaded && !showFallback && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                    <div className="text-center p-6 bg-slate-900/90 rounded-2xl border border-white/10 max-w-sm">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                            <FaLocationArrow className="text-amber-500 text-2xl" />
                        </div>
                        <h3 className="text-white font-bold mb-2">Waiting for Driver</h3>
                        <p className="text-slate-400 text-xs">
                            The driver hasn't shared their location yet. You'll see real-time movement once they start driving.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}