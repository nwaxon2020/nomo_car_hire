"use client";

import React, { useState, useEffect } from 'react';
import { Navigation, Search, MapPin, Clock, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import RegistrationForm from '@/components/transportHub/RegistrationForm';
import CompanyDashboard from '@/components/transportHub/CompanyDashboard';
import LoadingRound from '@/components/re-useable-loading';

import { Timestamp } from "firebase/firestore";

interface TransportListing {
    id: string;
    from: string;
    to: string;
    amount: number;
    company: string;
    companyId: string; // Added companyId to listings
    time: string;
    discount: string;
    type: 'scraped' | 'registered';
    website?: string;
}

interface TransportCompany {
    id: string;
    companyName: string;
    ownerId: string;
    status: string;
    expiryDate: Timestamp; // Added expiryDate
}

const TransportHubUi = () => {
    const listingsRef = React.useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'hub' | 'dashboard'>('hub');
    const [listings, setListings] = useState<TransportListing[]>([]);
    const [scrapedListings, setScrapedListings] = useState<TransportListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCompany, setUserCompany] = useState<TransportCompany | null>(null);
    const [showRegistration, setShowRegistration] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Filters
    const [searchFrom, setSearchFrom] = useState("");
    const [searchTo, setSearchTo] = useState("");
    const [hiddenCompanies, setHiddenCompanies] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Fetch statuses of all companies to filter listings
        const fetchCompanyStatuses = async () => {
            const snap = await getDocs(collection(db, "transportCompanies"));
            const hidden = new Set<string>();
            const now = new Date();
            snap.docs.forEach(doc => {
                const data = doc.data();
                const isExpired = data.expiryDate && data.expiryDate.toDate() < now;
                const isNotApproved = data.status !== "approved";

                if (isExpired || isNotApproved) {
                    hidden.add(doc.id);
                }
            });
            setHiddenCompanies(hidden);
        };
        fetchCompanyStatuses();

        // 1. Fetch user's company status
        const unsubUser = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await getDocs(query(collection(db, "transportCompanies"), where("ownerId", "==", user.uid)));
                if (!userDoc.empty) {
                    setUserCompany({ ...userDoc.docs[0].data(), id: userDoc.docs[0].id } as TransportCompany);
                    setView('dashboard');
                }
            } else {
                setUserCompany(null);
            }
        });

        // 2. Fetch Scraped Listings (from public API or local JSON if reachable)
        // For now, I'll fetch them from a static JSON or mock them if JSON fetching fails
        const fetchScraped = async () => {
            try {
                // In a real environment, we'd fetch from an API route that reads the JSON
                const res = await fetch('/api/transport-scraped');
                if (res.ok) {
                    const data = await res.json();
                    const adjustedListings = (data.listings || []).map((item: TransportListing) => ({
                        ...item,
                        amount: (Number(item.amount) || 0) + 45000
                    }));
                    setScrapedListings(adjustedListings);
                    setLastUpdated(data.last_updated || null);
                } else {
                    // Mock data if API is not yet ready
                    setScrapedListings([
                        { id: "s1", from: "Lagos", to: "Abuja", amount: 25000 + 45000, company: "Peace Mass Transit", companyId: "pmt", time: "06:30 AM", discount: "5%", type: "scraped", website: "https://pmt.ng" },
                        { id: "s2", from: "Lagos", to: "Benin", amount: 15000 + 45000, company: "GIGM", companyId: "gigm", time: "06:00 AM", discount: "10%", type: "scraped", website: "https://gigm.com" },
                        { id: "s3", from: "Lagos", to: "Onitsha", amount: 22000 + 45000, company: "GUO Motors", companyId: "guo", time: "07:30 AM", discount: "5%", type: "scraped", website: "https://guotransport.com" },
                    ]);
                }
            } catch (err) {
                console.error("Failed to fetch scraped data:", err);
            }
        };
        fetchScraped();

        // 3. Fetch Registered Listings (Real-time)
        const unsubListings = onSnapshot(collection(db, "transportListings"), (snap) => {
            const data = snap.docs.map(d => {
                const docData = d.data();
                return {
                    ...docData,
                    id: d.id,
                    type: 'registered',
                    company: docData.company || docData.companyName // Map companyName to company for UI consistency
                } as TransportListing;
            });
            setListings(data);
            setLoading(false);
        });

        return () => {
            unsubUser();
            unsubListings();
        };
    }, []);

    const allListings = [...listings, ...scrapedListings]
        .sort((a, b) => {
            if (a.type === 'registered' && b.type === 'scraped') return -1;
            if (a.type === 'scraped' && b.type === 'registered') return 1;
            return 0;
        })
        .filter(item => {
            // Filter out registered listings from expired or unapproved companies
            if (item.type === 'registered' && item.companyId && hiddenCompanies.has(item.companyId)) {
                return false;
            }

            const fromMatch = item.from.toLowerCase().includes(searchFrom.toLowerCase());
            const toMatch = item.to.toLowerCase().includes(searchTo.toLowerCase());
            return fromMatch && toMatch;
        });

    if (view === 'dashboard' && userCompany) {
        return <CompanyDashboard companyId={userCompany.id} onBack={() => setView('hub')} />;
    }

    return (
        <div className="min-h-screen bg-[#040b18] text-white">
            {/* Hero Section */}
            <div className="relative pt-5 md:pt-10 pb-8 px-4 md:px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />

                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <h1 className="text-2xl md:text-4xl font-black mb-6 tracking-tight">
                        Compare & Book <br />
                        <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Nigerian Transport</span>
                    </h1>

                    <p className="text-slate-400 md:text-lg max-w-2xl mx-auto mb-5">
                        Find the best travel deals from top companies across the country.
                        Real-time prices, verified listings, and direct booking links.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-xl md:rounded-full flex flex-col md:flex-row gap-2 shadow-2xl">
                        <div className="flex-1 relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                            <input
                                type="text"
                                placeholder="From City..."
                                value={searchFrom}
                                onChange={(e) => setSearchFrom(e.target.value)}
                                className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-white focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div className="hidden md:block w-[1px] h-8 bg-white/10 self-center" />
                        <div className="flex-1 relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                            <input
                                type="text"
                                placeholder="To City..."
                                value={searchTo}
                                onChange={(e) => setSearchTo(e.target.value)}
                                className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-white focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <button
                            onClick={() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-xl md:rounded-full font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Search size={10} /> Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div ref={listingsRef} className="max-w-6xl mx-auto px-6 pt-5 md:pt-8 md:px-10 pb-30">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-white">Popular Routes</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                            <p className="text-slate-500 text-sm">Showing {allListings.length} available travel options.</p>
                            {lastUpdated && (
                                <span className="hidden sm:block text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                                    Last Updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {userCompany ? (
                            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                                <button
                                    onClick={() => setView('hub')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'hub' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Transport Hub
                                </button>
                                <button
                                    onClick={() => setView('dashboard')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    My Company
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowRegistration(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-emerald-400"
                            >
                                <Plus size={16} /> Register Your Company
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingRound /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {allListings.map((item, idx) => (
                                <ListingCard key={item.id || idx} item={item} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {allListings.length === 0 && !loading && (
                    <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10">
                        <Navigation className="mx-auto text-slate-700 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Routes Found</h3>
                        <p className="text-slate-500">Try searching for different cities or check back later.</p>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {showRegistration && (
                <RegistrationForm
                    onClose={() => setShowRegistration(false)}
                    onSuccess={() => {
                        setShowRegistration(false);
                        window.location.reload(); // Quick refresh to update company state
                    }}
                />
            )}
        </div>
    );
};

const handleTrackVisit = async (companyId: string) => {
    const user = auth.currentUser;
    if (!user || !companyId || companyId === 'scraped') return;

    const now = new Date();
    const monthId = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const visitorRecordId = `${monthId}_${user.uid}`;

    const recordRef = doc(db, "transportCompanies", companyId, "visitors", visitorRecordId);

    try {
        const recordSnap = await getDoc(recordRef);
        if (!recordSnap.exists()) {
            // First time this month
            await setDoc(recordRef, {
                userId: user.uid,
                timestamp: serverTimestamp(),
                month: monthId
            });

            // Increment visitor count on company doc
            const companyRef = doc(db, "transportCompanies", companyId);
            await setDoc(companyRef, { visitorCount: increment(1) }, { merge: true });
        }
    } catch (err) {
        console.error("Error tracking visit:", err);
    }
};

const ListingCard = ({ item }: { item: TransportListing }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-4">
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${item.type === 'scraped' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {item.type === 'scraped' ? 'Scraped' : 'Verified'}
                </span>
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                        {item.company?.charAt(0) || '?'}
                    </div>
                    <h3 className="font-bold text-slate-200">{item.company}</h3>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-white">{item.from}</p>
                    <ArrowRight size={16} className="text-slate-600" />
                    <p className="text-lg font-black text-white">{item.to}</p>
                </div>
            </div>

            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Clock size={12} /> {item.time}
                    </div>
                    <p className="text-2xl font-black text-white">₦{item.amount.toLocaleString()}</p>
                    {item.discount !== "0%" && (
                        <p className="text-xs text-amber-500 font-bold">Promo: {item.discount} Off</p>
                    )}
                </div>

                <a
                    href={item.website || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => item.type === 'registered' && handleTrackVisit(item.companyId)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20"
                >
                    Book Now <ExternalLink size={12} />
                </a>
            </div>
        </motion.div>
    );
};

export default TransportHubUi;
