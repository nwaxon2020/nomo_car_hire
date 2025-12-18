"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { 
  getDoc, doc, collection, getDocs, 
  addDoc, updateDoc, deleteDoc, query, 
  where, orderBy, limit, serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { 
  FaTachometerAlt, FaHome, FaInfoCircle, FaUserPlus, 
  FaSignInAlt, FaSignOutAlt, FaCar, FaMobileAlt, FaRegCommentDots,
  FaStar, FaHeart, FaUsers, FaShieldAlt, FaEdit, FaTrash, FaTimes,
  FaArrowRight, FaPlus, FaCheck, FaFire, FaCrown, FaGem, FaQuoteRight
} from "react-icons/fa";

interface Review {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: any;
  updatedAt: any;
}

export default function Footer() {
  const router = useRouter();
  const pathName = usePathname();

  const [user, setUser] = useState<any>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Review system states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState<boolean>(false);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  
  // Form states
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hoverRating, setHoverRating] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = auth.onAuthStateChanged(
      async (firebaseUser) => {
        if (!isMounted) return;
        
        try {
          setUser(firebaseUser);
          
          if (firebaseUser) {
            if (!isValidUserId(firebaseUser.uid)) {
              console.warn("Invalid user ID format detected");
              setIsDriver(false);
              return;
            }
            
            await fetchUserProfile(firebaseUser.uid);
            await checkUserReview(firebaseUser.uid);
          } else {
            setIsDriver(false);
            setUserReview(null);
          }
        } catch (error) {
          console.error("Auth error:", error);
          setError("Authentication error");
        } finally {
          if (isMounted) setLoading(false);
        }
      },
      (error) => {
        if (isMounted) {
          console.error("Auth listener error:", error);
          setError("Authentication error");
          setLoading(false);
        }
      }
    );

    // Fetch reviews
    fetchReviews();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Validate user ID format
  const isValidUserId = (userId: string): boolean => {
    return typeof userId === 'string' && userId.length >= 10 && userId.length <= 50;
  };

  // Secure user profile fetch
  const fetchUserProfile = async (userId: string) => {
    if (!isValidUserId(userId)) {
      console.warn("Invalid user ID format");
      setIsDriver(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 5000)
      );
      
      const userRef = doc(db, "users", userId);
      const fetchPromise = getDoc(userRef);
      
      const userDoc = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setIsDriver(Boolean(data.isDriver));
      } else {
        setIsDriver(false);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      setIsDriver(false);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews from Firebase
  const fetchReviews = async () => {
    try {
      const reviewsRef = collection(db, "generalSiteReviews");
      const q = query(reviewsRef, orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const reviewsList: Review[] = [];
        let totalRating = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          reviewsList.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            rating: data.rating,
            comment: data.comment,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
          totalRating += data.rating;
        });
        
        setReviews(reviewsList);
        setTotalReviews(reviewsList.length);
        
        if (reviewsList.length > 0) {
          setAverageRating(parseFloat((totalRating / reviewsList.length).toFixed(1)));
        } else {
          setAverageRating(0);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setError("Failed to load reviews");
    }
  };

  // Check if user has existing review
  const checkUserReview = async (userId: string) => {
    try {
      const reviewsRef = collection(db, "generalSiteReviews");
      const q = query(reviewsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        setUserReview({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
        setNewRating(data.rating);
        setNewComment(data.comment);
      }
    } catch (error) {
      console.error("Error checking user review:", error);
    }
  };

  // Submit or update review
  const handleSubmitReview = async () => {
    if (!user) {
      alert("Please sign in to submit a review");
      return;
    }

    if (!newComment.trim()) {
      alert("Please enter your review comment");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const reviewData = {
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userEmail: user.email || "No email",
        rating: newRating,
        comment: newComment.trim(),
        updatedAt: serverTimestamp()
      };

      if (userReview) {
        const reviewRef = doc(db, "generalSiteReviews", userReview.id);
        await updateDoc(reviewRef, reviewData);
      } else {
        const reviewsRef = collection(db, "generalSiteReviews");
        await addDoc(reviewsRef, {
          ...reviewData,
          createdAt: serverTimestamp()
        });
      }

      setShowReviewForm(false);
      if (!userReview) {
        setNewComment("");
        setNewRating(5);
      }
      
      alert(userReview ? "Review updated successfully!" : "Review submitted successfully!");
      
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete review
  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    if (!confirm("Are you sure you want to delete your review?")) return;
    
    try {
      const reviewRef = doc(db, "generalSiteReviews", userReview.id);
      await deleteDoc(reviewRef);
      
      setUserReview(null);
      setNewComment("");
      setNewRating(5);
      setShowReviewForm(false);
      
      alert("Review deleted successfully!");
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Failed to delete review. Please try again.");
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get time ago string
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Recently";
    
    const date = timestamp.toDate();
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
  };

  // Get gradient based on rating
  const getRatingGradient = (rating: number) => {
    if (rating >= 4.5) return "from-blue-500 to-indigo-500";
    if (rating >= 4) return "from-blue-500 to-cyan-400";
    if (rating >= 3) return "from-blue-400 to-teal-400";
    return "from-blue-300 to-emerald-400";
  };

  // Secure logout
  const handleLogout = async () => {
    try {
      if (loading) return;
      
      setLoading(true);
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      setError("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const lastUpdated = new Date().toLocaleDateString();

  if (pathName === "/user/chat") {
    return null;
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <footer className="w-full mt-0 bg-gradient-to-br from-[#f6f7f9] to-[#e9eef3] py-12 border-t border-gray-300 shadow-inner">
      <div className="mx-auto px-4  md:px-8">
        {/* Premium Blueish Reviews Section */}
        <div className="mb-12 bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 rounded-2xl p-6 sm:p-8 border border-blue-200 shadow-xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full -translate-y-24 sm:-translate-y-32 translate-x-8 sm:translate-x-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-tr from-cyan-100 to-blue-100 rounded-full translate-y-16 sm:translate-y-24 -translate-x-6 sm:-translate-x-12 opacity-60"></div>
          
          <div className="relative">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg mb-3 sm:mb-4">
                <FaGem className="text-white text-xl sm:text-2xl" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                Premium Experiences
              </h3>
              <p className="text-blue-700 max-w-2xl mx-auto text-sm sm:text-lg">
                Join thousands who trust us for exceptional service
              </p>
            </div>
          
            {/* Statistics Cards - Blueish Theme - 2 per row on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
              {/* Average Rating Card */}
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-10 sm:w-14 h-10 sm:h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 shadow-inner">
                  <FaCrown className="text-blue-500 text-lg sm:text-xl" />
                </div>
                <div className={`text-2xl sm:text-4xl font-bold bg-gradient-to-r ${getRatingGradient(averageRating)} bg-clip-text text-transparent`}>
                  {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                </div>
                <div className="flex justify-center my-2 sm:my-3">
                  {[...Array(5)].map((_, i) => (
                    <FaStar 
                      key={i} 
                      className={`text-sm sm:text-lg ${i < Math.floor(averageRating) ? 'text-blue-500' : 'text-blue-200'}`}
                    />
                  ))}
                </div>
                <p className="text-blue-700 font-medium text-sm sm:text-base">Premium Rating</p>
              </div>
              
              {/* Total Reviews Card */}
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-10 sm:w-14 h-10 sm:h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 shadow-inner">
                  <FaUsers className="text-indigo-600 text-lg sm:text-xl" />
                </div>
                <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  {totalReviews}
                </div>
                <p className="text-blue-700 font-medium text-sm sm:text-base mt-2 sm:mt-3">Elite Reviews</p>
              </div>
              
              {/* Satisfaction Card */}
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-10 sm:w-14 h-10 sm:h-14 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 shadow-inner">
                  <FaHeart className="text-blue-500 text-lg sm:text-xl" />
                </div>
                <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {averageRating >= 4 ? "97%" : averageRating >= 3 ? "89%" : "75%"}
                </div>
                <p className="text-blue-700 font-medium text-sm sm:text-base mt-2 sm:mt-3">Love Our Service</p>
              </div>
              
              {/* VIP Card */}
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="inline-flex items-center justify-center w-10 sm:w-14 h-10 sm:h-14 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 shadow-inner">
                  <FaFire className="text-cyan-500 text-lg sm:text-xl" />
                </div>
                <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                  100%
                </div>
                <p className="text-blue-700 font-medium text-sm sm:text-base mt-2 sm:mt-3">VIP Experience</p>
              </div>
            </div>
            
            {/* Reviews Display */}
            <div className={`${showAllReviews ? 'h-[40rem]' : 'h-auto'} overflow-y-auto bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-blue-200 shadow-lg relative`}>
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-full"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                    <FaQuoteRight className="text-white text-sm sm:text-lg" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-blue-800">
                    {showAllReviews ? 'All Premium Reviews' : 'Featured Experiences'}
                  </h4>
                </div>
                
                {!showAllReviews && reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="group flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg text-xs sm:text-sm"
                  >
                    <span>View All</span>
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform text-xs" />
                  </button>
                )}
                
                {showAllReviews && (
                  <button
                    onClick={() => setShowAllReviews(false)}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 border border-blue-200 text-xs sm:text-sm"
                  >
                    <span>Show Less</span>
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
              
              {/* Review List - FLEX ROW LAYOUT */}
              <div className="space-y-4 sm:space-y-6">
                {displayedReviews.length > 0 ? (
                  displayedReviews.map((review) => (
                    <div key={review.id} className="group p-4 bg-gradient-to-r from-white to-blue-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">
                            {getUserInitials(review.userName)}
                          </div>
                          {/* Badge for high rating */}
                          {review.rating >= 4 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                              <FaStar className="text-white text-[8px]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col mb-1">
                            {/* Name and rating on same line */}
                            <div className="flex flex-row justify-between items-start">
                              <div className="flex flex-col">
                                <h5 className="font-bold text-blue-900 text-xs truncate">{review.userName}</h5>
                                <p className="text-blue-500 text-[10px]">{getTimeAgo(review.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar 
                                    key={i} 
                                    className={`text-xs ${i < review.rating ? 'text-blue-500' : 'text-blue-200'}`}
                                  />
                                ))}
                                <span className="ml-1 font-bold text-blue-700 text-xs">{review.rating}.0</span>
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-blue-300 to-cyan-300 rounded-full"></div>
                            <p className="text-blue-800 pl-2 italic text-xs leading-relaxed">"{review.comment}"</p>
                          </div>
                          
                          {user && user.uid === review.userId && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              <button
                                onClick={() => {
                                  setUserReview(review);
                                  setNewRating(review.rating);
                                  setNewComment(review.comment);
                                  setShowReviewForm(true);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200 text-[10px]"
                              >
                                <FaEdit className="text-[10px]" /> Edit
                              </button>
                              <button
                                onClick={handleDeleteReview}
                                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 rounded hover:from-red-100 hover:to-pink-100 transition-all duration-300 border border-red-200 text-[10px]"
                              >
                                <FaTrash className="text-[10px]" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <FaQuoteRight className="text-blue-400 text-lg" />
                    </div>
                    <h5 className="font-bold text-lg text-blue-800 mb-2">No Reviews Yet</h5>
                    <p className="text-blue-600 mb-4 max-w-md mx-auto text-xs">
                      Be the first to share your premium experience with us!
                    </p>
                    {user && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="group inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-xs"
                      >
                        <FaPlus className="group-hover:rotate-90 transition-transform duration-300 text-xs" />
                        <span className="font-bold">Share Your Experience</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Add Review Button */}
              {user && !showReviewForm && !userReview && reviews.length > 0 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="group inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-xs"
                  >
                    <FaPlus className="group-hover:rotate-90 transition-transform duration-300 text-xs" />
                    <span className="font-bold">Share Your Premium Experience</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Review Form */}
            {showReviewForm && (
              <div className="mt-6 bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200 shadow-2xl relative overflow-hidden">
                {/* Form background pattern */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-full"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-cyan-100 to-transparent rounded-tr-full"></div>
                
                <div className="relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                        <FaStar className="text-white text-sm" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-blue-900">
                          {userReview ? 'Edit Your Review' : 'Share Your Experience'}
                        </h5>
                        <p className="text-blue-600 text-[10px]">
                          {userReview ? 'Update your thoughts' : 'Help others discover our service'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowReviewForm(false);
                        if (!userReview) {
                          setNewComment("");
                          setNewRating(5);
                        }
                      }}
                      className="w-6 h-6 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 rounded hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 flex items-center justify-center shadow-sm self-end sm:self-auto"
                    >
                      <FaTimes className="text-[10px]" />
                    </button>
                  </div>
                  
                  {/* Star Rating */}
                  <div className="mb-4">
                    <label className="block text-blue-800 font-bold mb-2 text-xs">Rate Your Experience</label>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="group relative"
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center shadow transition-all duration-300 ${
                            star <= (hoverRating || newRating) 
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 transform scale-105' 
                              : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                          }`}>
                            <FaStar className={`text-sm transition-all duration-300 ${
                              star <= (hoverRating || newRating) ? 'text-white' : 'text-blue-300'
                            }`} />
                          </div>
                          <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {star} {star === 1 ? 'Star' : 'Stars'}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-blue-500">Poor</span>
                      <span className="text-[10px] text-blue-500">Excellent</span>
                    </div>
                  </div>
                  
                  {/* Review Text */}
                  <div className="mb-4">
                    <label className="block text-blue-800 font-bold mb-2 text-xs">Your Review</label>
                    <div className="relative">
                      <div className="absolute left-2 top-2 text-blue-300">
                        <FaQuoteRight className="text-[10px]" />
                      </div>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Describe your experience with Nomopo Car Hire..."
                        className="w-full px-6 py-3 bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all duration-300 resize-none shadow-inner text-xs"
                        rows={3}
                      />
                      <div className="absolute right-2 bottom-2 text-blue-300">
                        <FaQuoteRight className="rotate-180 text-[10px]" />
                      </div>
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] ${newComment.length > 500 ? 'text-red-500' : 'text-blue-500'}`}>
                        {newComment.length}/500 characters
                      </span>
                    </div>
                  </div>
                  
                  {/* Submit Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowReviewForm(false);
                        if (!userReview) {
                          setNewComment("");
                          setNewRating(5);
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 border border-blue-200 font-medium shadow-sm text-xs order-2 sm:order-1"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={isSubmitting || !newComment.trim()}
                      className="group px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-bold shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs order-1 sm:order-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : userReview ? (
                        <>
                          <FaCheck className="text-xs" /> Update Review
                        </>
                      ) : (
                        <>
                          <FaGem className="group-hover:rotate-180 transition-transform duration-500 text-xs" />
                          Submit Review
                        </>
                      )}
                    </button>
                  </div>
                  
                  {!user && (
                    <div className="mt-3 text-center">
                      <p className="text-blue-600 text-xs">
                        Please <Link href="/login" className="text-blue-500 hover:text-blue-600 font-bold underline">sign in</Link> to share your experience
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Original Footer Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 border-t border-gray-300 py-8">
          {/* Branding */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 tracking-wide">
              Nomopo Car Hire
            </h2>
            <p className="text-gray-600 mt-2 leading-relaxed text-xs sm:text-sm">
              Nigeria's safest and simplest way to hire professional drivers
              and book reliable transportation.  
              Comfort • Safety • Transparency — every single ride.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Navigation</h3>
            <ul className="flex flex-col gap-2 text-gray-700">
              <FooterLink href="/" label="Home" icon={<FaHome />} />
              <FooterLink href="/about" label="About" icon={<FaInfoCircle />} />
              
              {!user && (
                <FooterLink href="/signup" label="Sign Up" icon={<FaUserPlus />} />
              )}
              
              {user && (
                <FooterLink 
                  href={isDriver ? `/user/driver-profile/${user.uid}` : `/user/profile/${user.uid}`} 
                  label="Dashboard" 
                  icon={<FaTachometerAlt />} 
                  disabled={loading}
                />
              )}
              {user && (<FooterLink href="/user/chat" label="Chat" icon={<FaRegCommentDots />} />)}
              
              <FooterLink href="/policy" label="Policy" icon={<FaInfoCircle />} />
              <FooterLink href="/user/car-hire" label="Hire a Car" icon={<FaCar />} />
              <FooterLink 
                href="mailto:nomopoventures@yahoo.com" 
                label="Contact Us" 
                icon={<FaMobileAlt />} 
                isExternal={true}
              />
            </ul>
          </div>

          {/* Account */}
          <div className="flex flex-col items-start sm:items-end">
            <h3 className="p-2 text-sm sm:text-base font-semibold text-gray-900 mb-3">Account</h3>

            {user ? (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                <FaSignOutAlt /> 
                {loading ? "Processing..." : "Logout"}
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition-all duration-300 text-xs sm:text-sm"
              >
                <FaSignInAlt /> Login
              </Link>
            )}

            {user && (
              <div className="p-2 mt-6 sm:mt-8 underline text-gray-700 text-xs sm:text-sm">
                <Link href="/delete-account">Delete Account</Link>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-gray-300"></div>

        {/* Bottom */}
        <div className="flex flex-col text-center sm:flex-row justify-between text-gray-700 text-xs">
          <p>
            © {new Date().getFullYear()}  
            <span className="font-semibold"> Nomopo Ventures</span>.  
            All rights reserved.
          </p>
          <p className="mt-1 sm:mt-0">
            Last Updated:{" "}
            <span className="font-semibold text-gray-900">{lastUpdated}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* Footer Link Component */
interface FooterLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  isExternal?: boolean;
}

function FooterLink({ href, label, icon, disabled = false, isExternal = false }: FooterLinkProps) {
  if (disabled) {
    return (
      <li className="opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-sm">{icon}</span>
          <span className="font-medium text-xs">{label}</span>
        </div>
      </li>
    );
  }

  if (isExternal || href.startsWith('http') || href.startsWith('mailto:')) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 relative group transition"
        >
          <span className="absolute -left-2 h-5 w-5 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></span>
          <span className="text-sm z-10">{icon}</span>
          <span className="z-10 font-medium text-xs">{label}</span>
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 relative group transition"
      >
        <span className="absolute -left-2 h-5 w-5 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></span>
        <span className="text-sm z-10">{icon}</span>
        <span className="z-10 font-medium text-xs">{label}</span>
      </Link>
    </li>
  );
}