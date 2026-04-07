"use client";

import { X, Car, Users, AlertCircle } from 'lucide-react';
import { BookingRequestType, UserType } from "./types";

interface ContactModalProps {
    selectedRequest: BookingRequestType;
    userData: UserType;
    contactForm: {
        carMake: string;
        hasAC: boolean;
        price: string;
        message: string;
        agreeTerms: boolean;
        vehicleId: string;
    };
    setContactForm: (form: any) => void;
    driverVehicles: any[];
    selectedVehicle: any;
    setSelectedVehicle: (vehicle: any) => void;
    onClose: () => void;
    onSubmit: () => void;
    userId?: string;
    userName?: string;
}

export default function ContactModal({
    selectedRequest,
    userData,
    contactForm,
    setContactForm,
    driverVehicles,
    selectedVehicle,
    setSelectedVehicle,
    onClose,
    onSubmit,
    userId,
    userName
}: ContactModalProps) {
    return (
        <div className="h-[100vh] fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-[60] backdrop-blur-sm">
            <div className="bg-gray-900 rounded md:rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-gray-700 animate-fadeIn">
                <div className="p-4 sm:p-5 flex-shrink-0 border-b border-gray-800 bg-gray-900 rounded-t-xl sticky top-0 z-10 w-full">
                    <div className="flex justify-between items-center">
                        <div className="w-full">
                            <div className="flex justify-between items-center gap-2">
                                <h3 className="text-lg sm:text-lg font-bold text-white flex items-center gap-2">
                                    <Car className="w-5 h-5 text-emerald-500" /> Make an Offer
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-400 mt-3 md:mt-1 truncate text-xs">
                                You're offering for: <span className="font-medium text-gray-200">{selectedRequest.carType}</span>
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 mt-3 md:mt-1 truncate text-xs">
                                Customer's Location: <span className="font-medium text-gray-200">{selectedRequest.city ? `${selectedRequest.city}, ${selectedRequest.state}` : selectedRequest.location || "Unknown"}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-4 sm:p-5 w-full">
                    {/* Your Details Section (Driver's info) */}
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-800/60 border border-gray-700 rounded-lg">
                        <p className="font-medium text-blue-400 text-sm flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            Your Details (Will be shared with requester)
                        </p>
                        <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-300">
                            <p><span className="text-gray-500">Name:</span> {userData.fullName || userData.firstName ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userName : userName || "Not provided"}</p>
                            <p><span className="text-gray-500">Phone:</span> {userData.phoneNumber || "Not provided"}</p>
                            <p><span className="text-gray-500">Location:</span> {userData.city ? `${userData.city}, ${userData.state}` : userData.state || "Unknown"}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">This info will be safely shared with the requester upon offer submission</p>
                        </div>
                    </div>

                    {/* Offer Form */}
                    <div className="space-y-4 pb-2">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                                Select Your Car from Fleet *
                            </label>
                            <select
                                value={contactForm.vehicleId}
                                onChange={(e) => {
                                    const v = driverVehicles.find(veh => veh.id === e.target.value);
                                    setSelectedVehicle(v || null);
                                    setContactForm({
                                        ...contactForm,
                                        vehicleId: e.target.value,
                                        carMake: v ? `${v.make} ${v.model}` : ""
                                    });
                                }}
                                className="w-full px-3 py-2 sm:py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                required
                            >
                                <option value="">-- Choose Car --</option>
                                {driverVehicles.map((v) => (
                                    <option
                                        key={v.id}
                                        value={v.id}
                                        disabled={!v.isApproved}
                                        className={!v.isApproved ? 'text-gray-500 bg-gray-900' : ''}
                                    >
                                        {v.make} {v.model} ({v.year}) {v.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
                                    </option>
                                ))}
                            </select>

                            {/* Show warning when driver has ZERO approved vehicles */}
                            {driverVehicles.filter(v => v.isApproved === true).length === 0 && driverVehicles.length > 0 && (
                                <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                                    <p className="text-orange-400 text-[11px] font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        ⚠️ You have no approved vehicles. Please wait for admin approval or contact support.
                                    </p>
                                </div>
                            )}

                            {driverVehicles.length === 0 && (
                                <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                                    <p className="text-orange-400 text-[11px] font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        ⚠️ You have no vehicles. Please add a vehicle to your profile first.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.location.href = `/user/driver-profile/${userId}#vehicle-section`;
                                        }}
                                        className="mt-2 text-xs bg-orange-500/30 text-orange-300 px-3 py-1 rounded-lg hover:bg-orange-500/40 transition-colors"
                                    >
                                        Add Vehicle
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Price Input */}
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                                Your Offer Price (₦) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">₦</span>
                                <input
                                    type="number"
                                    value={contactForm.price}
                                    onChange={(e) => setContactForm({ ...contactForm, price: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 sm:py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-500 font-medium tracking-wide"
                                    placeholder="Enter price"
                                    required
                                    disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                                />
                            </div>
                            <p className="text-[10px] sm:text-xs text-emerald-500 mt-1.5 font-medium">
                                Requested budget: ₦{parseInt(selectedRequest.budget || "0").toLocaleString()}
                            </p>
                        </div>

                        {/* Air Conditioning Checkbox */}
                        <div className="flex items-start mt-2">
                            <input
                                type="checkbox"
                                id="hasAC"
                                checked={contactForm.hasAC}
                                onChange={(e) => setContactForm({ ...contactForm, hasAC: e.target.checked })}
                                className="h-4 w-4 bg-gray-800 text-emerald-500 rounded border-gray-600 mt-0.5 focus:ring-emerald-500"
                                disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                            />
                            <label htmlFor="hasAC" className="ml-2.5 text-gray-300">
                                <span className="font-medium text-sm">Air Conditioning</span>
                                <p className="text-[10px] sm:text-xs text-gray-500">I have a functional AC system.</p>
                            </label>
                        </div>

                        {/* Message */}
                        <div className="pt-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1.5">
                                Message (Optional)
                            </label>
                            <textarea
                                value={contactForm.message}
                                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-500"
                                rows={2}
                                placeholder="Short message to the requester..."
                                disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                            />
                        </div>

                        {/* Terms Agreement */}
                        <div className="flex items-start bg-gray-800/40 p-3 rounded-lg border border-gray-700/50 mt-2">
                            <input
                                type="checkbox"
                                id="agreeTerms"
                                checked={contactForm.agreeTerms}
                                onChange={(e) => setContactForm({ ...contactForm, agreeTerms: e.target.checked })}
                                className="h-4 w-4 bg-gray-800 text-emerald-500 rounded border-gray-600 mt-0.5 focus:ring-emerald-500"
                                required
                                disabled={driverVehicles.filter(v => v.isApproved === true).length === 0}
                            />
                            <label htmlFor="agreeTerms" className="ml-2.5 text-gray-300">
                                <span className="font-medium text-xs sm:text-sm">I agree to terms</span>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                                    I guarantee that I am immediately available for this trip.
                                </p>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-xl flex-shrink-0 w-full">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={
                                !contactForm.agreeTerms ||
                                !contactForm.price ||
                                !contactForm.carMake ||
                                driverVehicles.filter(v => v.isApproved === true).length === 0
                            }
                            className={`flex-1 px-4 py-2.5 rounded-lg transition-colors text-sm font-bold shadow-md ${!contactForm.agreeTerms ||
                                !contactForm.price ||
                                !contactForm.carMake ||
                                driverVehicles.filter(v => v.isApproved === true).length === 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20'
                                }`}
                        >
                            Confirm Offer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
