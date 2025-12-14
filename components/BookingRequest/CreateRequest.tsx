"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
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

    const [formData, setFormData] = useState({
        carType: "",
        dates: ["", ""],
        budget: "",
        location: userCity || "",
        destination: "", // Add destination field
        passengers: "1-4",
        tripType: "Quick Drop",
        description: "",
        negotiable: true,
        urgent: false,
        isSameCity: true, // Add same city radio button
    });

    // Fetch actual request count on component mount
    useEffect(() => {
        const fetchUserRequestCount = async () => {
            if (userId) {
                try {
                    const requestsRef = collection(db, "bookingRequests");
                    const q = query(
                        requestsRef,
                        where("userId", "==", userId),
                        where("status", "==", "active")
                    );
                    const snapshot = await getDocs(q);
                    setActualRequestCount(snapshot.size);
                } catch (error) {
                    console.error("Error fetching user request count:", error);
                }
            }
        };
        
        fetchUserRequestCount();
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
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check request limit before submitting
        if (actualRequestCount >= 3) {
            alert(`You have reached the maximum of 3 active requests. Please delete one of your existing requests before creating a new one.`);
            return;
        }
        
        if (!auth.currentUser) return router.push("/login");

        setLoading(true);
        try {
            const requestData = {
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || "User",
                userEmail: auth.currentUser.email,
                userPhone: "",
                userCity: userCity || "",
                carType: formData.carType,
                startDate: formData.dates[0],
                endDate: formData.dates[1],
                budget: formData.budget,
                location: formData.location,
                destination: formData.isSameCity ? formData.location : formData.destination, // Include destination if different
                passengers: formData.passengers,
                tripType: formData.tripType,
                description: formData.description,
                negotiable: formData.negotiable,
                urgent: formData.urgent,
                isSameCity: formData.isSameCity, // Add to request data
                status: "active",
                offers: [],
                views: 0,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, "bookingRequests"), requestData);
            
            setSuccess(true);
            setLoading(false);
            
            // Update the request count
            setActualRequestCount(prev => prev + 1);
            
            // Reset form
            setFormData({
                carType: "",
                dates: ["", ""],
                budget: "",
                location: userCity || "",
                destination: "",
                passengers: "1-4",
                tripType: "Quick Drop",
                description: "",
                negotiable: true,
                urgent: false,
                isSameCity: true,
            });
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Error creating booking request:", error);
            setLoading(false);
        }
    };

    const isSubmitDisabled = actualRequestCount >= 3 || loading;

    if (success) {
        return (
            <div className="text-center py-10 px-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl shadow-lg border border-green-200 animate-fadeIn">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-3xl animate-bounce">🎉</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Request Posted!</h3>
                <p className="text-gray-600 mb-4">
                Your request is now live. Drivers will start contacting you via WhatsApp.
                </p>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                    💡 <strong>Tip:</strong> Keep your WhatsApp active. Drivers may offer better prices than advertised!
                </p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-3 py-5 md:p-6 rounded-xl shadow-2xl border border-gray-700 animate-fadeIn">
            
            {/* Request Limit Warning */}
            {actualRequestCount >= 3 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/20 border border-red-700 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-800/30 p-2 rounded-lg">
                            <span className="text-red-400 text-xl">⚠️</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-300 mb-1">Maximum Requests Reached</h4>
                            <p className="text-sm text-red-200">
                                You have {actualRequestCount} active requests (maximum is 3). 
                                <br />
                                <span className="text-red-300 font-medium">Delete one of your existing requests to create a new one.</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
            <h2 className="md:text-xl font-bold text-white mb-6">📢 Post a Car Request</h2>
            
            {/* Active Request Counter */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300 text-sm">Active Requests:</span>
                <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${actualRequestCount >= 3 ? 'text-red-400' : 'text-green-400'}`}>
                        {actualRequestCount} / 3
                    </span>
                    <div className="h-2 w-20 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${actualRequestCount >= 3 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((actualRequestCount / 3) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Car Type */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Car Type *</label>
                <select
                value={formData.carType}
                onChange={(e) => handleChange("carType", e.target.value)}
                required
                disabled={isSubmitDisabled}
                className={`w-full p-3 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 ${
                    isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                }`}
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
                    <label className="block text-sm font-medium text-gray-200 mb-2">{label} *</label>
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
                    min={new Date().toISOString().split("T")[0]}
                    className={`w-full p-3 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 ${
                        isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                    }`}
                    />
                </div>
                ))}
            </div>

            {/* Budget & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Budget (₦) *</label>
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">₦</span>
                    <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleChange("budget", e.target.value)}
                    required
                    disabled={isSubmitDisabled}
                    min="1000"
                    placeholder="e.g., 15000"
                    className={`w-full pl-10 p-3 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 ${
                        isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                    }`}
                    />
                </div>
                <div className="flex items-center mt-2">
                    <input
                    type="checkbox"
                    id="negotiable"
                    checked={formData.negotiable}
                    onChange={(e) => handleChange("negotiable", e.target.checked)}
                    disabled={isSubmitDisabled}
                    className={`h-4 w-4 ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : 'text-blue-500'}`}
                    />
                    <label htmlFor="negotiable" className={`ml-2 text-sm ${isSubmitDisabled ? 'text-gray-500' : 'text-gray-300'}`}>
                        Price is negotiable
                    </label>
                </div>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">My Location/City *</label>
                <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    required
                    disabled={isSubmitDisabled}
                    placeholder="e.g., Lagos, Victoria Island"
                    className={`w-full p-3 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 ${
                        isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                    }`}
                />
                </div>
            </div>

            {/* Same City Radio Buttons */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <label className="block text-sm font-medium text-gray-200 mb-3">Is this trip within the same city/town?</label>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center">
                        <input
                            type="radio"
                            id="sameCityYes"
                            name="sameCity"
                            checked={formData.isSameCity}
                            onChange={() => handleChange("isSameCity", true)}
                            disabled={isSubmitDisabled}
                            className={`h-5 w-5 ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : 'text-green-500'}`}
                        />
                        <label 
                            htmlFor="sameCityYes" 
                            className={`ml-2 text-sm ${isSubmitDisabled ? 'text-gray-500' : 'text-gray-300'} cursor-pointer`}
                        >
                            Yes, within {formData.location || "this city/town"}
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="radio"
                            id="sameCityNo"
                            name="sameCity"
                            checked={!formData.isSameCity}
                            onChange={() => handleChange("isSameCity", false)}
                            disabled={isSubmitDisabled}
                            className={`h-5 w-5 ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : 'text-blue-500'}`}
                        />
                        <label 
                            htmlFor="sameCityNo" 
                            className={`ml-2 text-sm ${isSubmitDisabled ? 'text-gray-500' : 'text-gray-300'} cursor-pointer`}
                        >
                            No, going to different city
                        </label>
                    </div>
                </div>
                
                {/* Destination Input (shown only when "No" is selected) */}
                {!formData.isSameCity && (
                    <div className="mt-4 animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Destination City *
                        </label>
                        <input
                            type="text"
                            value={formData.destination}
                            onChange={(e) => handleChange("destination", e.target.value)}
                            required={!formData.isSameCity}
                            disabled={isSubmitDisabled}
                            placeholder="e.g., Abuja, Ibadan, Port Harcourt"
                            className={`w-full p-3 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 ${
                                isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-blue-600 border-2'
                            }`}
                        />
                        <p className="text-xs text-blue-300 mt-1">
                            Enter the city you're traveling to
                        </p>
                    </div>
                )}
            </div>

            {/* Passengers & Trip Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Number of Passengers</label>
                <select
                    value={formData.passengers}
                    onChange={(e) => handleChange("passengers", e.target.value)}
                    disabled={isSubmitDisabled}
                    className={`w-full p-3 border rounded-lg bg-gray-800 text-white ${
                        isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                    }`}
                >
                    {passengerOptions.map(opt => (
                    <option key={opt} value={opt}>{opt} people</option>
                    ))}
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Trip Type</label>
                <select
                    value={formData.tripType}
                    onChange={(e) => handleChange("tripType", e.target.value)}
                    disabled={isSubmitDisabled}
                    className={`w-full p-3 border rounded-lg bg-gray-800 text-white ${
                        isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                    }`}
                >
                    {tripTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Additional Details</label>
                <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                disabled={isSubmitDisabled}
                placeholder="Any special requirements? (AC, luggage, pet-friendly, etc.)"
                className={`w-full p-3 border rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 ${
                    isSubmitDisabled ? 'border-gray-700 cursor-not-allowed opacity-70' : 'border-gray-600'
                }`}
                />
            </div>

            {/* Urgent */}
            <div className={`flex items-center justify-between p-4 rounded-lg ${
                isSubmitDisabled 
                    ? 'bg-gray-800/30 border border-gray-700' 
                    : 'bg-green-900/20 border border-green-700'
            }`}>
                <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSubmitDisabled ? 'bg-gray-700' : 'bg-red-800'
                }`}>
                    <span className={isSubmitDisabled ? 'text-gray-500' : 'text-red-500'}>⚡</span>
                </div>
                <div>
                    <p className={`font-medium ${isSubmitDisabled ? 'text-gray-400' : 'text-green-200'}`}>
                        Urgent Request
                    </p>
                    <p className={`text-sm ${isSubmitDisabled ? 'text-gray-500' : 'text-green-300'}`}>
                        Get priority from drivers
                    </p>
                </div>
                </div>
                <label className={`inline-flex items-center cursor-pointer ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                    type="checkbox"
                    checked={formData.urgent}
                    onChange={(e) => handleChange("urgent", e.target.checked)}
                    disabled={isSubmitDisabled}
                    className="sr-only peer"
                />
                <div className={`relative w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-500 after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    isSubmitDisabled 
                        ? 'bg-gray-700 cursor-not-allowed peer-checked:bg-gray-600' 
                        : 'bg-gray-700 peer-focus:outline-none peer-checked:bg-green-500'
                }`}></div>
                </label>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-3 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                    isSubmitDisabled
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-gray-700/20'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-purple-500/50'
                }`}
            >
                {loading ? (
                    <>⏳ Posting Request...</>
                ) : actualRequestCount >= 3 ? (
                    <>❌ Maximum Requests Reached (3/3)</>
                ) : (
                    <>📢 Post My Request (Free)</>
                )}
            </button>

            {/* Info */}
            <p className="text-center text-gray-400 text-sm mt-2">
                {actualRequestCount >= 3 ? (
                    <span className="text-red-300">⚠️ Delete an existing request to create a new one</span>
                ) : (
                    <>✅ No fees • ✅ Get multiple offers • ✅ Contact drivers directly</>
                )}
            </p>
        </form>
    );
}