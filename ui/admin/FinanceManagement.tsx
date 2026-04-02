"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { toast, Toaster } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"

import { FiNavigation, FiCheck, FiX } from "react-icons/fi"

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

export default function FinanceManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<any>(null)
  const [updatedBy, setUpdatedBy] = useState<string>("")

  // This holds the "Saved" version of the data
  const [serverData, setServerData] = useState<any>(null)

  // Working copies of the config (Current UI state)
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
          setServerData(d) // Store original state for comparison
          if (d.vip) {
            setVipValidityDays(d.vip.validityDays ?? DEFAULT_PRICING.vip.validityDays)
            setVipWarningDays(d.vip.warningDays ?? DEFAULT_PRICING.vip.warningDays)
            if (d.vip.prices) setVipPrices(d.vip.prices)
          }
          if (d.tickets) setTickets(d.tickets)
          if (d.lastUpdated) setLastUpdated(d.lastUpdated.toDate())
          if (d.updatedBy) setUpdatedBy(d.updatedBy)
        } else {
          setServerData(DEFAULT_PRICING)
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

  // ─── Update Checker Logic ────────────────────────────────────────────────
  // This logic checks if the current UI state matches the saved serverData
  const hasChanges = useMemo(() => {
    if (!serverData) return false;

    const currentData = {
      vip: {
        validityDays: Number(vipValidityDays),
        warningDays: Number(vipWarningDays),
        prices: Object.fromEntries(Object.entries(vipPrices).map(([k, v]) => [k, Number(v)])),
      },
      tickets: {
        daily: { price: Number(tickets.daily.price), durationDays: Number(tickets.daily.durationDays), warningHours: Number(tickets.daily.warningHours) },
        weekly: { price: Number(tickets.weekly.price), durationDays: Number(tickets.weekly.durationDays), warningHours: Number(tickets.weekly.warningHours) },
        monthly: { price: Number(tickets.monthly.price), durationDays: Number(tickets.monthly.durationDays), warningHours: Number(tickets.monthly.warningHours) },
      }
    };

    // Deep compare current values vs saved values
    const isVipDifferent = JSON.stringify(currentData.vip) !== JSON.stringify(serverData.vip);
    const isTicketsDifferent = JSON.stringify(currentData.tickets) !== JSON.stringify(serverData.tickets);

    return isVipDifferent || isTicketsDifferent;
  }, [vipValidityDays, vipWarningDays, vipPrices, tickets, serverData]);

  const handleCancel = () => {
    if (serverData) {
      setVipValidityDays(serverData.vip.validityDays)
      setVipWarningDays(serverData.vip.warningDays)
      setVipPrices({ ...serverData.vip.prices })
      setTickets(JSON.parse(JSON.stringify(serverData.tickets)))
      toast.success("Changes reverted to saved state")
    }
  }

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
      setServerData(payload) // This makes 'hasChanges' false immediately after saving
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

  const updateTicket = (type: keyof typeof tickets, field: string, value: number) => {
    setTickets(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  if (loading) return (
    <div className="min-h-screen bg-[#040b18] flex items-center justify-center">
      <LoadingRound />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040b18] via-[#071020] to-[#0a1628] relative overflow-hidden pb-32">
      <Toaster position="top-center" reverseOrder={false} />

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

          <Link href="/admin" className="flex justify-center items-center md:px-12 px-6 py-3 rounded-xl border border-white/10 shadow-sm hover:bg-white/5 transition-all">
            <FiNavigation className="text-white" />
          </Link>
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

        {/* VIP SECTION */}
        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 md:p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">⭐</div>
            <div>
              <h2 className="text-lg font-black text-white">VIP Plan Pricing</h2>
              <p className="text-slate-400 text-xs">Prices in ₦ · Changes live immediately</p>
            </div>
          </div>

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
                    className="flex-1 bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

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
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 transition-all"
              />
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
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 transition-all"
              />
            </div>
          </div>
        </section>

        {/* TICKET SECTION */}
        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 md:p-6 mb-8 backdrop-blur-sm">
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
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price (₦)</label>
                    <input
                      type="number"
                      min={0}
                      value={t.price}
                      onChange={(e) => updateTicket(type, "price", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400/60 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Duration (days)</label>
                    <input
                      type="number"
                      min={1}
                      value={t.durationDays}
                      onChange={(e) => updateTicket(type, "durationDays", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400/60 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Warning (hours)</label>
                    <input
                      type="number"
                      min={1}
                      value={t.warningHours}
                      onChange={(e) => updateTicket(type, "warningHours", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400/60 transition-all"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Floating Update Bar (Only shows when "Dirty") ── */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#0f1d36]/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FiCheck className="animate-pulse" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Unsaved Changes</p>
                <p className="text-slate-400 text-[10px]">Review or discard before saving.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-slate-300 text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-1"
              >
                <FiX /> Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {saving ? "Saving..." : "Save Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}