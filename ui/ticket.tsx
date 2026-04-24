"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, updateDoc, getDoc, Timestamp, setDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"
import { triggerNotification } from "@/lib/notifications"
import PaymentSection from "@/components/Payment"
import SuccessModal from "@/components/SuccessModal"

const TICKET_CONFIG = [
  {
    level: 1,
    name: "Daily Ticket",
    type: "daily",
    price: 200,
    duration: "1 Day",
    durationDays: 1,
    icon: "🎫",
    color: "from-blue-400 to-cyan-500",
    glow: "shadow-blue-500/30",
    warningMs: 3 * 60 * 60 * 1000,
    accent: "#3b82f6",
    perks: ["24-hour access", "Single day coverage", "Instant activation"],
    badge: "Quick Access",
  },
  {
    level: 2,
    name: "Weekly Ticket",
    type: "weekly",
    price: 1000,
    duration: "7 Days",
    durationDays: 7,
    icon: "🗓️",
    color: "from-indigo-500 to-purple-600",
    glow: "shadow-indigo-500/30",
    warningMs: 2 * 24 * 60 * 60 * 1000,
    accent: "#6366f1",
    perks: ["7-day full access", "Best for regular users", "Priority support"],
    badge: "Most Popular",
    featured: true,
  },
  {
    level: 3,
    name: "Monthly Ticket",
    type: "monthly",
    price: 2000,
    duration: "30 Days",
    durationDays: 30,
    icon: "💎",
    color: "from-violet-600 to-pink-600",
    glow: "shadow-violet-500/30",
    warningMs: 4 * 24 * 60 * 60 * 1000,
    accent: "#7c3aed",
    perks: ["30-day full access", "Maximum value plan", "VIP priority support"],
    badge: "Best Value",
  },
]

