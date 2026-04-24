"use client"
import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaClock, FaUserCheck } from 'react-icons/fa';
import ModalProfileHeader from './ModalSections/ModalProfileHeader';
import ModalVehicleGallery from './ModalSections/ModalVehicleGallery';
import ModalVehicleInfo from './ModalSections/ModalVehicleInfo';
import ModalReviews from './ModalSections/ModalReviews';
import ListingStars from './ui/ListingStars';
import { DriverWithVehicle, VehicleLog, Trip, Comment } from './types';

interface DriverDetailsModalProps {
    show: boolean;
    driver: DriverWithVehicle;
    vehicle: VehicleLog;
    currentUser: any;
    activeTrip: Trip | null;
    saveMessage: { text: string; type: string };
    showDeleteConfirm: { show: boolean, comment: Comment | null };
    reviewForm: { rating: number; comment: string };
    hoverRating: number;
    hasUserReviewed: boolean;
    currentUserId: string;
    mainImage: string;
    // Handlers
    onClose: () => void;
    onDeleteComment: (c: Comment) => void;
    onConfirmDeleteComment: () => void;
    onCancelDeleteComment: () => void;
    onReviewSubmit: (e: React.FormEvent) => void;
    onReviewChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onRatingClick: (r: number) => void;
    onSetHoverRating: (r: number) => void;
    onSetMainImage: (img: string) => void;
    onSetDriverInfo: (v: boolean) => void;
    onSetPreChat: (v: boolean) => void;
    isSubmittingReview: boolean;
    onPhoneCall: (p: string) => void;
    onWhatsAppMessage: (d: any, v: any) => void;
    getDriverAddress: (d: any) => string;
    formatDate: (d: any) => string;
    onSetVehicle: (v: VehicleLog) => void;
    onMarkContacted?: () => void;
}

export default function DriverDetailsModal(props: DriverDetailsModalProps) {
    if (!props.show) return null;

    const { driver, vehicle, saveMessage, showDeleteConfirm } = props;

    return (
        <div id="contact-driver" className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center sm:p-8 z-60 overflow-y-auto">
            <div className="bg-gray-900 md:rounded-xl max-w-6xl w-full max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 z-10 p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Driver & Vehicle Details</h2>
                    <button onClick={props.onClose} className="text-gray-400 hover:text-white text-2xl">✖</button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-6">
                    {/* Save Message Inside Modal */}
                    {saveMessage.text && (
                        <div className={`mb-4 p-3 rounded-lg ${saveMessage.type === "success" ? "bg-green-900 border border-green-700 text-green-300" :
                            saveMessage.type === "error" ? "bg-red-900 border border-red-700 text-red-300" :
                                "bg-blue-900 border border-blue-700 text-blue-300"
                            }`}>
                            <div className="flex items-center">
                                {saveMessage.type === "success" && <FaCheckCircle className="mr-2" />}
                                {saveMessage.type === "error" && <FaExclamationTriangle className="mr-2" />}
                                {saveMessage.type === "info" && <FaClock className="mr-2" />}
                                <p className="flex-1">{saveMessage.text}</p>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm.show && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                                <h3 className="text-xl font-bold text-white mb-4">Delete Review</h3>
                                <p className="text-gray-300 mb-6">Are you sure you want to delete your review? This action cannot be undone.</p>
                                <div className="flex gap-3">
                                    <button onClick={props.onCancelDeleteComment} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300">Cancel</button>
                                    <button onClick={props.onConfirmDeleteComment} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-300">Delete</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <ModalProfileHeader
                        driver={driver}
                        vehicle={vehicle}
                        onSetDriverInfo={props.onSetDriverInfo}
                        onSetPreChat={props.onSetPreChat}
                        onPhoneCall={props.onPhoneCall}
                        onWhatsAppMessage={props.onWhatsAppMessage}
                        getDriverAddress={props.getDriverAddress}
                        onMarkContacted={props.onMarkContacted}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            {/* Rating Summary */}
                            {driver.averageRating !== undefined && driver.averageRating !== null && driver.averageRating > 0 && (
                                <div className="bg-gray-800 rounded-lg p-2 mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xl font-bold text-white">{driver.averageRating.toFixed(1)}</div>
                                            <div><ListingStars rating={driver.averageRating} size="md" /></div>
                                            <div className="text-gray-400 text-sm">
                                                {driver.totalRatings || 0} {driver.totalRatings === 1 ? 'review' : 'reviews'}
                                            </div>
                                        </div>
                                        {driver.customersCarried && driver.customersCarried.length > 0 && (
                                            <div className="text-sm text-gray-300">
                                                <FaUserCheck className="inline mr-1" />
                                                {driver.customersCarried.length} customer{driver.customersCarried.length === 1 ? '' : 's'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Compact Reviews on the Left */}
                            <div className="max-h-[30rem] overflow-y-auto scrollbar-hide">
                                <ModalReviews
                                    driver={driver}
                                    currentUser={props.currentUser}
                                    hasUserReviewed={props.hasUserReviewed}
                                    isSubmitting={props.isSubmittingReview}
                                    reviewForm={props.reviewForm}
                                    hoverRating={props.hoverRating}
                                    currentUserId={props.currentUserId}
                                    reviewMessage={props.saveMessage}
                                    onReviewSubmit={props.onReviewSubmit}
                                    onRatingClick={props.onRatingClick}
                                    onSetHoverRating={props.onSetHoverRating}
                                    onReviewChange={props.onReviewChange}
                                    onDeleteComment={props.onDeleteComment}
                                    formatDate={props.formatDate}
                                />
                            </div>
                        </div>

                        <div className="max-h-[50rem] overflow-y-auto scrollbar-hide space-y-4">
                            <ModalVehicleGallery
                                vehicle={vehicle}
                                mainImage={props.mainImage}
                                onSetMainImage={props.onSetMainImage}
                            />
                            <ModalVehicleInfo
                                vehicle={vehicle}
                                driver={driver}
                                onSetVehicle={props.onSetVehicle}
                                onSetMainImage={props.onSetMainImage}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
