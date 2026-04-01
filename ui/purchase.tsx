"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth"
import { toast, Toaster } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"
// Import the notification helper used in your admin card
import { triggerNotification } from "@/lib/notifications"

const VIP_CONFIG = {
  levels: [
    { level: 1, name: "Green VIP", color: "green", stars: 1, price: 5000 },
    { level: 2, name: "Yellow VIP", color: "yellow", stars: 2, price: 7500 },
    { level: 3, name: "Purple VIP", color: "purple", stars: 3, price: 11000 },
    { level: 4, name: "Gold VIP", color: "gold", stars: 4, price: 15000 },
    { level: 5, name: "Black VIP", color: "black", stars: 5, price: 20000 },
  ],
}

export default function PurchasePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [selectedLevelData, setSelectedLevelData] = useState<any>(null)
  const [benefit, showBenefit] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }
      setUserId(user.uid)
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid))
        if (userSnap.exists()) setUserData(userSnap.data())
      } finally {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [router])

  const openOverlay = (levelConfig: any) => {
    setSelectedLevelData(levelConfig)
    setShowOverlay(true)
  }

  const handleFinalPurchase = async () => {
    if (!selectedLevelData || processing || !userId) return
    setProcessing(true)

    try {
      const userRef = doc(db, "users", userId)
      const now = new Date()
      const expiryDate = new Date(now)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)

      // Calculate expiry extension
      let finalExpiry = expiryDate
      if (userData?.vipExpiryDate && userData.vipExpiryDate.toDate() > now) {
        const currentExpiry = userData.vipExpiryDate.toDate()
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)
        finalExpiry = currentExpiry
      }

      // 1. Send Notification using the shared helper (matches Admin style)
      // This ensures the notification is added correctly to the user's collection
      await triggerNotification(
        userId,
        "VIP Upgrade Successful 🎉",
        `Congratulations! Your account has been upgraded to ${selectedLevelData.name}. Your benefits are now active.`,
        "success"
        // No viewLink included as requested
      )

      // 2. Update the User Document with VIP details
      await updateDoc(userRef, {
        vip: true,
        vipLevel: selectedLevelData.level,
        purchasedVipLevel: selectedLevelData.level,
        vipPurchaseDate: Timestamp.fromDate(now),
        vipExpiryDate: Timestamp.fromDate(finalExpiry),
        updatedAt: Timestamp.now()
      })

      toast.success(`🎉 ${selectedLevelData.name} Activated!`)

      setTimeout(() => {
        const path = userData?.isDriver ? `/user/driver-profile/${userId}` : `/user/profile/${userId}`
        router.push(`${path}?purchaseSuccess=true`)
      }, 2000)

    } catch (error) {
      console.error("Purchase Error:", error)
      toast.error("Purchase failed. Please try again.")
    } finally {
      setProcessing(false)
      setShowOverlay(false)
    }
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen"><LoadingRound /></div>

  return (
    <div className="mx-auto max-w-[1100px] min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <Toaster position="top-right" />

      {/* PURCHASE OVERLAY DIV */}
      {showOverlay && selectedLevelData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            <div className={`h-2 ${selectedLevelData.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`} />
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Complete Purchase</h3>
              <p className="text-gray-600 text-center mb-6">Review your VIP selection below</p>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-bold text-gray-900">{selectedLevelData.name}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-500">Price</span>
                  <span className="font-bold text-xl text-green-600">₦{selectedLevelData.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-500">Validity</span>
                  <span className="font-medium text-gray-900">365 Days (1 Year)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOverlay(false)}
                  disabled={processing}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalPurchase}
                  disabled={processing}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN UI CONTENT */}
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Upgrade Your VIP Status</h1>
            <p className="text-sm text-gray-600">Get priority placement and more features.</p>
          </div>

          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline font-semibold text-sm">Go Back</span>
          </button>
        </header>

        <p className="md:hidden cursor-pointer text-blue-600 font-semibold mb-4" onClick={() => showBenefit(!benefit)}>
          {benefit ? "Close Info" : "🚀 Why Upgrade to VIP?"}
        </p>

        <div className={`${benefit ? 'block' : 'hidden'} md:block w-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 shadow-lg mb-8`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <BenefitItem icon="🏆" title="Priority" desc="Top search placement." />
            <BenefitItem icon="🚗" title="Vehicles" desc="Up to 10 or Unlimited." />
            <BenefitItem icon="💎" title="Badge" desc="Trusted VIP status." />
            <BenefitItem icon="📈" title="Growth" desc="More customer bookings." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {VIP_CONFIG.levels.map((level) => {
            const isActive = userData?.purchasedVipLevel === level.level && userData?.vipExpiryDate?.toDate() > new Date()

            return (
              <div
                key={level.level}
                className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all flex flex-col"
              >
                <div className={`h-2 ${level.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{level.name}</h3>
                    <div className="flex">{Array.from({ length: level.stars }).map((_, i) => <span key={i}>⭐</span>)}</div>
                  </div>

                  <div className="mb-6 space-y-2">
                    <p className="text-3xl font-black text-gray-900">₦{level.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Per Year</p>
                  </div>

                  <ul className="text-sm text-gray-600 space-y-3 mb-8 flex-1">
                    <li className="flex items-center">✅ {level.level <= 3 ? '10' : 'Unlimited'} Vehicles Max</li>
                    <li className="flex items-center">✅ Priority Search Listing</li>
                    <li className="flex items-center">✅ VIP Profile Badge</li>
                  </ul>

                  <button
                    onClick={() => openOverlay(level)}
                    disabled={isActive}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black active:scale-95'}`}
                  >
                    {isActive ? 'Current Plan' : 'Purchase Now'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>
    </div>
  )
}

function BenefitItem({ icon, title, desc }: any) {
  return (
    <div className="bg-white p-3 rounded-lg border border-purple-100">
      <p className="text-xl mb-1">{icon}</p>
      <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  )
}