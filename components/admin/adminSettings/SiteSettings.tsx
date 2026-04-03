"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  FiSave, FiGlobe, FiPhone, FiTarget, FiEye, 
  FiPlus, FiTrash2, FiFacebook, FiInstagram, FiTwitter, FiLinkedin, FiYoutube, FiMessageSquare, FiRotateCcw, FiAlertCircle
} from 'react-icons/fi';
import { FaTiktok } from 'react-icons/fa';
import HomePageEditor from './HomePageEditor';
import { toast } from "react-hot-toast";

// --- TYPES & INTERFACES ---
interface SocialLink {
  platform: string;
  url: string;
}

interface SiteConfig {
  siteNameMain: string;
  siteNameSub: string;
  logoUrl: string;
  goalStatement: string;
  ceoContact: { phone: string; email: string };
  generalContact: {
    phone: string;
    email: string;
    address: string;
  };
  faqSubtitle?: string;
  socials: SocialLink[];
}

const PLATFORMS = [
  { name: 'WhatsApp', icon: <FiMessageSquare />, base: 'https://wa.me/' },
  { name: 'Instagram', icon: <FiInstagram />, base: 'https://instagram.com/' },
  { name: 'Facebook', icon: <FiFacebook />, base: 'https://facebook.com/' },
  { name: 'X (Twitter)', icon: <FiTwitter />, base: 'https://x.com/' },
  { name: 'TikTok', icon: <FaTiktok />, base: 'https://tiktok.com/@' },
  { name: 'LinkedIn', icon: <FiLinkedin />, base: 'https://linkedin.com/in/' },
  { name: 'YouTube', icon: <FiYoutube />, base: 'https://youtube.com/@' },
];

