'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { FaLocationArrow, FaExternalLinkAlt, FaExclamationTriangle, FaWifi } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface LocationData {
    lat: number;
    lng: number;
    address?: string;
    heading?: number;
    speed?: number;
    timestamp?: any;
}

export default function LiveTracking({ driverId }: { driverId: string }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMap = useRef<google.maps.Map | null>(null);
    const driverMarker = useRef<google.maps.Marker | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const retryCountRef = useRef<number>(0);
    const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [driverName, setDriverName] = useState('Nomo Driver');
    const [status, setStatus] = useState('Connecting...');
    const [isOnline, setIsOnline] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Network monitoring
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Network restored');
            setStatus('Reconnecting...');
            if (loadError) {
                window.location.reload();
            }
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
    }, [loadError]);

    // Smooth animation for car movement
    const animateCarMovement = (newPos: { lat: number; lng: number }) => {
        if (!driverMarker.current || !lastPositionRef.current) {
            driverMarker.current?.setPosition(newPos);
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

            driverMarker.current?.setPosition({ lat, lng });

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                lastPositionRef.current = endPos;
                animationFrameRef.current = null;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Retry loading map
    const retryLoadMap = () => {
        setRetrying(true);
        setLoadError(false);
        setStatus('Retrying...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    // Initialize Google Maps using the new functional API
    const initMap = async () => {
        if (!mapRef.current) return;

        try {
            // Load the Google Maps API using the new functional approach
            const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
            const { Marker } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

            // Initialize Map with Nomo Luxury Dark Theme
            googleMap.current = new Map(mapRef.current, {
                center: { lat: 6.5244, lng: 3.3792 },
                zoom: 16,
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
            });

            setMapLoaded(true);
            setStatus('Waiting for driver...');
            setLoadError(false);
        } catch (error) {
            console.error("Map Load Error:", error);
            setLoadError(true);
            setStatus("Map Failed to Load");
            toast.error("Unable to load map. Please check your connection.");
        }
    };

    // Load Google Maps API script
    useEffect(() => {
        if (!isOnline) return;

        const loadGoogleMaps = () => {
            // Check if API is already loaded
            if (window.google && window.google.maps) {
                initMap();
                return;
            }

            // Create script element to load Google Maps
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,maps,marker&v=weekly`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                initMap();
            };
            script.onerror = () => {
                setLoadError(true);
                setStatus("Map Failed to Load");
                toast.error("Unable to load map. Please check your connection.");
            };
            document.head.appendChild(script);
        };

        loadGoogleMaps();
    }, [isOnline]);

    // Firebase listener for driver location
    useEffect(() => {
        if (!driverId || !mapLoaded || !googleMap.current) return;

        let unsub: (() => void) | undefined;
        let timeoutId: NodeJS.Timeout;

        const driverRef = doc(db, "users", driverId);
        unsub = onSnapshot(driverRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const loc = data.location;

                const firstName = data.firstName || '';
                const lastName = data.lastName || '';
                setDriverName(`${firstName} ${lastName}`.trim() || 'Nomo Driver');

                if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                    const newPos = { lat: loc.lat, lng: loc.lng };
                    setLocationData(loc);

                    if (!driverMarker.current && googleMap.current) {
                        // Create marker using the new Marker API
                        const { Marker } = google.maps.importLibrary("marker") as any;
                        driverMarker.current = new Marker({
                            position: newPos,
                            map: googleMap.current,
                            title: `${driverName} - Driver Location`,
                            icon: {
                                url: "/car-icon.png",
                                scaledSize: new google.maps.Size(50, 50),
                                anchor: new google.maps.Point(25, 25),
                                ...(loc.heading && { rotation: loc.heading }),
                            },
                            optimized: true,
                        });
                        lastPositionRef.current = newPos;
                    } else if (driverMarker.current) {
                        animateCarMovement(newPos);

                        if (loc.heading) {
                            driverMarker.current.setIcon({
                                url: "/car-icon.png",
                                scaledSize: new google.maps.Size(50, 50),
                                anchor: new google.maps.Point(25, 25),
                                rotation: loc.heading,
                            });
                        }
                    }

                    if (googleMap.current) {
                        googleMap.current.panTo(newPos);
                    }

                    setStatus("Live Tracking Active");
                    retryCountRef.current = 0;
                } else {
                    setStatus("Waiting for GPS signal...");
                }
            } else {
                setStatus("Driver not found");
            }
        }, (error) => {
            console.error("Firestore error:", error);
            setStatus("Connection error");
            toast.error("Lost connection to tracking service");
        });

        timeoutId = setTimeout(() => {
            if (!locationData) {
                setStatus("Waiting for driver to share location");
            }
        }, 10000);

        return () => {
            if (unsub) unsub();
            if (timeoutId) clearTimeout(timeoutId);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (driverMarker.current) {
                driverMarker.current.setMap(null);
            }
        };
    }, [driverId, mapLoaded, driverName, locationData]);

    // External Navigation Links
    const googleMapsLink = locationData
        ? `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`
        : "#";

    const wazeLink = locationData
        ? `https://www.waze.com/ul?ll=${locationData.lat},${locationData.lng}&navigate=yes`
        : "#";

    return (
        <div className="py-4 md:py-10 relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0a] group">
            {/* The Map Canvas */}
            <div ref={mapRef} className="w-full h-[450px] md:h-[550px]" />

            {/* Loading Overlay */}
            {!mapLoaded && !loadError && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white text-xs font-black uppercase tracking-widest">Loading Map...</p>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {loadError && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-center max-w-sm mx-auto p-6">
                        <FaExclamationTriangle className="text-amber-500 text-4xl mx-auto mb-4" />
                        <h3 className="text-white font-bold mb-2">Map Failed to Load</h3>
                        <p className="text-slate-400 text-xs mb-4">
                            Please check your internet connection and try again.
                        </p>
                        <button
                            onClick={retryLoadMap}
                            disabled={retrying}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            {retrying ? 'Retrying...' : 'Retry'}
                        </button>
                    </div>
                </div>
            )}

            {/* Top Status Bar */}
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

            {/* Bottom Info Panel */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <FaLocationArrow className="text-blue-500 text-xl animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base leading-none mb-1">{driverName}</h3>
                            <p className="text-slate-400 text-xs truncate max-w-[200px] md:max-w-xs">
                                {locationData?.address || "Fetching current position..."}
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

            {/* No Location Fallback */}
            {!locationData && !loadError && mapLoaded && (
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

// THE LUXURY DARK STYLE
const luxuryDarkStyle: google.maps.MapTypeStyle[] = [
    { "elementType": "geometry", "stylers": [{ "color": "#0a0a0a" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#747474" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative.land_parcel", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1a1a1a" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#2a2a2a" }] },
    { "featureType": "road", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#2a2a2a" }] }
];