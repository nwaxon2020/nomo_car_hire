"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import SafetyTips from "./SafetyTips";
import { 
    Phone, 
    MessageSquare, 
    Car, 
    Star, 
    Shield, 
    Copy, 
    X, 
    Clock,
    Calendar,
    DollarSign,
    MapPin,
    FileText,
    CheckCircle,
    AlertCircle,
    Loader2,
    Zap,
    Sparkles
} from "lucide-react";

interface EnhancedWhatsAppProps {
    car: {
        id: string;
        title: string;
        price?: number;
        model?: string;
        year?: string;
    };
    driver: {
        id: string;
        name: string;
        phone?: string;
        rating?: number;
        trips?: number;
    };
    chatHistory?: Array<{
        senderId: string;
        text: string;
        timestamp: string;
    }>;
    onClose?: () => void;
    requestDetails?: {
        dates: string[];
        budget: string;
        location: string;
    };
}

export default function EnhancedWhatsApp({ 
    car, 
    driver, 
    chatHistory = [], 
    onClose,
    requestDetails 
}: EnhancedWhatsAppProps) {
    const [showSafetyTips, setShowSafetyTips] = useState(true);
    const [selectedTips, setSelectedTips] = useState<string[]>([]);
    const [customMessage, setCustomMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [phoneError, setPhoneError] = useState<string>("");
    const [activeQuickMessage, setActiveQuickMessage] = useState<string | null>(null);

    // Validate and format phone number
    const formatPhoneNumber = (phone: string): string => {
        if (!phone) return "";
        
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.startsWith('234')) {
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            return '234' + cleaned.substring(1);
        } else if (cleaned.length === 10) {
            return '234' + cleaned;
        } else if (cleaned.length >= 10) {
            return cleaned;
        }
        
        return phone;
    };

    // Quick Messages Array - These will populate the textarea when clicked
    const quickMessages = [
        {
            id: 1,
            title: "Check Availability",
            message: `Hello ${driver.name},\n\nI saw your ${car.title} on the rental platform. Is it available for rent?`,
            icon: Calendar,
            color: "from-blue-500 to-blue-600"
        },
        {
            id: 2,
            title: "Rental Rates",
            message: `Hello ${driver.name},\n\nI'm interested in your ${car.title}. What are your rental rates (daily/weekly/monthly)?`,
            icon: DollarSign,
            color: "from-green-500 to-emerald-600"
        },
        {
            id: 3,
            title: "Rental Terms",
            message: `Hello ${driver.name},\n\nI'd like to know the rental terms for your ${car.title}:\n• Minimum rental duration\n• Security deposit\n• Insurance coverage\n• Fuel policy`,
            icon: Clock,
            color: "from-purple-500 to-purple-600"
        },
        {
            id: 4,
            title: "Pickup Location",
            message: `Hello ${driver.name},\n\nWhere is the pickup location for your ${car.title}? Do you offer delivery?`,
            icon: MapPin,
            color: "from-orange-500 to-orange-600"
        },
    ];

    // Handle quick message click
    const handleQuickMessageClick = (message: string, title: string) => {
        console.log("Setting message:", message);
        setCustomMessage(message);
        setActiveQuickMessage(title);
    };

    // Clear textarea
    const handleClearMessage = () => {
        setCustomMessage("");
        setActiveQuickMessage(null);
    };

    const handleSendWhatsApp = async () => {
        if (!driver.phone) {
            setPhoneError("Driver phone number is not available");
            return;
        }

        const formattedPhone = formatPhoneNumber(driver.phone);
        if (!formattedPhone || formattedPhone.length < 10) {
            setPhoneError("Invalid phone number format");
            return;
        }

        if (!customMessage.trim()) {
            setPhoneError("Please enter a message first");
            return;
        }

        setLoading(true);
        setPhoneError("");
        
        try {
            const encodedMessage = encodeURIComponent(customMessage.trim());
            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
            
            // Log interaction for analytics
            if (auth.currentUser) {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    contactedDrivers: arrayUnion({
                        driverId: driver.id,
                        driverName: driver.name,
                        carId: car.id,
                        carTitle: car.title,
                        timestamp: new Date().toISOString(),
                        via: "whatsapp",
                        safetyTipsSelected: selectedTips,
                        quickMessageUsed: activeQuickMessage
                    })
                });
            }

            // Open WhatsApp
            window.open(whatsappUrl, "_blank", "noopener,noreferrer");
            
            setTimeout(() => {
                if (onClose) onClose();
            }, 800);
            
        } catch (error) {
            console.error("Error:", error);
            if (onClose) setTimeout(() => onClose(), 500);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPhone = () => {
        if (driver.phone) {
            const formattedPhone = formatPhoneNumber(driver.phone);
            navigator.clipboard.writeText(formattedPhone).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const handleTipToggle = (tip: string) => {
        setSelectedTips(prev => 
            prev.includes(tip) 
                ? prev.filter(t => t !== tip)
                : [...prev, tip]
        );
    };

    const priceDisplay = car.price 
        ? `₦${car.price.toLocaleString()}/day`
        : "Negotiable rates";

    const getPhoneDisplay = () => {
        if (!driver.phone) return "Phone not available";
        const formatted = formatPhoneNumber(driver.phone);
        return `+${formatted}`;
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl shadow-2xl w-full mx-auto border border-gray-800">
            {/* Header */}
            <div className="px-2 py-6 sm:p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-2xl">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center relative">
                            <MessageSquare className="h-6 w-6 text-white" />
                            <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <Zap className="h-3 w-3 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold md:text-xl text-white">Continue on WhatsApp</h3>
                            <p className="text-sm text-gray-300">
                                Optional • Fast • Direct
                            </p>
                        </div>
                    </div>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="h-10 w-10 rounded-full hover:bg-gray-800 flex items-center justify-center transition-all duration-200 hover:rotate-90"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="px-3 py-6 md:p-6 space-y-6">
                {/* Driver & Car Info */}
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative">
                            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <Car className="h-7 w-7 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-center md:justify-between">
                                <h4 className="font-bold text-white">{driver.name}</h4>
                                {driver.rating && (
                                    <div className="flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded-full">
                                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                        <span className="text-xs font-medium text-white">{driver.rating}</span>
                                        {driver.trips && (
                                            <span className="text-xs text-gray-400 ml-1">({driver.trips})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-center md:text-left text-sm text-gray-300 mt-1">{car.title}</p>
                            <div className="flex flex-col md:flex-row items-center justify-center md:justify-between mt-2">
                                <span className="text-lg font-bold text-blue-400">{priceDisplay}</span>
                                {driver.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-green-400" />
                                        <span className="text-sm text-gray-300">{getPhoneDisplay()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Messages Grid - MAIN FEATURE */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-400" />
                            Quick Messages
                        </h4>
                        <span className="text-xs text-gray-400">Click to auto-fill</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {quickMessages.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeQuickMessage === item.title;
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleQuickMessageClick(item.message, item.title)}
                                    className={`p-4 rounded-xl transition-all duration-300 flex items-start gap-3 border-2
                                              ${isActive 
                                                ? `bg-gradient-to-br ${item.color} border-transparent transform scale-[1.02] shadow-xl` 
                                                : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-700'
                                              } active:scale-95`}
                                >
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-gray-900'}`}>
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h5 className={`font-semibold ${isActive ? 'text-white' : 'text-gray-200'}`}>
                                            {item.title}
                                        </h5>
                                        <p className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                                            Click to auto-fill message
                                        </p>
                                    </div>
                                    {isActive && (
                                        <CheckCircle className="h-5 w-5 text-white flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-200">
                            Your Message:
                        </label>
                        <div className="flex items-center gap-2">
                            {customMessage && (
                                <button
                                    onClick={handleClearMessage}
                                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
                                >
                                    Clear
                                </button>
                            )}
                            <span className="text-xs text-gray-500">
                                {customMessage.length} chars
                            </span>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows={4}
                            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-100 placeholder-gray-500 resize-none pr-10"
                            placeholder="Click a quick message above or type your own..."
                        />
                        {!customMessage && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <MessageSquare className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Select a quick message above</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Safety Tips */}
                <div className="border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-amber-400" />
                            <span className="font-semibold text-amber-200">Safety Tips</span>
                        </div>
                        <button
                            onClick={() => setShowSafetyTips(!showSafetyTips)}
                            className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
                        >
                            {showSafetyTips ? "Hide" : "Show"}
                        </button>
                    </div>
                    
                    {showSafetyTips && (
                        <div className="mt-2">
                            <SafetyTips 
                                selectedTips={selectedTips}
                                onTipToggle={handleTipToggle}
                            />
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {phoneError && (
                    <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg flex items-center gap-2 animate-pulse">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <p className="text-sm text-red-300">{phoneError}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                    <button
                        onClick={handleSendWhatsApp}
                        disabled={loading || !driver.phone || !customMessage.trim()}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 
                                  transition-all duration-200 ${!loading && 'active:scale-95'} ${
                            driver.phone && customMessage.trim()
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/25" 
                                : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Opening WhatsApp...
                            </>
                        ) : !driver.phone ? (
                            <>
                                <Phone className="h-5 w-5" />
                                Phone Not Available
                            </>
                        ) : !customMessage.trim() ? (
                            <>
                                <MessageSquare className="h-5 w-5" />
                                Select a Message First
                            </>
                        ) : (
                            <>
                                <MessageSquare className="h-5 w-5" />
                                Send on WhatsApp
                            </>
                        )}
                    </button>
                    
                    {/* Copy Phone Button */}
                    {driver.phone && (
                        <button
                            onClick={handleCopyPhone}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 
                                     rounded-xl text-sm font-medium transition-all duration-200
                                     border border-gray-700 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    <span className="text-green-400">Phone Number Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    <span>Copy Phone Number</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Footer Notes */}
                <div className="pt-4 border-t border-gray-800">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400">Secure</div>
                            <div className="text-xs text-gray-500">End-to-end</div>
                        </div>
                        <div className="p-2 bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400">Optional</div>
                            <div className="text-xs text-gray-500">Not required</div>
                        </div>
                        <div className="p-2 bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400">Direct</div>
                            <div className="text-xs text-gray-500">No middleman</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}