"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth"
import { toast, Toaster } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"

// VIP Configuration
const VIP_CONFIG = {
  levels: [
    { level: 1, name: "Green VIP", color: "green", stars: 1, referralsRequired: 15, price: 5000 },
    { level: 2, name: "Yellow VIP", color: "yellow", stars: 2, referralsRequired: 20, price: 7500 },
    { level: 3, name: "Purple VIP", color: "purple", stars: 3, referralsRequired: 25, price: 11000 },
    { level: 4, name: "Gold VIP", color: "gold", stars: 4, referralsRequired: 30, price: 15000 },
    { level: 5, name: "Black VIP", color: "black", stars: 5, referralsRequired: 35, price: 20000 },
  ],
  maxLevel: 5,
  referralMultiplier: 5,
}

export default function PurchasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{level: number, name: string, price: number} | null>(null)

  const [benefit, showBenefit] = useState(false)

  useEffect(() => {
    const levelFromUrl = searchParams.get("level")
    if (levelFromUrl) {
      const level = parseInt(levelFromUrl)
      if (level >= 1 && level <= 5) {
        setSelectedLevel(level)
      }
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error("Please log in to purchase VIP")
        router.push(`/login?redirect=${encodeURIComponent('/purchase')}`)
        return
      }

      setUserId(user.uid)
      
      try {
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data()
          setUserData(data)
          
          if (!levelFromUrl && data.purchasedVipLevel) {
            setSelectedLevel(data.purchasedVipLevel)
          }
        } else {
          toast.error("User data not found")
          router.push("/login")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load user data")
        router.push("/login")
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, searchParams])

  const initiatePurchase = (level: number) => {
    const vipLevel = VIP_CONFIG.levels.find(l => l.level === level)
    if (!vipLevel) {
      toast.error("Invalid VIP level")
      return
    }

    setConfirmationData({
      level: vipLevel.level,
      name: vipLevel.name,
      price: vipLevel.price
    })
    setShowConfirmation(true)
  }

  const handlePurchase = async () => {
    if (!confirmationData || processing || !userId) return

    setProcessing(true)
    setShowConfirmation(false)
    
    try {
      const userRef = doc(db, "users", userId)
      const now = new Date()
      const expiryDate = new Date(now)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)

      const userSnap = await getDoc(userRef)
      const currentData = userSnap.data()
      
      let newExpiryDate = expiryDate
      let newPurchaseDate = now

      if (currentData?.vipExpiryDate && currentData.vipExpiryDate.toDate() > now) {
        const currentExpiry = currentData.vipExpiryDate.toDate()
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)
        newExpiryDate = currentExpiry
        newPurchaseDate = currentData.vipPurchaseDate?.toDate() || now
      }

      const paymentId = `PAY-${Date.now()}`
      const newPurchaseRecord = {
        level: confirmationData.level,
        paymentId: paymentId,
        price: confirmationData.price,
        purchaseDate: Timestamp.fromDate(now),
        previousLevel: currentData?.purchasedVipLevel || 0
      }

      const existingHistory = currentData?.vipPurchaseHistory || []
      const updatedHistory = [...existingHistory, newPurchaseRecord]

      await updateDoc(userRef, {
        purchasedVipLevel: confirmationData.level,
        vipLevel: confirmationData.level,
        vipPurchaseDate: Timestamp.fromDate(newPurchaseDate),
        vipExpiryDate: Timestamp.fromDate(newExpiryDate),
        vipPurchaseHistory: updatedHistory,
        updatedAt: Timestamp.now()
      })

      toast.success(`🎉 Successfully purchased ${confirmationData.name}! Valid for 1 year.`)
      
      setTimeout(() => {
        if (currentData?.isDriver) {
          router.push(`/user/driver-profile/${userId}?purchaseSuccess=true`)
        } else {
          router.push(`/user/profile/${userId}?purchaseSuccess=true`)
        }
      }, 2000)

    } catch (error) {
      console.error("Error processing purchase:", error)
      toast.error("Failed to process purchase")
    } finally {
      setProcessing(false)
      setConfirmationData(null)
    }
  }

  const cancelPurchase = () => {
    setShowConfirmation(false)
    setConfirmationData(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingRound />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <Toaster position="top-right" />
      
      {/* Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 md:p-6 animate-scaleIn">
            <div className="text-center mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">₦</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Purchase</h3>
              <p className="text-sm md:text-base text-gray-600">Are you sure you want to purchase this VIP package?</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-2 md:p-4 mb-6">
              <div className="text-sm md:text-base flex justify-between items-center mb-3">
                <span className="text-gray-600">VIP Package:</span>
                <span className="font-semibold text-gray-900">{confirmationData.name}</span>
              </div>
              <div className="text-sm md:text-base flex justify-between items-center mb-3">
                <span className="text-gray-600">Amount:</span>
                <span className="text-lg md:text-xl font-bold text-gray-900">₦{confirmationData.price.toLocaleString()}</span>
              </div>
              <div className="text-sm md:text-base flex justify-between items-center">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-gray-900">1 Year</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelPurchase}
                disabled={processing}
                className="text-sm md:text-base flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={processing}
                className="text-sm md:text-base flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Yes, Proceed'}
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              By proceeding, you agree to our Terms of Service
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <div className="flex flex-col gap-4 justify-between items-start mb-6">
            <div className="w-full flex gap-6 justify-between items-start">
              <div>
                <h1 className="text-xl md:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Upgrade Your VIP Status
                </h1>
                <p className="text-xs md:text-sm text-base text-gray-600">
                  Purchase VIP status to get more vehicles, priority in search results, and exclusive benefits
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="cursor-pointer text-sm md:text-base text-gray-600 hover:text-gray-800 font-medium px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
            </div>
            <p className="md:hidden cursor-pointer text-blue-600 font-semibold" onClick={()=> showBenefit(!benefit)}>{benefit? "Close": "Learn More!!!"}</p>
            {benefit && <div className="md:hidden bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 shadow-lg">
              <h2 className="md:text-xl font-bold text-purple-800 mb-4">🚀 Why Upgrade to VIP?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-purple-600">🏆</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">Priority in Search</h3>
                  <p className="text-xs md:text-sm text-gray-600">Appear at the TOP when customers search for drivers</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-green-600">🚗</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">More Vehicles</h3>
                  <p className="text-xs md:text-sm text-gray-600">Add up to 10 vehicles (VIP 1-3) or unlimited (VIP 4-5)</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-yellow-600">💎</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">Exclusive Badge</h3>
                  <p className="text-xs md:text-sm text-gray-600">Stand out with VIP badge that builds trust with customers</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-blue-600">📈</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">Higher Earnings</h3>
                  <p className="text-xs md:text-sm text-gray-600">Get more bookings with premium positioning and visibility</p>
                </div>
              </div>
            </div>
            }
            <div className="hidden md:block bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 shadow-lg">
              <h2 className="md:text-xl font-bold text-purple-800 mb-4">🚀 Why Upgrade to VIP?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-purple-600">🏆</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">Priority in Search</h3>
                  <p className="text-xs md:text-sm text-gray-600">Appear at the TOP when customers search for drivers</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-green-600">🚗</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">More Vehicles</h3>
                  <p className="text-xs md:text-sm text-gray-600">Add up to 10 vehicles (VIP 1-3) or unlimited (VIP 4-5)</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-yellow-600">💎</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">Exclusive Badge</h3>
                  <p className="text-xs md:text-sm text-gray-600">Stand out with VIP badge that builds trust with customers</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-blue-600">📈</span>
                  </div>
                  <h3 className="font-semibold text-xs md:text-sm text-gray-800 mb-1">Higher Earnings</h3>
                  <p className="text-xs md:text-sm text-gray-600">Get more bookings with premium positioning and visibility</p>
                </div>
              </div>
            </div>
          </div>

          {userData && (
            <div className="bg-white rounded-xl shadow p-3 mb-8">
              <h2 className="md:text-lg font-semibold text-gray-800 mb-3">Your Current Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-sm text-gray-600">VIP Level</p>
                  <p className="text-sm md:text-base font-bold text-gray-900">
                    {userData.vipLevel > 0 ? `Level ${userData.vipLevel}` : "No VIP"}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-sm text-gray-600">Referrals</p>
                  <p className="text-sm md:text-base font-bold text-gray-900">
                    {userData.referralCount || 0}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2">
                  <p className="text-sm text-gray-600">VIP Expiry</p>
                  <p className="text-sm md:text-base font-bold text-gray-900">
                    {userData.vipExpiryDate 
                      ? new Date(userData.vipExpiryDate.toDate()).toLocaleDateString()
                      : "No VIP"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {VIP_CONFIG.levels.map((level) => {
              const isCurrentLevel = userData?.purchasedVipLevel === level.level
              const isSelected = selectedLevel === level.level
              
              return (
                <div
                  key={level.level}
                  className={`bg-white rounded-xl shadow border overflow-hidden transition-all duration-300 ${
                    isSelected ? 'border-blue-500 border-2 scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
                  } ${isCurrentLevel ? 'border-green-500' : ''}`}
                >
                  <div 
                    className={`h-2 ${
                      level.color === 'green' ? 'bg-green-500' :
                      level.color === 'yellow' ? 'bg-yellow-500' :
                      level.color === 'purple' ? 'bg-purple-500' :
                      level.color === 'gold' ? 'bg-yellow-600' :
                      'bg-gray-900'
                    }`}
                  />
                  
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{level.name}</h3>
                        <p className="text-sm text-gray-600">Level {level.level}</p>
                      </div>
                      <div className="flex">
                        {Array.from({ length: level.stars }).map((_, i) => (
                          <span key={i} className="text-yellow-400">⭐</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="text-base flex justify-between">
                        <span className="text-sm md:text-base text-gray-600">Price:</span>
                        <span className="font-bold text-gray-900">
                          ₦{level.price.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-base flex justify-between">
                        <span className="text-sm md:text-base text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-900">1 Year</span>
                      </div>
                      
                      <div className="text-base flex justify-between">
                        <span className="text-sm md:text-base text-gray-600">Vehicles:</span>
                        <span className="font-medium text-gray-900">
                          {level.level <= 3 ? 'Up to 10' : 'Unlimited'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedLevel(level.level)}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Select This Plan'}
                      </button>

                      <button
                        onClick={() => initiatePurchase(level.level)}
                        disabled={processing || (isCurrentLevel && userData?.vipExpiryDate?.toDate() > new Date())}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          isCurrentLevel && userData?.vipExpiryDate?.toDate() > new Date()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                        }`}
                      >
                        {processing
                          ? 'Processing...'
                          : isCurrentLevel && userData?.vipExpiryDate?.toDate() > new Date()
                          ? 'Already Active'
                          : 'Purchase Now'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-8 border border-blue-200">
            <h2 className="md:text-xl text-center md:text-left font-semibold text-gray-800 mb-4">Complete Your Purchase</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm md:text-base">Selected Plan:</span>
                <span className="font-semibold text-sm md:text-lg text-gray-900">
                  {VIP_CONFIG.levels.find(l => l.level === selectedLevel)?.name || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm md:text-base">Amount:</span>
                <span className="text-xl md:text-2xl font-bold text-gray-900">
                  ₦{VIP_CONFIG.levels.find(l => l.level === selectedLevel)?.price.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm md:text-base">Duration:</span>
                <span className="font-medium text-sm md:text-base text-gray-900">1 Year (365 days)</span>
              </div>
              <div className="pt-4 border-t border-blue-200">
                <button
                  onClick={() => initiatePurchase(selectedLevel)}
                  disabled={processing}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold text-sm md:text-base hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {processing ? 'Processing Purchase...' : 'Complete Purchase Now'}
                </button>
                <p className="text-center text-xs md:text-sm text-gray-500 mt-3">
                  By purchasing, you agree to our Terms of Service. Your VIP status will be activated immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-3 md:p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">FAQ</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                  <span className="mr-2">❓</span> What happens when my VIP expires?
                </h3>
                <p className="text-sm text-gray-700">
                  Your VIP level will reset to 0, and you'll lose all VIP benefits including priority search placement, vehicle limits, and exclusive badge. You can renew anytime to restore your benefits.
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                  <span className="mr-2">🎯</span> How does VIP help me get more customers?
                </h3>
                <p className="text-sm text-gray-700">
                  VIP drivers appear <strong>FIRST</strong> in search results when customers look for drivers. Higher VIP levels get even better placement. This means more visibility and more bookings!
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center">
                  <span className="mr-2">🔄</span> Can I get VIP through referrals instead of payment?
                </h3>
                <p className="text-sm text-gray-700">
                  Yes! You can reach VIP levels through referrals alone. Each level requires a certain number of referrals. However, referral-based VIP also expires after 1 year and needs to be maintained.
                </p>
              </div>
              
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
                  <span className="mr-2">⏰</span> What if I purchase a higher VIP level than my current one?
                </h3>
                <p className="text-sm text-gray-700">
                  Your VIP level will upgrade immediately to the purchased level. Your expiry date will be extended by 1 year from your current expiry date (or from today if you have no active VIP).
                </p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                  <span className="mr-2">💰</span> Is there a refund policy?
                </h3>
                <p className="text-sm text-gray-700">
                  VIP purchases are non-refundable. Once activated, your VIP status cannot be reversed. Please choose your level carefully.
                </p>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center">
                  <span className="mr-2">🚗</span> What are the vehicle limits for each VIP level?
                </h3>
                <p className="text-sm text-gray-700">
                  <strong>Regular Driver:</strong> 2 vehicles max • <strong>VIP 1-3:</strong> 10 vehicles max • <strong>VIP 4-5:</strong> Unlimited vehicles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => router.back()}
          className="text-sm md:text-base text-gray-600 hover:text-gray-800 font-medium px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          CLOSE
        </button>
      </div>

      {/* Add CSS for animation */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>

    </div>
  )
}