export default function TicketPage() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<(typeof TICKET_CONFIG)[0] | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [adminConfig, setAdminConfig] = useState<any>(null)

  useEffect(() => {
    const targetUserId = searchParams.get('userId')

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }
      
      let uidToUse = targetUserId || user.uid
      if (typeof window !== "undefined") {
        const fallbackId = new URLSearchParams(window.location.search).get("userId")
        if (fallbackId) uidToUse = fallbackId
      }
      setUserId(uidToUse)
      
      try {
        const userSnap = await getDoc(doc(db, "users", uidToUse))
        if (userSnap.exists()) {
          setUserData(userSnap.data())
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      }

      try {
        const configSnap = await getDoc(doc(db, "adminfinance", "pricing"))
        if (configSnap.exists()) {
          setAdminConfig(configSnap.data())
        }
      } catch (err) {
        console.error("Error fetching admin config:", err)
      }

      setLoading(false)
    })
    return () => unsubscribe()
  }, [router, searchParams])

  const dynamicTickets = TICKET_CONFIG.map((t) => {
    const custom = adminConfig?.tickets?.[t.type]
    if (!custom) return t
    return {
      ...t,
      price: custom.price ?? t.price,
      durationDays: custom.durationDays ?? t.durationDays,
      duration: `${custom.durationDays ?? t.durationDays} Days`,
      warningMs: custom.warningHours ? custom.warningHours * 60 * 60 * 1000 : t.warningMs
    }
  })

  // Check if driver is in new driver free trial period
  const isNewDriver = () => {
    if (!userData?.newDriverConfig?.isNew) return false
    if (!userData?.newDriverConfig?.registeredAt) return false
    
    const registeredAt = userData.newDriverConfig.registeredAt.toDate?.() || new Date(userData.newDriverConfig.registeredAt)
    const freeTrialDays = adminConfig?.newDriver?.freeTrialDays || 60
    const trialEndDate = new Date(registeredAt)
    trialEndDate.setDate(trialEndDate.getDate() + freeTrialDays)
    
    return new Date() < trialEndDate
  }

  // Get time left in new driver trial
  const getNewDriverTimeLeft = () => {
    if (!userData?.newDriverConfig?.isNew || !userData?.newDriverConfig?.registeredAt) return null
    
    const registeredAt = userData.newDriverConfig.registeredAt.toDate?.() || new Date(userData.newDriverConfig.registeredAt)
    const freeTrialDays = adminConfig?.newDriver?.freeTrialDays || 60
    const trialEndDate = new Date(registeredAt)
    trialEndDate.setDate(trialEndDate.getDate() + freeTrialDays)
    
    const now = new Date()
    const diffMs = trialEndDate.getTime() - now.getTime()
    
    if (diffMs <= 0) return null
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Check if we should show unblur option (within warning period)
  const shouldShowPurchaseOption = () => {
    const daysLeft = getNewDriverTimeLeft()
    if (daysLeft === null) return true
    const warningDays = adminConfig?.newDriver?.warningDays || 5
    return daysLeft <= warningDays
  }

  const openOverlay = (ticket: (typeof TICKET_CONFIG)[0]) => {
    setSelectedTicket(ticket)
    setShowOverlay(true)
  }

  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    import("@/lib/paystack").then((m) => m.loadPaystackScript());
  }, []);

  const handlePurchase = async (level: number) => {
    const ticket = dynamicTickets.find((t) => t.level === level)
    if (!ticket || processing || !userId || !userData) return
    setProcessing(true)

    try {
      const { initiatePaystackPayment } = await import("@/lib/paystack");

      await initiatePaystackPayment({
        email: userData.email || `${userId}@nomo.com`,
        amount: ticket.price,
        metadata: {
          userId,
          type: 'ticket',
          ticketType: ticket.type,
          ticketName: ticket.name
        },
        onSuccess: (response: any) => {
          setProcessing(false);
          setShowOverlay(false);
          setShowSuccess(true);
          toast.success("Ticket purchased! Activating...");
        },
        onClose: () => {
          setProcessing(false);
        }
      });
    } catch (error) {
      console.error("Ticket Purchase Error:", error)
      toast.error("Purchase failed. Please try again.")
      setProcessing(false)
    }
  }

  const isTicketActive = (ticket: (typeof TICKET_CONFIG)[0]) => {
    return (
      userData?.hasActiveTicket &&
      userData?.ticketType === ticket.type &&
      userData?.ticketExpiryDate?.toDate() > new Date()
    )
  }

  const getExpiryDisplay = (ticket: (typeof TICKET_CONFIG)[0]) => {
    if (!isTicketActive(ticket)) return null
    const expiry = userData.ticketExpiryDate.toDate()
    return expiry.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Get the most recent non-expired ticket entry from the array for a given type
  const getActiveTicket = (type: string) => {
    const tickets: any[] = userData?.tickets || []
    return (
      tickets
        .filter((t) => t.type === type && !t.expired && t.expiryDate?.toDate() > new Date())
        .sort((a, b) => (b.purchaseDate?.toDate()?.getTime() ?? 0) - (a.purchaseDate?.toDate()?.getTime() ?? 0))[0] ?? null
    )
  }

  const getRemainingMs = (type: string): number => {
    const t = getActiveTicket(type)
    if (!t) return 0
    return t.expiryDate.toDate().getTime() - new Date().getTime()
  }

  const isInWarningWindow = (type: string, warningMs: number): boolean => {
    const remaining = getRemainingMs(type)
    return remaining > 0 && remaining <= warningMs
  }

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#050d1a]">
        <LoadingRound />
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050d1a] via-[#0a1628] to-[#0d1f3c] relative overflow-hidden">


      {/* Ambient background orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Confirmation Overlay */}
      {showOverlay && selectedTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn">
            {/* Gradient header strip */}
            <div className={`h-2 bg-gradient-to-r ${selectedTicket.color}`} />

            {/* Payment section */}
            <div className="p-6">
              <div className="flex items-center justify-center gap-3 mb-5">
                <span className="text-4xl">{selectedTicket.icon}</span>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Confirm Purchase</h3>
                  <p className="text-gray-500 text-sm">Review your ticket selection</p>
                </div>
              </div>

              <PaymentSection
                selectedLevelData={{
                  level: selectedTicket.level,
                  name: selectedTicket.name,
                  price: selectedTicket.price,
                }}
                processing={processing}
                onInitiate={handlePurchase}
                duration={selectedTicket.duration}
              />

              <button
                onClick={() => setShowOverlay(false)}
                disabled={processing}
                className="w-full mt-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-10">

        {/* Header */}
        <div className="flex justify-between items-start mb-8 md:mb-10">
          <div>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">
              Nomopo Pass
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Get Your
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Access Ticket
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-sm">
              Choose a plan that works for you and enjoy seamless access on Nomopo.
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 hover:border-blue-400/40 hover:text-blue-300 transition-all duration-200 active:scale-95 backdrop-blur-sm"
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
        </div>

        {/* Active ticket banner */}
        {userData?.hasActiveTicket && userData?.ticketExpiryDate?.toDate() > new Date() && (
          <div className="mb-8 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl flex-shrink-0">
              ✅
            </div>
            <div>
              <p className="text-emerald-400 font-bold text-sm">Active Ticket</p>
              <p className="text-slate-300 text-xs">
                Your <span className="font-semibold text-white">{userData.ticketName}</span> is active until{" "}
                <span className="font-semibold text-emerald-400">
                  {userData.ticketExpiryDate.toDate().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* FREE TICKET BANNER FOR NEW DRIVERS */}
        {isNewDriver() && (
          <div className="mb-8 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/10 border border-green-400/40 rounded-2xl p-5 md:p-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.1),transparent)] pointer-events-none" />
            <div className="relative z-10 flex items-start gap-4 md:items-center md:justify-between flex-col md:flex-row">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                  🎁
                </div>
                <div>
                  <p className="text-green-400 font-black text-base md:text-lg">FREE TICKETS!</p>
                  <p className="text-slate-300 text-xs md:text-sm">
                    {getNewDriverTimeLeft()} days remaining • Unlock premium access at any time
                  </p>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <div className="bg-white/10 border border-green-400/30 rounded-xl px-4 py-2 text-center">
                  <p className="text-green-400 font-black text-sm">
                    {getNewDriverTimeLeft()} days free
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Cards */}
        <div className="px-3 md:px-0 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {dynamicTickets.map((ticket) => {
            const active = isTicketActive(ticket)
            const expiryDisplay = getExpiryDisplay(ticket)
            const inWarning = isInWarningWindow(ticket.type, ticket.warningMs ?? 0)
            const remainingMs = getRemainingMs(ticket.type)

            const currentTicketType = userData?.hasActiveTicket && userData?.ticketExpiryDate?.toDate() > new Date() ? userData.ticketType : null;
            const currentTicketLevel = currentTicketType ? Number(TICKET_CONFIG.find(t => t.type === currentTicketType)?.level || 0) : 0;
            const isOwnedOrLower = currentTicketLevel >= ticket.level;
            const isExactLevel = currentTicketLevel === ticket.level;

            // NEW DRIVER LOGIC
            const isNewDriverStatus = isNewDriver()
            const canPurchaseNow = shouldShowPurchaseOption()
            const shouldBlurCard = isNewDriverStatus && !canPurchaseNow
            const disabled = active || (isOwnedOrLower && !isExactLevel) || shouldBlurCard

            return (
              <div
                key={ticket.level}
                className={`relative group bg-white rounded-3xl overflow-hidden flex flex-col transition-all duration-300
                  ${shouldBlurCard ? "blur-sm opacity-60 pointer-events-none" : ""}
                  ${ticket.featured && !isOwnedOrLower && !shouldBlurCard
                    ? "shadow-2xl shadow-indigo-500/20 scale-[1.02] ring-2 ring-indigo-400/50"
                    : "shadow-xl hover:shadow-2xl hover:-translate-y-1"
                  }
                  ${active && !inWarning ? "ring-2 ring-emerald-400/60" : ""}
                  ${inWarning ? "ring-2 ring-amber-400/70" : ""}
                  ${isOwnedOrLower && !shouldBlurCard ? "opacity-60 grayscale-[0.5]" : ""}
                `}
              >
                {/* New Driver Lock Overlay */}
                {shouldBlurCard && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
                    <div className="text-center text-white">
                      <p className="text-3xl mb-2">🔒</p>
                      <p className="text-sm font-bold">Free Trial</p>
                      <p className="text-[11px] text-slate-200">{getNewDriverTimeLeft()} days remaining</p>
                    </div>
                  </div>
                )}

                {/* Featured badge */}
                {ticket.featured && !active && !shouldBlurCard && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      ★ {ticket.badge}
                    </span>
                  </div>
                )}

                {inWarning && !shouldBlurCard && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg animate-pulse">
                      ⚠ Expiring Soon
                    </span>
                  </div>
                )}

                {active && !inWarning && !shouldBlurCard && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      ✓ Active
                    </span>
                  </div>
                )}

                {/* Gradient top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${ticket.color}`} />

                {/* Card content */}
                <div className="p-4 md:p-6 flex-1 flex flex-col">

                  {/* Icon & Title */}
                  <div className="mb-3 md:mb-5">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ticket.color} flex items-center justify-center text-2xl shadow-lg ${ticket.glow} mb-2 md:mb-4`}
                    >
                      {ticket.icon}
                    </div>
                    <h3 className="text-xl font-black text-gray-900">{ticket.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {ticket.duration} Access
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-4 md:mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-gray-400 text-lg font-semibold">₦</span>
                      <span className="text-4xl md:text-5xl font-black text-gray-900 leading-none">
                        {ticket.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">One-time payment</p>
                  </div>

                  {/* Perks */}
                  <ul className="space-y-2.5 mb-6 md:mb-8 flex-1">
                    {ticket.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <span
                          className={`w-5 h-5 rounded-full bg-gradient-to-br ${ticket.color} flex items-center justify-center text-white text-[10px] font-black flex-shrink-0`}
                        >
                          ✓
                        </span>
                        {perk}
                      </li>
                    ))}
                    {active && expiryDisplay && !shouldBlurCard && (
                      <li className="flex items-center gap-2.5 text-sm text-emerald-600 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                          ⏱
                        </span>
                        Expires: {expiryDisplay}
                      </li>
                    )}
                  </ul>

                  {/* CTA */}
                  {inWarning && !shouldBlurCard ? (
                    <button
                      onClick={() => openOverlay(ticket)}
                      className={`mt-2 w-full py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r ${ticket.color} text-white shadow-md hover:opacity-90 transition-all active:scale-95`}
                    >
                      Renew Ticket
                    </button>
                  ) : (
                    <button
                      onClick={() => !disabled && openOverlay(ticket)}
                      disabled={disabled || shouldBlurCard}
                      className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 active:scale-95
                        ${disabled || shouldBlurCard
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : `bg-gradient-to-r ${ticket.color} text-white shadow-lg ${ticket.glow} hover:shadow-xl hover:opacity-90`
                        }
                      `}
                    >
                      {shouldBlurCard ? "Locked" : (active ? "Currently Active" : (isOwnedOrLower ? "Purchase Disabled" : "Buy Now"))}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom info strip */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {[
              { icon: "⚡", title: "Instant Activation", desc: "Your ticket is active immediately after purchase" },
              { icon: "🔒", title: "Secure Payment", desc: "Your payment is safe and protected" },
              { icon: "🔄", title: "Extendable Plans", desc: "Stack purchases to extend your active ticket" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-white font-bold text-sm">{item.title}</p>
                <p className="text-slate-400 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          const path = userData?.isDriver ? `/user/driver-profile/${userId}` : `/user/profile/${userId}`
          router.push(path);
        }}
        title="Ticket Activated"
        message={`Success! Your ${selectedTicket?.name} has been activated. You now have full access to the platform.`}
      />

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn { animation: scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  )
}
