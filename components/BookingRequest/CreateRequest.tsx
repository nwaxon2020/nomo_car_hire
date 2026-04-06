"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface CreateRequestProps {
    userId?: string;
    userCity?: string;
    userRequestCount?: number;
}

export default function CreateRequest({ userId, userCity, userRequestCount = 0 }: CreateRequestProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [actualRequestCount, setActualRequestCount] = useState(userRequestCount);
    const [vipLevel, setVipLevel] = useState(0);

    const [formData, setFormData] = useState({
        carType: "",
        dates: ["", ""],
        budget: "", // Kept as string to handle formatted input
        location: userCity || "",
        destination: "",
        passengers: "1-4",
        tripType: "Quick Drop",
        description: "",
        negotiable: true,
        urgent: false,
        isSameCity: true,
    });

    useEffect(() => {
        const fetchUserDataAndRequests = async () => {
            if (userId) {
                try {
                    const userDoc = await getDoc(doc(db, "users", userId));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setVipLevel(data.vipLevel || 0);
                    }

                    const requestsRef = collection(db, "bookingRequests");
                    const q = query(
                        requestsRef,
                        where("userId", "==", userId),
                        where("status", "==", "active")
                    );
                    const snapshot = await getDocs(q);
                    setActualRequestCount(snapshot.size);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        };

        fetchUserDataAndRequests();
    }, [userId]);

    const carTypes = [
        "Sedan (Toyota Corolla, Honda Civic)",
        "Bus",
        "SUV (Toyota RAV4, Honda CR-V)",
        "Minivan (Toyota Sienna, Honda Odyssey)",
        "Keke Napep",
        "Luxury (Mercedes, BMW)",
        "Pickup Truck",
        "Any available car"
    ];

    const tripTypes = [
        { value: "Quick Drop", label: "Quick Drop Within City" },
        { value: "Airport", label: "Airport Pickup/Drop-off" },
        { value: "Wedding/Event", label: "Wedding/Event" },
        { value: "Monthly", label: "Monthly Rental" },
        { value: "Tourism", label: "Tourism/Sightseeing" },
        { value: "Custom", label: "Custom Trip" }
    ];

    const passengerOptions = ["1-4", "5-7", "8-10", "10+"];

    const handleChange = (field: string, value: any) => {
        if (field === "budget") {
            // Remove all non-digits
            const rawValue = value.replace(/\D/g, "");
            // Format with commas
            const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            setFormData(prev => ({ ...prev, [field]: formattedValue }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const getMaxBookings = (level: number) => {
        if (level >= 5) return 10;
        if (level === 4) return 6;
        if (level === 3) return 4;
        if (level === 2) return 3;
        if (level === 1) return 2;
        return 1;
    };

    const maxLimit = getMaxBookings(vipLevel);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (actualRequestCount >= maxLimit) {
            alert(`Limit Reached: VIP Level ${vipLevel} allows ${maxLimit} active requests.`);
            return;
        }

        if (!auth.currentUser) return router.push("/login");

        setLoading(true);
        try {
            const requestData = {
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || "User",
                userEmail: auth.currentUser.email,
                userCity: userCity || "",
                carType: formData.carType,
                startDate: formData.dates[0],
                endDate: formData.dates[1],
                // Clean the budget string back to a number before saving
                budget: Number(formData.budget.replace(/,/g, "")),
                location: formData.location,
                destination: formData.isSameCity ? formData.location : formData.destination,
                passengers: formData.passengers,
                tripType: formData.tripType,
                description: formData.description,
                negotiable: formData.negotiable,
                urgent: formData.urgent,
                isSameCity: formData.isSameCity,
                status: "active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, "bookingRequests"), requestData);

            setSuccess(true);
            setLoading(false);
            setActualRequestCount(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(false), 5000);
        } catch (error) {
            console.error("Error:", error);
            setLoading(false);
        }
    };

    const isSubmitDisabled = actualRequestCount >= maxLimit || loading;

    if (success) {
        return (
            <div className="max-w-5xl mx-auto text-center mt-12 mb-10 py-12 px-6 bg-gray-900 rounded-xl shadow-2xl border border-green-500/30 animate-fadeIn">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl animate-bounce">✅</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Request Posted Successfully!</h3>
                <p className="text-gray-400 mb-6 text-lg">
                    Drivers in <span className="text-blue-400 font-bold">{formData.location}</span> have been notified.
                </p>
                <button
                    onClick={() => setSuccess(false)}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all"
                >
                    Create Another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto m-2 space-y-6 bg-gray-900 p-3 py-5 md:p-6 rounded shadow-2xl border border-gray-700 animate-fadeIn">

            {/* VIP Info Bar */}
            <div className="p-4 bg-gray-800/80 border border-blue-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Your Status</p>
                        <h4 className="text-white font-black text-lg">
                            VIP Level {vipLevel} <span className="text-blue-400 ml-2">({actualRequestCount}/{maxLimit} Used)</span>
                        </h4>
                    </div>
                    {vipLevel < 5 && (
                        <button
                            type="button"
                            onClick={() => router.push('/purchase')}
                            className="px-4 py-2 bg-amber-500 text-black text-xs font-black rounded-lg hover:bg-amber-400 transition-all"
                        >
                            UPGRADE
                        </button>
                    )}
                </div>

                {/* Exhausted Limit Warning - Lightened Orange, Semi-bold, No Margin */}
                {actualRequestCount >= maxLimit && (
                    <p className="text-[10px] text-orange-400 font-semibold leading-tight">
                        Limit exhausted. Upgrade or delete active requests to create new ones.
                    </p>
                )}
            </div>

            <h2 className="md:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-blue-500">🚗</span> Post a Car Request
            </h2>

            {/* Car Type */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">What kind of car do you need?</label>
                <select
                    value={formData.carType}
                    onChange={(e) => handleChange("carType", e.target.value)}
                    required
                    disabled={isSubmitDisabled}
                    className="w-full p-4 border rounded-xl bg-gray-800 text-white border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                    <option value="">Select car type...</option>
                    {carTypes.map((type, idx) => (
                        <option key={idx} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Start Date", "End Date"].map((label, i) => (
                    <div key={i}>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
                        <input
                            type="date"
                            value={formData.dates[i]}
                            onChange={(e) => {
                                const newDates = [...formData.dates];
                                newDates[i] = e.target.value;
                                handleChange("dates", newDates);
                            }}
                            required
                            disabled={isSubmitDisabled}
                            className="w-full p-4 border rounded-xl bg-gray-800 text-white border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                ))}
            </div>

            {/* Budget & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Budget (₦)</label>
                    <input
                        type="text"
                        value={formData.budget}
                        onChange={(e) => handleChange("budget", e.target.value)}
                        required
                        disabled={isSubmitDisabled}
                        placeholder="Amount in Naira"
                        className="w-full p-4 border rounded-xl bg-gray-800 text-white border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Current Location</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        required
                        disabled={isSubmitDisabled}
                        placeholder="City and Area"
                        className="w-full p-4 border rounded-xl bg-gray-800 text-white border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Same City Logic */}
            <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700">
                <p className="text-sm text-gray-300 mb-4">Is the destination in the same city?</p>
                <div className="flex gap-6 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-white">
                        <input
                            type="radio"
                            checked={formData.isSameCity}
                            onChange={() => handleChange("isSameCity", true)}
                            className="w-5 h-5 accent-blue-500"
                        />
                        <div className="flex flex-col">
                            <span>Yes</span>
                            <span className="text-[10px] text-gray-500">Within {formData.location || "this city"}</span>
                        </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-white">
                        <input
                            type="radio"
                            checked={!formData.isSameCity}
                            onChange={() => handleChange("isSameCity", false)}
                            className="w-5 h-5 accent-blue-500"
                        />
                        <div className="flex flex-col">
                            <span>No</span>
                            <span className="text-[10px] text-gray-500">Going to different city</span>
                        </div>
                    </label>
                </div>
                {!formData.isSameCity && (
                    <div className="mt-4 animate-fadeIn">
                        <input
                            type="text"
                            placeholder="Destination City/State"
                            value={formData.destination}
                            onChange={(e) => handleChange("destination", e.target.value)}
                            required={!formData.isSameCity}
                            className="w-full p-4 border rounded-xl bg-gray-800 text-white border-blue-500/50 outline-none"
                        />
                    </div>
                )}
            </div>

            {/* URGENT TOGGLE */}
            <div className="flex items-center justify-between p-4 bg-red-950/20 border border-red-900/30 rounded-xl">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <p className="text-white font-bold text-sm">Urgent Request</p>
                        <p className="text-xs text-gray-400">Makes your request stand out to drivers</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.urgent}
                        onChange={(e) => handleChange("urgent", e.target.checked)}
                    />
                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                </label>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-4 font-black rounded-xl transition-all shadow-xl ${isSubmitDisabled
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.01] active:scale-[0.98]'
                    }`}
            >
                {loading ? "PROCESSING..." : actualRequestCount >= maxLimit ? "LIMIT REACHED" : "POST REQUEST"}
            </button>
        </form>
    );
}