export default function SiteSettings() {
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].name);
  
  // Stores current edits
  const [config, setConfig] = useState<SiteConfig>({
    siteNameMain: "Nomo",
    siteNameSub: "Cars",
    logoUrl: "/favicon.png",
    goalStatement: "",
    ceoContact: { phone: "", email: "" },
    generalContact: { phone: "", email: "", address: "" },
    socials: []
  });

  // Stores the last saved version from Firebase for the "Undo" feature
  const [originalConfig, setOriginalConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const docRef = doc(db, "site_configs", "general");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteConfig;
        setConfig(data);
        setOriginalConfig(data);
      }
    };
    fetchConfig();
  }, []);

  // Whenever config changes, check if it's different from original to trigger red glow
  useEffect(() => {
    if (originalConfig) {
      const hasChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setIsDirty(hasChanged);
    }
  }, [config, originalConfig]);

  const handleUndo = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      toast.success("Changes discarded");
    }
  };

  const addSocial = () => {
    const platformData = PLATFORMS.find(p => p.name === selectedPlatform);
    if (!platformData) return;
    if (config.socials.some(s => s.platform === selectedPlatform)) return;

    setConfig({
      ...config,
      socials: [...config.socials, { platform: selectedPlatform, url: platformData.base }]
    });
  };

  const removeSocial = (index: number) => {
    const newSocials = config.socials.filter((_, i) => i !== index);
    setConfig({ ...config, socials: newSocials });
  };

  const updateSocialUrl = (index: number, newUrl: string) => {
    const newSocials = [...config.socials];
    newSocials[index].url = newUrl;
    setConfig({ ...config, socials: newSocials });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "site_configs", "general"), config);
      setOriginalConfig(config); // Update the backup to the new saved version
      setIsDirty(false); // Remove red glow
      toast.success("System Updated Successfully!");
    } catch (e) { 
      toast.error("Error saving configuration");
    }
    setLoading(false);
  };

  return (
    <div className='pt-4'>
      {/* 1. PREVIEW - Glowing reddish when isDirty is true */}
      <div className='px-2 space-y-10 animate-in fade-in duration-500 pb-10'>
        <section className={`p-6 rounded-2xl border-2 transition-all duration-500 ${
          isDirty 
          ? "bg-red-50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
          : "bg-gray-50 border-gray-200 border-dashed"
        }`}>
          <div className="flex justify-between items-center mb-4">
            <div className={`flex items-center gap-2 font-black uppercase text-[10px] ${isDirty ? 'text-red-600' : 'text-blue-600'}`}>
              <FiEye /> {isDirty ? "Unsaved Changes" : "Logo Preview"}
            </div>
            {isDirty && (
              <button 
                onClick={handleUndo}
                className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase italic animate-pulse"
              >
                <FiRotateCcw /> Undo Changes
              </button>
            )}
          </div>
          
          <div className="p-4 bg-blue-600 inline-block rounded-lg shadow-md">
            <div className="p-1 flex gap-2 items-center bg-white rounded-sm">
              <h2 className="md:text-xl font-extrabold italic text-blue-700">
                {config.siteNameMain} <span className="text-yellow-500">{config.siteNameSub}</span>
              </h2>
              <img src={config.logoUrl || "/favicon.png"} alt="logo" className="w-5 h-4 object-contain" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]"><FiGlobe className="text-blue-600" /> Identity</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Main Name" value={config.siteNameMain} onChange={(v) => setConfig({...config, siteNameMain: v})} />
                <Input label="Sub Name" value={config.siteNameSub} onChange={(v) => setConfig({...config, siteNameSub: v})} />
              </div>
              <Input label="Logo URL" value={config.logoUrl} onChange={(v) => setConfig({...config, logoUrl: v})} />
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]"><FiPhone className="text-emerald-600" /> Contact Info</h3>
              
              <p className="text-[8px] font-black uppercase text-gray-400 border-b pb-1">CEO Private Details</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="CEO Phone" value={config.ceoContact.phone} onChange={(v) => setConfig({...config, ceoContact: {...config.ceoContact, phone: v}})} />
                <Input label="CEO Email" value={config.ceoContact.email} onChange={(v) => setConfig({...config, ceoContact: {...config.ceoContact, email: v}})} />
              </div>

              <p className="text-[8px] font-black uppercase text-gray-400 border-b pb-1 pt-2">General Public Details</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Public Phone" value={config.generalContact.phone} onChange={(v) => setConfig({...config, generalContact: {...config.generalContact, phone: v}})} />
                <Input label="Public Email" value={config.generalContact.email} onChange={(v) => setConfig({...config, generalContact: {...config.generalContact, email: v}})} />
              </div>
              <Input label="Office Address" value={config.generalContact.address} onChange={(v) => setConfig({...config, generalContact: {...config.generalContact, address: v}})} />
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]"><FiTarget className="text-orange-500" /> Company Goal</h3>
              <textarea 
                className={`w-full p-4 border rounded-xl text-xs font-bold uppercase transition-all focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'bg-white border-red-200' : 'bg-gray-50 border-gray-200'}`}
                rows={3} value={config.goalStatement} onChange={(e) => setConfig({...config, goalStatement: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-black uppercase italic text-[#0B2A4A]">Social Media Links</h3>
              <div className="flex gap-2">
                <select 
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase outline-none"
                >
                  {PLATFORMS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <button onClick={addSocial} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all">
                  <FiPlus />
                </button>
              </div>

              <div className="space-y-3">
                {config.socials.map((social, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-blue-600 text-lg">
                      {PLATFORMS.find(p => p.name === social.platform)?.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black uppercase text-gray-400 mb-1">{social.platform}</p>
                      <input 
                        type="text" 
                        value={social.url} 
                        onChange={(e) => updateSocialUrl(index, e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-[10px] font-bold outline-none text-blue-700"
                      />
                    </div>
                    <button onClick={() => removeSocial(index)} className="text-red-400 hover:text-red-600 p-2">
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 border-t">
          <button 
            onClick={handleSave} 
            disabled={loading || !isDirty} 
            className={`w-full px-8 py-3 rounded-xl font-black uppercase italic transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
              isDirty 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-blue-600 text-white opacity-50 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving..." : isDirty ? "Update Changes" : "Save Config"}
            <FiSave />
          </button>
        </div>
      </div>

      <HomePageEditor/>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-full">
      <label className="block text-[9px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-tighter">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-black uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
    </div>
  );
}