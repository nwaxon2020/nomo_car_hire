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

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired"
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (days > 0)
    return days + "d " + String(hours).padStart(2, "0") + "h " + String(mins).padStart(2, "0") + "m"
  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0")
}

export default function PurchasePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [selectedLevelData, setSelectedLevelData] = useState<any>(null)
  const [adminConfig, setAdminConfig] = useState<any>(null)
  const [benefit, showBenefit] = useState(false)

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }
      setUserId(user.uid)
      try {
        const [userSnap, configSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "adminConfig", "pricing"))
        ])
        if (userSnap.exists()) setUserData(userSnap.data())
        if (configSnap.exists()) setAdminConfig(configSnap.data())
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

  const vipValidityDays = adminConfig?.vip?.validityDays ?? 365
  const vipWarningMs = (adminConfig?.vip?.warningDays ?? 30) * 24 * 60 * 60 * 1000

  const dynamicVips = VIP_CONFIG.levels.map((lvl) => {
    const customPrice = adminConfig?.vip?.prices?.[lvl.level]
    return {
      ...lvl,
      price: customPrice ?? lvl.price
    }
  })

  const handleFinalPurchase = async () => {
    if (!selectedLevelData || processing || !userId) return
    setProcessing(true)

    try {
      const userRef = doc(db, "users", userId)
      const nowTime = new Date()
      const expiryDate = new Date(nowTime)
      expiryDate.setDate(expiryDate.getDate() + vipValidityDays)

      // Calculate expiry extension
      let finalExpiry = expiryDate
      if (userData?.vipExpiryDate && userData.vipExpiryDate.toDate() > nowTime) {
        const currentExpiry = userData.vipExpiryDate.toDate()
        currentExpiry.setDate(currentExpiry.getDate() + vipValidityDays)
        finalExpiry = currentExpiry
      }

      await triggerNotification(
        userId,
        "VIP Upgrade Successful 🎉",
        `Congratulations! Your account has been upgraded to ${selectedLevelData.name}. Your benefits are now active.`,
        "success"
      )

      await updateDoc(userRef, {
        vip: true,
        vipLevel: selectedLevelData.level,
        purchasedVipLevel: selectedLevelData.level,
        vipPurchaseDate: Timestamp.fromDate(nowTime),
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
    <div className="mx-auto max-w-5xl h-[100vh] bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
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
                  <span className="font-medium text-gray-900">{vipValidityDays} Days</span>
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
          {dynamicVips.map((level) => {
            // Logic to check if this level is already owned or surpassed
            const currentVipLevel = userData?.vipLevel || 0;
            const isOwnedOrLower = currentVipLevel >= level.level;
            const isExactLevel = currentVipLevel === level.level;

            // Check for countdown warning
            let remainingMs = 0
            if (isExactLevel && userData?.vipExpiryDate) {
              remainingMs = userData.vipExpiryDate.toDate().getTime() - now.getTime()
            }
            const inWarning = isExactLevel && remainingMs > 0 && remainingMs <= vipWarningMs

            return (
              <div
                key={level.level}
                className={`bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden transition-all flex flex-col relative ${isOwnedOrLower ? "opacity-60 grayscale-[0.5]" : "hover:shadow-xl"
                  }`}
              >
                <div className={`h-2 ${level.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <div className={`p-5 flex-1 flex flex-col ${isOwnedOrLower ? "blur-[1px]" : ""}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{level.name}</h3>
                    <div className="flex">{Array.from({ length: level.stars }).map((_, i) => <span key={i}>⭐</span>)}</div>
                  </div>

                  <div className="mb-6 space-y-2">
                    <p className="text-3xl font-black text-gray-900">₦{level.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">For {vipValidityDays} Days</p>
                  </div>

                  <ul className="text-sm text-gray-600 space-y-3 mb-8 flex-1">
                    <li className="flex items-center">✅ {level.level <= 3 ? '10' : 'Unlimited'} Vehicles Max</li>
                    <li className="flex items-center">✅ Priority Search Listing</li>
                    <li className="flex items-center">✅ VIP Profile Badge</li>
                  </ul>

                  {inWarning ? (
                    <>
                      <div className="w-full py-3.5 mb-2 rounded-2xl text-center bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg">
                        <p className="text-[10px] font-bold tracking-widest opacity-80 mb-0.5">⚠ Expires In</p>
                        <p className="font-mono text-xl font-black leading-none tabular-nums">
                          {formatCountdown(remainingMs)}
                        </p>
                      </div>
                      <button
                        onClick={() => openOverlay(level)}
                        className={`w-full py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gray-900 text-white shadow-md hover:bg-black active:scale-95`}
                      >
                        Renew VIP
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openOverlay(level)}
                      disabled={isOwnedOrLower}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${isOwnedOrLower
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black active:scale-95'
                        }`}
                    >
                      {isExactLevel ? 'Current Plan' : isOwnedOrLower ? 'Purchased' : 'Purchase Now'}
                    </button>
                  )}
                </div>

                {/* Visual indicator for current/passed plans */}
                {isOwnedOrLower && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-white/80 px-4 py-1 rounded-full text-xs font-bold text-gray-600 border border-gray-200 shadow-sm">
                      {isExactLevel ? "ACTIVE" : "COMPLETED"}
                    </span>
                  </div>
                )}
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