'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaStar, FaCar, FaCalendarAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface TripHistoryCardProps {
  trip: {
    id: string;
    driverName: string;
    driverImage?: string;
    vehicleName: string;
    vehicleModel: string;
    pickupLocation: string;
    destination: string;
    status: 'active' | 'completed' | 'cancelled';
    startTime: any;
    endTime?: any;
    rating?: number;
    review?: string;
    driverRating?: number; // ADD THIS for driver's overall rating
  };
  onRateTrip?: (tripId: string) => void;
}

export default function TripHistoryCard({ trip, onRateTrip }: TripHistoryCardProps) {
  const [showReview, setShowReview] = useState(false);
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return new Date(timestamp).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };
  
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };
  
  return (
    <div className="mb-4 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Trip Status Badge */}
      <div className={`px-4 py-2 ${trip.status === 'completed' ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {trip.status === 'completed' ? (
              <FaCheckCircle className="text-green-600" />
            ) : (
              <FaTimesCircle className="text-red-600" />
            )}
            <span className={`font-semibold ${trip.status === 'completed' ? 'text-green-800' : 'text-red-800'}`}>
              {trip.status === 'completed' ? 'Completed Trip' : 'Cancelled Trip'}
            </span>
          </div>
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <FaCalendarAlt />
            {formatDate(trip.endTime || trip.startTime)}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        {/* Driver & Vehicle Info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <Image
              src={trip.driverImage || "/per.png"}
              alt={trip.driverName}
              width={50}
              height={50}
              className="w-12 h-12 rounded-full border-2 border-gray-200"
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-900">{trip.driverName}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FaCar />
                  <span>{trip.vehicleName} {trip.vehicleModel}</span>
                </div>
                
                {/* Driver's Overall Rating - ADDED */}
                {trip.driverRating && trip.driverRating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex text-yellow-400 text-xs">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                          key={star}
                          className={star <= (trip.driverRating || 0) ? "fill-current" : "text-gray-300"}
                          size={12}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">({trip.driverRating?.toFixed(1)})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Route Information */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 pt-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Pickup Location</p>
              <p className="font-medium text-gray-800">{trip.pickupLocation}</p>
            </div>
            <div className="text-sm text-gray-500">
              {formatTime(trip.startTime)}
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 pt-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Destination</p>
              <p className="font-medium text-gray-800">{trip.destination}</p>
            </div>
            {trip.endTime && (
              <div className="text-sm text-gray-500">
                {formatTime(trip.endTime)}
              </div>
            )}
          </div>
        </div>
        
        {/* Trip Rating */}
        {trip.status === 'completed' && (
          <div className="border-t border-gray-100 pt-3">
            {trip.rating ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">Your Rating:</span>
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                          key={star}
                          className={star <= (trip.rating || 0) ? "fill-current" : "text-gray-300"}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">({trip.rating}/5)</span>
                  </div>
                  {trip.review && (
                    <button
                      onClick={() => setShowReview(!showReview)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {showReview ? 'Hide Review' : 'View Review'}
                    </button>
                  )}
                </div>
                
                {showReview && trip.review && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 italic">"{trip.review}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">No rating yet</span>
                {onRateTrip && (
                  <button
                    onClick={() => onRateTrip(trip.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                  >
                    Rate This Trip
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}