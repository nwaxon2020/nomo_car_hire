"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth"
import { toast, Toaster } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"
import { triggerNotification } from "@/lib/notifications"
import PaymentSection from "@/components/Payment"

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

export default function TicketPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<(typeof TICKET_CONFIG)[0] | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [adminConfig, setAdminConfig] = useState<any>(null)

  // Ticks every second — drives the live countdown displays
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
        const [snap, configSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDoc(doc(db, "adminConfig", "pricing"))
        ])
        if (snap.exists()) setUserData(snap.data())
        if (configSnap.exists()) setAdminConfig(configSnap.data())
      } finally {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [router])

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

  const openOverlay = (ticket: (typeof TICKET_CONFIG)[0]) => {
    setSelectedTicket(ticket)
    setShowOverlay(true)
  }

  const handlePurchase = async (level: number) => {
    const ticket = dynamicTickets.find((t) => t.level === level)
    if (!ticket || processing || !userId) return
    setProcessing(true)

    try {
      const userRef = doc(db, "users", userId)

      // Always re-read fresh data so we don't overwrite concurrent changes
      const freshSnap = await getDoc(userRef)
      const freshData = freshSnap.data() || {}
      const existingTickets: any[] = freshData.tickets || []

      const purchaseDate = new Date()
      const expiry = new Date(purchaseDate)
      expiry.setDate(expiry.getDate() + ticket.durationDays)

      // If same-type ticket is still active, extend from its current expiry
      let finalExpiry = expiry
      const sameTypeActive = existingTickets.find(
        (t: any) => t.type === ticket.type && !t.expired && t.expiryDate?.toDate() > purchaseDate
      )
      if (sameTypeActive) {
        const currentExpiry: Date = sameTypeActive.expiryDate.toDate()
        finalExpiry = new Date(currentExpiry)
        finalExpiry.setDate(finalExpiry.getDate() + ticket.durationDays)
      }

      // Mark previous same-type tickets as expired in the array
      const updatedTickets = existingTickets.map((t: any) =>
        t.type === ticket.type ? { ...t, expired: true } : t
      )

      // New array entry: amount + purchaseDate + expired boolean
      const newEntry = {
        amount: ticket.price,
        type: ticket.type,
        name: ticket.name,
        purchaseDate: Timestamp.fromDate(purchaseDate),
        expiryDate: Timestamp.fromDate(finalExpiry),
        expired: false,
      }

      await triggerNotification(
        userId,
        `${ticket.name} Purchased! 🎫`,
        `Your ${ticket.name} is now active. Enjoy ${ticket.duration} of full access on Nomopo!`,
        "success"
      )

      await updateDoc(userRef, {
        // Array history — holds every ticket purchase with amount/date/expired
        tickets: [...updatedTickets, newEntry],
        // Flat convenience fields for quick reads elsewhere in the app
        hasActiveTicket: true,
        ticketType: ticket.type,
        ticketName: ticket.name,
        ticketPurchaseDate: Timestamp.fromDate(purchaseDate),
        ticketExpiryDate: Timestamp.fromDate(finalExpiry),
        updatedAt: Timestamp.now(),
      })

      // Update local state immediately so UI reflects without re-fetch
      setUserData((prev: any) => ({
        ...prev,
        tickets: [...updatedTickets, newEntry],
        hasActiveTicket: true,
        ticketType: ticket.type,
        ticketName: ticket.name,
        ticketExpiryDate: Timestamp.fromDate(finalExpiry),
      }))

      toast.success(`🎫 ${ticket.name} Activated!`)

      setTimeout(() => {
        const path = freshData?.isDriver
          ? `/user/driver-profile/${userId}`
          : `/user/profile/${userId}`
        router.push(`${path}?ticketSuccess=true`)
      }, 2000)
    } catch (error) {
      console.error("Ticket Purchase Error:", error)
      toast.error("Purchase failed. Please try again.")
    } finally {
      setProcessing(false)
      setShowOverlay(false)
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
        .filter((t) => t.type === type && !t.expired && t.expiryDate?.toDate() > now)
        .sort((a, b) => (b.purchaseDate?.toDate()?.getTime() ?? 0) - (a.purchaseDate?.toDate()?.getTime() ?? 0))[0] ?? null
    )
  }

  const getRemainingMs = (type: string): number => {
    const t = getActiveTicket(type)
    if (!t) return 0
    return t.expiryDate.toDate().getTime() - now.getTime()
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
      <Toaster position="top-right" />

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

        {/* Ticket Cards */}
        <div className="px-3 md:px-0 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {dynamicTickets.map((ticket) => {
            const active = isTicketActive(ticket)
            const expiryDisplay = getExpiryDisplay(ticket)
            const inWarning = isInWarningWindow(ticket.type, ticket.warningMs ?? 0)
            const remainingMs = getRemainingMs(ticket.type)

            return (
              <div
                key={ticket.level}
                className={`relative group bg-white rounded-3xl overflow-hidden flex flex-col transition-all duration-300
                  ${ticket.featured
                    ? "shadow-2xl shadow-indigo-500/20 scale-[1.02] ring-2 ring-indigo-400/50"
                    : "shadow-xl hover:shadow-2xl hover:-translate-y-1"
                  }
                  ${active && !inWarning ? "ring-2 ring-emerald-400/60" : ""}
                  ${inWarning ? "ring-2 ring-amber-400/70" : ""}
                `}
              >
                {/* Featured badge */}
                {ticket.featured && !active && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      ★ {ticket.badge}
                    </span>
                  </div>
                )}

                {inWarning && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg animate-pulse">
                      ⚠ Expiring Soon
                    </span>
                  </div>
                )}

                {active && !inWarning && (
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
                    {active && expiryDisplay && (
                      <li className="flex items-center gap-2.5 text-sm text-emerald-600 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                          ⏱
                        </span>
                        Expires: {expiryDisplay}
                      </li>
                    )}
                  </ul>

                  {/* CTA — countdown replaces button when near expiry */}
                  {inWarning ? (
                    <>
                      <div className="w-full py-3.5 rounded-2xl text-center bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg">
                        <p className="text-[10px] font-bold tracking-widest opacity-80 mb-0.5">⚠ Expires In</p>
                        <p className="font-mono text-xl font-black leading-none tabular-nums">
                          {formatCountdown(remainingMs)}
                        </p>
                      </div>
                      <button
                        onClick={() => openOverlay(ticket)}
                        className={`mt-2 w-full py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r ${ticket.color} text-white shadow-md hover:opacity-90 transition-all active:scale-95`}
                      >
                        Renew Ticket
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => !active && openOverlay(ticket)}
                      disabled={active}
                      className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 active:scale-95
                        ${active
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : `bg-gradient-to-r ${ticket.color} text-white shadow-lg ${ticket.glow} hover:shadow-xl hover:opacity-90`
                        }
                      `}
                    >
                      {active ? "Currently Active" : "Buy Now"}
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
