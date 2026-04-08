"use client"
import React from 'react';
import { FaUser, FaStar, FaTrash, FaUserCheck } from 'react-icons/fa';
import ListingStars from '../ui/ListingStars';
import { Driver, Comment } from '../types';

interface ModalReviewsProps {
    driver: Driver;
    currentUser: any;
    hasUserReviewed: boolean;
    reviewForm: { rating: number; comment: string };
    hoverRating: number;
    currentUserId: string;
    reviewMessage: { text: string; type: string };
    onReviewSubmit: (e: React.FormEvent) => void;
    onRatingClick: (r: number) => void;
    onSetHoverRating: (r: number) => void;
    onReviewChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onDeleteComment: (c: Comment) => void;
    formatDate: (d: any) => string;
}

export default function ModalReviews({
    driver,
    currentUser,
    hasUserReviewed,
    reviewForm,
    hoverRating,
    currentUserId,
    reviewMessage,
    onReviewSubmit,
    onRatingClick,
    onSetHoverRating,
    onReviewChange,
    onDeleteComment,
    formatDate
}: ModalReviewsProps) {
    return (
        <div id="reviews-section" className="bg-gray-800 rounded-lg md:px-26 p-2 sm:p-4">
            <h3 className="text-lg font-bold text-white mb-4">Reviews & Ratings</h3>

            {/* Review Form */}
            {currentUser && (
                <div className="mb-6 sm:p-4 p-2 bg-gray-900 rounded-lg">
                    {hasUserReviewed ? (
                        <div className="text-center p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                            <FaUser className="mx-auto text-3xl text-blue-400 mb-2" />
                            <p className="text-white font-medium">You have already reviewed this driver</p>
                            <p className="text-gray-300 text-sm mt-1">You can delete your existing review to submit a new one</p>
                        </div>
                    ) : (
                        <form onSubmit={onReviewSubmit}>
                            {/* Rating Stars */}
                            <div className="mb-4">
                                <p className="text-white mb-2">Rate this driver:</p>
                                <div className="flex items-center gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => onRatingClick(star)}
                                            onMouseEnter={() => onSetHoverRating(star)}
                                            onMouseLeave={() => onSetHoverRating(0)}
                                            className="text-2xl focus:outline-none"
                                        >
                                            <FaStar className={`${star <= (hoverRating || reviewForm.rating) ? "text-yellow-400" : "text-gray-400"}`} />
                                        </button>
                                    ))}
                                    <span className="ml-3 text-white">
                                        {reviewForm.rating > 0 ? `${reviewForm.rating} star${reviewForm.rating === 1 ? '' : 's'}` : "Click to rate"}
                                    </span>
                                </div>
                            </div>

                            <textarea
                                className="w-full outline-none rounded bg-gray-700 text-white p-3 sm:mb-3"
                                name="comment"
                                rows={3}
                                maxLength={500}
                                placeholder="Write your review here..."
                                value={reviewForm.comment}
                                onChange={onReviewChange}
                                required
                                disabled={hasUserReviewed}
                            ></textarea>

                            <div className="flex flex-col sm:flex-row justify-between items-center">
                                <span className="my-1 text-sm text-gray-400">
                                    {reviewForm.comment.length}/500 characters
                                </span>
                                <button
                                    type="submit"
                                    className={`w-full sm:w-50 px-6 py-2 text-white font-semibold rounded ${hasUserReviewed ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    disabled={hasUserReviewed}
                                >
                                    {hasUserReviewed ? 'Already Reviewed' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    )}

                    {reviewMessage.text && (
                        <div className={`mt-3 p-2 text-center rounded ${reviewMessage.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                            }`}>
                            {reviewMessage.text}
                        </div>
                    )}
                </div>
            )}

            {/* Reviews List */}
            <div className="mt-6 sm:mt-12 max-h-96 overflow-y-auto pr-2">
                {driver.comments && driver.comments.length > 0 ? (
                    [...driver.comments]
                        .sort((a, b) => {
                            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                            return dateB.getTime() - dateA.getTime();
                        })
                        .map((comment, idx) => {
                            const isCurrentUserComment = comment.userId === currentUserId;
                            const userInitial = comment.firstName ? comment.firstName.charAt(0).toUpperCase() :
                                comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U';

                            return (
                                <div key={idx} className="mb-4 p-3 sm:p-4 bg-gray-900 rounded-lg border border-gray-700">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-bold text-sm sm:text-base">{userInitial}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-white text-sm sm:text-base truncate">
                                                    {comment.firstName || comment.userName.split(' ')[0] || 'User'}
                                                    {comment.lastName ? ` ${comment.lastName}` : ''}
                                                    {isCurrentUserComment && (
                                                        <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">You</span>
                                                    )}
                                                </p>
                                                <p className="text-gray-400 text-xs sm:text-sm truncate">{comment.userEmail}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start sm:items-end gap-2">
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <div className="flex text-yellow-400 text-xs sm:text-sm">
                                                    {comment.rating && <ListingStars rating={comment.rating} size="sm" />}
                                                </div>
                                                <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                                                    {formatDate(comment.createdAt)}
                                                </span>
                                            </div>
                                            {isCurrentUserComment && (
                                                <button
                                                    onClick={() => onDeleteComment(comment)}
                                                    className="text-red-400 hover:text-red-300 text-xs sm:text-sm flex items-center gap-1 mt-1"
                                                    title="Delete your review"
                                                >
                                                    <FaTrash className="text-xs" />
                                                    <span>Delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="p-2 sm:p-3 rounded-lg bg-gray-800/50 text-gray-300 text-sm sm:text-base border-l-2 sm:border-l-4 border-blue-600">
                                        {comment.comment}
                                    </p>
                                </div>
                            );
                        })
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-3xl mb-3">💬</div>
                        <p>No reviews yet. Be the first to review this driver!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
