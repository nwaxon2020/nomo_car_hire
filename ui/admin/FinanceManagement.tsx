"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { toast, Toaster } from "react-hot-toast"
import LoadingRound from "@/components/re-useable-loading"

import { FiNavigation, FiCheck, FiX } from "react-icons/fi"

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

  // Source of truth from Firestore
  const [serverData, setServerData] = useState<any>(null)

  // Working copies of the config
  const [vipValidityDays, setVipValidityDays] = useState<number>(0)
  const [vipWarningDays, setVipWarningDays] = useState<number>(0)
  const [vipPrices, setVipPrices] = useState<Record<number, number>>({})
  const [tickets, setTickets] = useState<any>(null)
  const [newDriverDays, setNewDriverDays] = useState<number>(60)
  const [newDriverWarningDays, setNewDriverWarningDays] = useState<number>(5)
  const [startTicketCollect, setStartTicketCollect] = useState<boolean>(false)

  // ─── Load from Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "adminfinance", "pricing"))
        if (snap.exists()) {
          const d = snap.data()

          // 1. Update working state first
          if (d.vip) {
            setVipValidityDays(d.vip.validityDays || 0)
            setVipWarningDays(d.vip.warningDays || 0)
            setVipPrices(d.vip.prices || {})
          }
          if (d.tickets) {
            setTickets(d.tickets)
          }
          if (d.lastUpdated) setLastUpdated(d.lastUpdated.toDate())
          if (d.updatedBy) setUpdatedBy(d.updatedBy)

          // Load new driver config
          if (d.newDriver) {
            setNewDriverDays(d.newDriver.freeTrialDays || 60)
            setNewDriverWarningDays(d.newDriver.warningDays || 5)
          }
          if (d.startTicketCollect !== undefined) {
            setStartTicketCollect(d.startTicketCollect)
          }

          // 2. Set serverData last to ensure comparison is clean
          setServerData(d)
        }
      } catch (err) {
        console.error("Failed to load pricing config:", err)
        toast.error("Could not load backend config.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── Update Checker Logic ────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    // Stop checker if still loading or if data hasn't arrived yet
    if (loading || !serverData || !tickets) return false;

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
      },
      newDriver: {
        freeTrialDays: Number(newDriverDays),
        warningDays: Number(newDriverWarningDays),
      },
    };

    // Only compare relevant fields, ignore metadata like lastUpdated
    const isVipDifferent = JSON.stringify(currentData.vip) !== JSON.stringify(serverData.vip);
    const isTicketsDifferent = JSON.stringify(currentData.tickets) !== JSON.stringify(serverData.tickets);
    const isNewDriverDifferent = JSON.stringify(currentData.newDriver) !== JSON.stringify(serverData.newDriver);
    const isTicketCollectDifferent = startTicketCollect !== serverData.startTicketCollect;

    return isVipDifferent || isTicketsDifferent || isNewDriverDifferent || isTicketCollectDifferent;
  }, [vipValidityDays, vipWarningDays, vipPrices, tickets, newDriverDays, newDriverWarningDays, startTicketCollect, serverData, loading]);

  const handleCancel = () => {
    if (serverData) {
      setVipValidityDays(serverData.vip.validityDays)
      setVipWarningDays(serverData.vip.warningDays)
      setVipPrices({ ...serverData.vip.prices })
      setTickets(JSON.parse(JSON.stringify(serverData.tickets)))
      setNewDriverDays(serverData.newDriver?.freeTrialDays || 60)
      setNewDriverWarningDays(serverData.newDriver?.freeTrialDays || 60)
      setNewDriverWarningDays(serverData.newDriver?.warningDays || 5)
      setStartTicketCollect(serverData.startTicketCollect || false)
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
        newDriver: {
          freeTrialDays: Number(newDriverDays),
          warningDays: Number(newDriverWarningDays),
        },
        startTicketCollect: startTicketCollect,
        lastUpdated: Timestamp.now(),
        updatedBy: adminUser?.email || adminUser?.uid || "Unknown",
      }
      await setDoc(doc(db, "adminfinance", "pricing"), payload)
      setServerData(payload)
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

  const updateTicket = (type: string, field: string, value: number) => {
    setTickets((prev: any) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }))
  }

  if (loading || !tickets) return (
    <div className="min-h-screen bg-[#040b18] flex items-center justify-center">
      <LoadingRound />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040b18] via-[#071020] to-[#0a1628] relative overflow-hidden pb-32">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">

        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Admin Panel</p>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Finance
              <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Management
              </span>
            </h1>
          </div>

          <Link href="/admin" className="flex justify-center items-center md:px-12 px-6 py-3 rounded-xl border border-white/10 shadow-sm hover:bg-white/5 transition-all">
            <FiNavigation className="text-white" />
          </Link>
        </div>

        {lastUpdated && (
          <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-emerald-400 text-xs font-semibold">
              Last saved: {lastUpdated.toLocaleString("en-GB")}
              {updatedBy && <span className="text-slate-400"> by {updatedBy}</span>}
            </p>
          </div>
        )}

        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 md:p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">⭐</div>
            <h2 className="text-lg font-black text-white">VIP Plan Pricing</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.keys(VIP_NAMES).map((lvlKey) => {
              const lvl = Number(lvlKey);
              return (
                <div key={lvl} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {VIP_NAMES[lvl]}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">₦</span>
                    <input
                      type="number"
                      value={vipPrices[lvl] || 0}
                      onChange={(e) => setVipPrices(prev => ({ ...prev, [lvl]: Number(e.target.value) }))}
                      className="flex-1 bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60 transition-all"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">📅 VIP Validity (days)</label>
              <input
                type="number"
                value={vipValidityDays}
                onChange={(e) => setVipValidityDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60"
              />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">⚠️ Warning (days)</label>
              <input
                type="number"
                value={vipWarningDays}
                onChange={(e) => setVipWarningDays(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400/60"
              />
            </div>
          </div>
        </section>

        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 md:p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">🎫</div>
            <h2 className="text-lg font-black text-white">Ticket Pricing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.keys(TICKET_LABELS).map((type) => {
              const t = tickets[type]
              const { label, icon } = TICKET_LABELS[type]
              return (
                <div key={type} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <span className="text-white font-black text-sm">{label}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1.5">Price (₦)</label>
                    <input
                      type="number"
                      value={t.price}
                      onChange={(e) => updateTicket(type, "price", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1.5">Duration (days)</label>
                    <input
                      type="number"
                      value={t.durationDays}
                      onChange={(e) => updateTicket(type, "durationDays", Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 md:p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-xl">🆕</div>
            <h2 className="text-lg font-black text-white">New Driver Free Trial</h2>
          </div>

          <p className="text-slate-300 text-sm mb-6">Configure the free ticket period for newly registered drivers and when to show purchase warnings.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">📅 Free Trial Days</label>
              <input
                type="number"
                value={newDriverDays}
                onChange={(e) => setNewDriverDays(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400/60"
              />
              <p className="text-[10px] text-slate-500 mt-2">New drivers get {newDriverDays} days free access</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">⏰ Warning Days Before Expiry</label>
              <input
                type="number"
                value={newDriverWarningDays}
                onChange={(e) => setNewDriverWarningDays(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-900 border border-white/10 text-white font-bold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400/60"
              />
              <p className="text-[10px] text-slate-500 mt-2">Show purchase option {newDriverWarningDays} days before trial ends</p>
            </div>
          </div>
        </section>

        <section className="bg-white/4 border border-white/10 rounded-2xl p-3 md:p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">🛡️</div>
            <h2 className="text-lg font-black text-white">Ticket Collection Settings</h2>
          </div>
          <p className="text-slate-300 text-sm mb-6">Decide if drivers must have a valid ticket to view customer requests.</p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Start collecting tickets?</label>
            <div className="flex flex-col sm:flex-row gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="startTicketCollect"
                    checked={startTicketCollect === true}
                    onChange={() => setStartTicketCollect(true)}
                    className="peer appearance-none w-6 h-6 border-2 border-white/20 rounded-full checked:border-amber-500 transition-all cursor-pointer"
                  />
                  <div className="absolute w-3 h-3 bg-amber-500 rounded-full scale-0 peer-checked:scale-100 transition-transform" />
                </div>
                <span className="text-white font-bold group-hover:text-amber-400 transition-colors">Yes (Enforce Tickets)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="startTicketCollect"
                    checked={startTicketCollect === false}
                    onChange={() => setStartTicketCollect(false)}
                    className="peer appearance-none w-6 h-6 border-2 border-white/20 rounded-full checked:border-amber-500 transition-all cursor-pointer"
                  />
                  <div className="absolute w-3 h-3 bg-amber-500 rounded-full scale-0 peer-checked:scale-100 transition-transform" />
                </div>
                <span className="text-white font-bold group-hover:text-amber-400 transition-colors">No (Free Access)</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      {hasChanges && (
        <div className="fixed bottom-8 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#0f1d36]/95 backdrop-blur-md border border-amber-500/30 rounded md:rounded-xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FiCheck className="animate-pulse" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Unsaved Changes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleCancel} className="px-4 py-2 text-slate-300 text-xs font-bold flex items-center gap-1">
                <FiX /> Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider"
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