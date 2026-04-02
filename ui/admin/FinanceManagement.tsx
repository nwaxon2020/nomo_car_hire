"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { toast } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"

// ─── Default pricing (fallback if Firestore doc doesn't exist yet) ────────────
export const DEFAULT_PRICING = {
  vip: {
    validityDays: 365,
    warningDays: 30,
    prices: { 1: 5000, 2: 7500, 3: 11000, 4: 15000, 5: 20000 },
  },
  tickets: {
    daily: { price: 200, durationDays: 1, warningHours: 3 },
    weekly: { price: 1000, durationDays: 7, warningHours: 48 },
    monthly: { price: 2000, durationDays: 30, warningHours: 96 },
  },
}

const VIP_NAMES: Record<number, string> = {
  1: "Green VIP ⭐",
  2: "Yellow VIP ⭐⭐",
  3: "Purple VIP ⭐⭐⭐",
  4: "Gold VIP ⭐⭐⭐⭐",
  5: "Black VIP ⭐⭐⭐⭐⭐",
}

const TICKET_LABELS: Record<string, { label: string; icon: string }> = {
  daily: { label: "Daily Ticket", icon: "🎫" },
  weekly: { label: "Weekly Ticket", icon: "🗓️" },
  monthly: { label: "Monthly Ticket", icon: "💎" },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FinanceManagement() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<any>(null)
  const [updatedBy, setUpdatedBy] = useState<string>("")

  // Working copies of the config
  const [vipValidityDays, setVipValidityDays] = useState(DEFAULT_PRICING.vip.validityDays)
  const [vipWarningDays, setVipWarningDays] = useState(DEFAULT_PRICING.vip.warningDays)
  const [vipPrices, setVipPrices] = useState<Record<number, number>>({ ...DEFAULT_PRICING.vip.prices })
  const [tickets, setTickets] = useState({ ...DEFAULT_PRICING.tickets })

  // ─── Load from Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "adminfinance", "pricing"))
        if (snap.exists()) {
          const d = snap.data()
          if (d.vip) {
            setVipValidityDays(d.vip.validityDays ?? DEFAULT_PRICING.vip.validityDays)
            setVipWarningDays(d.vip.warningDays ?? DEFAULT_PRICING.vip.warningDays)
            if (d.vip.prices) setVipPrices(d.vip.prices)
          }
          if (d.tickets) setTickets(d.tickets)
          if (d.lastUpdated) setLastUpdated(d.lastUpdated.toDate())
          if (d.updatedBy) setUpdatedBy(d.updatedBy)
        }
      } catch (err) {
        console.error("Failed to load pricing config:", err)
        toast.error("Could not load config. Using defaults.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── Save to Firestore ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const adminUser = auth.currentUser
      const payload = {
        vip: {
          validityDays: Number(vipValidityDays),
          warningDays: Number(vipWarningDays),
          prices: Object.fromEntries(
            Object.entries(vipPrices).map(([k, v]) => [k, Number(v)])
          ),
        },
        tickets: {
          daily: { price: Number(tickets.daily.price), durationDays: Number(tickets.daily.durationDays), warningHours: Number(tickets.daily.warningHours) },
          weekly: { price: Number(tickets.weekly.price), durationDays: Number(tickets.weekly.durationDays), warningHours: Number(tickets.weekly.warningHours) },
          monthly: { price: Number(tickets.monthly.price), durationDays: Number(tickets.monthly.durationDays), warningHours: Number(tickets.monthly.warningHours) },
        },
        lastUpdated: Timestamp.now(),
        updatedBy: adminUser?.email || adminUser?.uid || "Unknown",
      }
      await setDoc(doc(db, "adminfinance", "pricing"), payload)
      setLastUpdated(new Date())
      setUpdatedBy(adminUser?.email || adminUser?.uid || "Unknown")
      toast.success("✅ Pricing config saved successfully!")
    } catch (err) {
      console.error("Save failed:", err)
      toast.error("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const updateTicket = (type: keyof typeof tickets, field: string, value: number) => {
    setTickets(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  if (loading) return (
    <div className="min-h-screen bg-[#040b18] flex items-center justify-center">
      <LoadingRound />
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040b18] via-[#071020] to-[#0a1628] relative overflow-hidden">


      {/* Ambient glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">

        {/* ── Header ── */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Admin Panel</p>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Finance
              <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Management
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-sm">
              Control VIP and ticket pricing in real time. Changes affect the purchase pages immediately.
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 hover:border-amber-400/40 hover:text-amber-300 transition-all duration-200 active:scale-95 backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline font-semibold text-sm">Go Back</span>
          </button>
        </div>

        {/* ── Last saved banner ── */}
        {lastUpdated && (
          <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-emerald-400 text-xs font-semibold">
              Last saved: {lastUpdated.toLocaleString("en-GB")}
              {updatedBy && <span className="text-slate-400"> by {updatedBy}</span>}
            </p>
          </div>
        )}

        {/* ════════════════ VIP SECTION ════════════════ */}
        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">⭐</div>
            <div>
              <h2 className="text-lg font-black text-white">VIP Plan Pricing</h2>
              <p className="text-slate-400 text-xs">Prices in ₦ · Changes live immediately on the VIP purchase page</p>
            </div>
          </div>

          {/* VIP Level Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {([1, 2, 3, 4, 5] as const).map((lvl) => (
              <div key={lvl} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {VIP_NAMES[lvl]}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    min={0}
                    value={vipPrices[lvl]}
                    onChange={(e) => setVipPrices(prev => ({ ...prev, [lvl]: Number(e.target.value) }))}
                    className="flex-1 bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* VIP Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                📅 VIP Validity (days)
              </label>
              <input
                type="number"
                min={1}
                value={vipValidityDays}
                onChange={(e) => setVipValidityDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
              />
              <p className="text-slate-500 text-[10px] mt-1">How many days a VIP plan lasts after purchase</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                ⚠️ Expiry Warning (days)
              </label>
              <input
                type="number"
                min={1}
                value={vipWarningDays}
                onChange={(e) => setVipWarningDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all"
              />
              <p className="text-slate-500 text-[10px] mt-1">Days before expiry when countdown appears on VIP card</p>
            </div>
          </div>
        </section>

        {/* ════════════════ TICKET SECTION ════════════════ */}
        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">🎫</div>
            <div>
              <h2 className="text-lg font-black text-white">Ticket Pricing &amp; Duration</h2>
              <p className="text-slate-400 text-xs">Prices in ₦ · Warning threshold in hours</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(["daily", "weekly", "monthly"] as const).map((type) => {
              const t = tickets[type]
              const { label, icon } = TICKET_LABELS[type]
              return (
                <div key={type} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <span className="text-white font-black text-sm">{label}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Price (₦)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-sm font-bold">₦</span>
                      <input
                        type="number"
                        min={0}
                        value={t.price}
                        onChange={(e) => updateTicket(type, "price", Number(e.target.value))}
                        className="flex-1 bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={t.durationDays}
                      onChange={(e) => updateTicket(type, "durationDays", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Countdown Warning (hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={t.warningHours}
                      onChange={(e) => updateTicket(type, "warningHours", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30 transition-all"
                    />
                    <p className="text-slate-500 text-[10px] mt-1">Countdown shows when this many hours remain</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Save Button ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:opacity-90 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving Changes…" : "💾 Save Pricing Config"}
        </button>

        <p className="text-center text-slate-500 text-xs mt-4">
          Changes are saved to <span className="text-slate-300 font-semibold">adminfinance/pricing</span> and take effect immediately across all purchase pages.
        </p>
      </div>
    </div>
  )
}
