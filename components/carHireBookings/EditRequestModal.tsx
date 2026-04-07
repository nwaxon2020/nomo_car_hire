"use client";

import { X } from 'lucide-react';
import { BookingRequestType } from "./types";
import { nigeriaLocations } from "./locations";

interface EditRequestModalProps {
  request: BookingRequestType;
  editForm: {
    carType: string;
    budget: string;
    location: string;
    startDate: string;
    endDate: string;
    passengers: string;
    tripType: string;
    description: string;
    negotiable: boolean;
    urgent: boolean;
    isSameCity: boolean;
    destination: string;
  };
  setEditForm: (form: any) => void;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditRequestModal({
  request,
  editForm,
  setEditForm,
  onClose,
  onUpdate
}: EditRequestModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[40rem] max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Request</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Car Type *
              </label>
              <input
                type="text"
                value={editForm.carType}
                onChange={(e) => setEditForm({ ...editForm, carType: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                placeholder="e.g., Toyota Camry, SUV, etc."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (₦) *
                </label>
                <input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passengers *
                </label>
                <input
                  type="number"
                  value={editForm.passengers}
                  onChange={(e) => setEditForm({ ...editForm, passengers: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <select
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                >
                  <option value="">Select State</option>
                  {Object.keys(nigeriaLocations).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  placeholder="Enter your city"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Is this trip within the same city?
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="editSameCityYes"
                    name="editSameCity"
                    checked={editForm.isSameCity}
                    onChange={() => setEditForm({ ...editForm, isSameCity: true })}
                    className="h-5 w-5 text-green-500"
                  />
                  <label htmlFor="editSameCityYes" className="ml-2 text-sm text-gray-700 cursor-pointer">
                    <span className="font-medium text-green-600">City Ride</span> - Within same city
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="editSameCityNo"
                    name="editSameCity"
                    checked={!editForm.isSameCity}
                    onChange={() => setEditForm({ ...editForm, isSameCity: false })}
                    className="h-5 w-5 text-blue-500"
                  />
                  <label htmlFor="editSameCityNo" className="ml-2 text-sm text-gray-700 cursor-pointer">
                    <span className="font-medium text-blue-600">Intercity Trip</span> - To another city
                  </label>
                </div>
              </div>

              {!editForm.isSameCity && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-fadeIn">
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    🚗 Destination City *
                  </label>
                  <input
                    type="text"
                    value={editForm.destination}
                    onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                    required={!editForm.isSameCity}
                    placeholder="e.g., Abuja, Ibadan, Port Harcourt"
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  />
                  <p className="text-xs text-blue-600 mt-2">
                    <span className="font-medium">Route:</span> {editForm.location} → {editForm.destination || "[Destination]"}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Purpose *
              </label>
              <select
                value={editForm.tripType}
                onChange={(e) => setEditForm({ ...editForm, tripType: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                required
              >
                <option value="">Select trip purpose...</option>
                <option value="Quick Drop">Quick Drop Within City</option>
                <option value="Airport">Airport Pickup/Drop-off</option>
                <option value="Wedding/Event">Wedding/Event</option>
                <option value="Monthly">Monthly Rental</option>
                <option value="Tourism">Tourism/Sightseeing</option>
                <option value="Custom">Custom Trip</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                rows={3}
                placeholder="Add any additional details..."
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editNegotiable"
                  checked={editForm.negotiable}
                  onChange={(e) => setEditForm({ ...editForm, negotiable: e.target.checked })}
                  className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="editNegotiable" className="ml-3 text-gray-700">
                  <span className="font-medium text-sm sm:text-base">Budget is Negotiable</span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editUrgent"
                  checked={editForm.urgent}
                  onChange={(e) => setEditForm({ ...editForm, urgent: e.target.checked })}
                  className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 rounded border-gray-300"
                />
                <label htmlFor="editUrgent" className="ml-3 text-gray-700">
                  <span className="font-medium text-sm sm:text-base">Urgent Request</span>
                  <p className="text-xs sm:text-sm text-gray-500">This request needs immediate attention</p>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={onUpdate}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
            >
              Update Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
