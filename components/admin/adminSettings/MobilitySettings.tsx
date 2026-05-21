"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { FiSave, FiPhone, FiAlertCircle } from 'react-icons/fi';
import { toast } from "react-hot-toast";

interface MobilityConfig {
  emergencySosPhone: string;
}

export default function MobilitySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MobilityConfig>({
    emergencySosPhone: "+2348123456789"
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const docRef = doc(db, "site_configs", "mobility");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as MobilityConfig);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "site_configs", "mobility"), config);
      setIsDirty(false);
      toast.success("Mobility settings updated!");
    } catch (e) {
      toast.error("Error saving mobility configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase text-gray-400 font-mono">Accessing Mobility Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <section className={`p-6 rounded-2xl border-2 transition-all duration-500 ${isDirty
        ? "bg-red-50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
        : "bg-white border-gray-100 shadow-sm"
        }`}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]">
            <FiPhone className="text-red-600" /> Emergency SOS Configuration
          </h3>
          {isDirty && (
            <span className="text-[10px] font-black uppercase text-red-600 animate-pulse bg-red-100 px-3 py-1 rounded-full">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="max-w-md">
          <div className="w-full">
            <label className="block text-[9px] font-black uppercase text-gray-400 mb-2 ml-1 tracking-tighter">Emergency SOS Phone Number</label>
            <div className="relative">
              <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={config.emergencySosPhone}
                onChange={(e) => { setConfig({ ...config, emergencySosPhone: e.target.value }); setIsDirty(true); }}
                className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-extrabold uppercase focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-inner"
                placeholder="+234..."
              />
            </div>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-3 leading-relaxed">
              <FiAlertCircle className="inline mr-1 text-amber-500" /> This number will be used globally for all SOS Calls and WhatsApp alerts in real-time.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`mt-10 w-full md:w-auto px-12 py-4 rounded-xl font-black uppercase italic flex items-center justify-center gap-2 transition-all ${isDirty
            ? "bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-200"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          {saving ? "Updating..." : "Deploy New SOS Details"} <FiSave />
        </button>
      </section>
    </div>
  );
}
