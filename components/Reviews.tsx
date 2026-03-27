"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import { 
    collection, onSnapshot, query, orderBy, where, 
    getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp 
} from "firebase/firestore";
import { 
    FaGem, FaStar, FaCrown, FaUsers, FaHeart, 
    FaFire, FaQuoteRight, FaArrowRight, FaTimes, 
    FaPlus, FaEdit, FaTrash, FaCheck, FaExclamationTriangle
} from "react-icons/fa";

// Types
interface Review {
    id: string;
    userId: string;
    userName: string;
    userImage: string | null;
    rating: number;
    comment: string;
    createdAt: Timestamp | null;
}

interface UserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    idPhotoURL?: string;
    photoURL?: string | null;
}

export default function ReviewsUi() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [user, setUser] = useState<UserData | null>(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [userReview, setUserReview] = useState<Review | null>(null);
    const [newRating, setNewRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(async (authUser) => {
            if (authUser) {
                try {
                    const userQuery = query(
                        collection(db, "users"), 
                        where("uid", "==", authUser.uid)
                    );
                    const userSnap = await getDocs(userQuery);
                    
                    if (!userSnap.empty) {
                        const userData = userSnap.docs[0].data();
                        setUser({ 
                            uid: authUser.uid,
                            email: authUser.email,
                            displayName: authUser.displayName,
                            ...userData 
                        });
                    } else {
                        setUser({
                            uid: authUser.uid,
                            email: authUser.email,
                            displayName: authUser.displayName,
                        });
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                    setError("Failed to load user data");
                }
            } else {
                setUser(null);
            }
        });
        
        const q = query(
            collection(db, "generalSiteReviews"), 
            orderBy("createdAt", "desc")
        );
        
        const unsubReviews = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            })) as Review[];
            setReviews(data);
        }, (err) => {
            console.error("Error loading reviews:", err);
            setError("Failed to load reviews");
        });

        return () => { 
            unsubAuth(); 
            unsubReviews(); 
        };
    }, []);

    useEffect(() => {
        if (user && reviews.length > 0) {
            const found = reviews.find(r => r.userId === user.uid);
            if (found) {
                setUserReview(found);
                setNewRating(found.rating);
                setNewComment(found.comment);
            } else {
                setUserReview(null);
                setNewRating(5);
                setNewComment("");
            }
        }
    }, [user, reviews]);

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews 
        : 0;

    const getRatingGradient = (rating: number): string => {
        if (rating >= 4.5) return "from-blue-600 to-indigo-600";
        if (rating >= 3.5) return "from-blue-500 to-cyan-500";
        return "from-gray-500 to-slate-500";
    };

    const getUserInitials = (name: string): string => {
        if (!name || name === "User") return "U";
        const names = name.split(' ').filter(n => n.length > 0);
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        if (names.length > 1) return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
        return "U";
    };

    const getTimeAgo = (timestamp: Timestamp | null): string => {
        if (!timestamp) return "Just now";
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Logic to get the Full Name for storage
    const getUserFullName = (userData: UserData): string => {
        if (userData.fullName) return userData.fullName;
        if (userData.firstName && userData.lastName) return `${userData.firstName} ${userData.lastName}`;
        return userData.firstName || userData.displayName || "User";
    };

    const handleSubmitReview = async () => {
        if (!user || !newComment.trim()) {
            setError("Please enter a comment");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const fullName = getUserFullName(user);
            const finalProfileImage = user.profileImage || user.idPhotoURL || user.photoURL || null;

            const reviewData = {
                userId: user.uid,
                userName: fullName, // Save the full name to the DB
                userImage: finalProfileImage,
                rating: newRating,
                comment: newComment.trim(),
                createdAt: serverTimestamp(),
            };

            if (userReview) {
                await updateDoc(doc(db, "generalSiteReviews", userReview.id), reviewData);
            } else {
                await addDoc(collection(db, "generalSiteReviews"), reviewData);
            }
            
            setShowReviewForm(false);
        } catch (err) {
            console.error("Review Error:", err);
            setError("Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteReview = async () => {
        if (!userReview) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "generalSiteReviews", userReview.id));
            setShowDeleteConfirm(false);
            setUserReview(null);
            setNewComment("");
        } catch (err) { 
            setError("Failed to delete review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

    return (
        <div className="mx-auto relative">
            {error && (
                <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                    {error}
                    <button onClick={() => setError(null)} className="ml-3">×</button>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-blue-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <FaExclamationTriangle className="text-red-500 text-2xl" />
                            </div>
                            <h3 className="text-lg font-bold text-blue-900 mb-2">Delete Review?</h3>
                            <p className="text-sm text-blue-700 mb-6">Are you sure you want to remove your experience?</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 px-4 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm">Cancel</button>
                                <button onClick={handleDeleteReview} disabled={isSubmitting} className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold text-sm">
                                    {isSubmitting ? "Deleting..." : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-12 bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 px-4 py-6 md:p-10 border border-blue-200 shadow-xl relative overflow-hidden">
                <div className="relative">
                    <div className="text-center md:text-left mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg mb-3">
                            <FaGem className="text-white text-xl" />
                        </div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Premium Experiences</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-md">
                            <FaCrown className="text-blue-500 mb-2" />
                            <div className={`text-2xl font-bold bg-gradient-to-r ${getRatingGradient(averageRating)} bg-clip-text text-transparent`}>{averageRating > 0 ? averageRating.toFixed(1) : "0.0"}</div>
                            <p className="text-blue-700 text-[10px] font-bold uppercase">Rating</p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-md">
                            <FaUsers className="text-indigo-600 mb-2" />
                            <div className="text-2xl font-bold text-indigo-600">{totalReviews}</div>
                            <p className="text-blue-700 text-[10px] font-bold uppercase">Reviews</p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-md">
                            <FaHeart className="text-pink-500 mb-2" />
                            <div className="text-2xl font-bold text-pink-500">97%</div>
                            <p className="text-blue-700 text-[10px] font-bold uppercase">Happy</p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-md">
                            <FaFire className="text-orange-500 mb-2" />
                            <div className="text-2xl font-bold text-orange-500">100%</div>
                            <p className="text-blue-700 text-[10px] font-bold uppercase">VIP</p>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 sm:p-8 border border-blue-200 shadow-inner">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                <FaQuoteRight className="text-blue-500 text-sm" />
                                {showAllReviews ? 'All Premium Reviews' : 'Featured Experiences'}
                            </h4>
                            {reviews.length > 3 && (
                                <button onClick={() => setShowAllReviews(!showAllReviews)} className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                    {showAllReviews ? 'Show Featured' : 'View All'} <FaArrowRight size={10}/>
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {displayedReviews.length > 0 ? (
                                displayedReviews.map((review) => {
                                    const isOwnReview = user?.uid === review.userId;
                                    const displayName = isOwnReview ? "You" : review.userName;

                                    return (
                                        <div key={review.id} className="p-4 bg-white rounded-xl border border-blue-50 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    {review.userImage ? (
                                                        <img src={review.userImage} alt={displayName} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-blue-100" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                                            {getUserInitials(review.userName)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h5 className={`font-bold text-sm leading-none ${isOwnReview ? "text-indigo-600" : "text-blue-900"}`}>
                                                            {displayName}
                                                        </h5>
                                                        <p className="text-blue-500 text-[10px] mt-0.5">{getTimeAgo(review.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FaStar key={i} className={`text-[10px] ${i < review.rating ? 'text-blue-500' : 'text-blue-100'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-blue-800 italic text-xs mt-3 leading-relaxed border-l-2 border-blue-200 pl-3">"{review.comment}"</p>
                                            
                                            {isOwnReview && (
                                                <div className="flex gap-3 mt-3 pt-3 border-t border-blue-50">
                                                    <button onClick={() => setShowReviewForm(true)} className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><FaEdit/> Edit</button>
                                                    <button onClick={() => setShowDeleteConfirm(true)} className="text-[10px] font-bold text-red-500 flex items-center gap-1"><FaTrash/> Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-blue-500">No reviews yet. Be the first to share your experience!</div>
                            )}
                        </div>

                        {user && !showReviewForm && !userReview && (
                            <div className="mt-8 text-center">
                                <button onClick={() => setShowReviewForm(true)} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-2 mx-auto">
                                    <FaPlus/> Share Your Experience
                                </button>
                            </div>
                        )}
                    </div>

                    {showReviewForm && (
                        <div className="mt-8 bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h5 className="font-bold text-blue-900">Your Experience</h5>
                                <button onClick={() => setShowReviewForm(false)} className="text-gray-400 hover:text-red-500"><FaTimes/></button>
                            </div>

                            <div className="flex gap-2 justify-center mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star} 
                                        onMouseEnter={() => setHoverRating(star)} 
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setNewRating(star)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${star <= (hoverRating || newRating) ? 'bg-yellow-400 text-white shadow-lg' : 'bg-yellow-50 text-yellow-300'}`}
                                    >
                                        <FaStar />
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                                placeholder="Describe your experience..."
                            />

                            <button 
                                onClick={handleSubmitReview}
                                disabled={isSubmitting || !newComment.trim()}
                                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? "Processing..." : userReview ? <><FaCheck/> Update Review</> : <><FaGem/> Submit Review</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}