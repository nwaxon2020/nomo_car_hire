'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  FiMapPin, FiPhone, FiMail, FiClock, 
  FiNavigation, FiTruck, FiMessageCircle 
} from 'react-icons/fi';
import { db } from '@/lib/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import NewsPageUi from '@/components/news';

const LocationUi = () => {
  const router = useRouter();

  // --- DYNAMIC MESSAGE CONFIG ---
  const whatsAppMessage = "Hello Nomo Cars, I want to chat with the support team.";

  // --- FINALIZED CONTACT DATA ---
  const [siteSettings, setSiteSettings] = useState<any>({
    siteName: "Nomo Cars",
  });
  const [contact, setContact] = useState<any>({
    officeAddress: "147, Akarigbo road, sabo, sagamu, ogun state, nigeria",
    officeCity: "Sagamu",
    officePostcode: "Ogun State",
    generalPhone: "09023688246",
    generalEmail: "nomopoventures@yahoo.com",
    mapEmbedUrl: "" 
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site_configs", "general"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        setSiteSettings({
          siteName: `${data.siteNameMain || "Nomo"} ${data.siteNameSub || "Cars"}`,
        });

        if (data.generalContact) {
          setContact({
            officeAddress: data.generalContact.address,
            officeCity: "Sagamu",
            officePostcode: "Ogun State",
            generalPhone: data.generalContact.phone,
            generalEmail: data.generalContact.email,
            mapEmbedUrl: data.mapEmbedUrl || ""
          });
        }
      }
    });

    return () => unsub();
  }, []);

  const fullAddress = contact.officeAddress;
  
  // Clean Map URL for Sagamu Station
  const mapSource = contact.mapEmbedUrl || 
    `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  
  const directMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  
  // Updated to use the dynamic const
  const whatsappLink = `https://wa.me/2349023688246?text=${encodeURIComponent(whatsAppMessage)}`;

  return (
    <>
        <div className="bg-[#0a0a0a] min-h-screen pt-8 pb-20 overflow-hidden relative text-white font-sans">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full -ml-48 -mb-48" />

        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-12 md:mb-8">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4"
            >
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <span className="text-blue-500 font-black uppercase text-[10px] tracking-[0.4em]">
                Primary Operations Station
                </span>
            </motion.div>
            
            <motion.h1 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none"
            >
                THE <span className="text-blue-600">{siteSettings.siteName || "NOMO CARS"}</span> HUB
            </motion.h1>
            <p className="text-zinc-400 mt-6 max-w-xl text-sm font-medium leading-relaxed">
                Coordinating South-West luxury car rentals and logistics haulage from our central office in Sagamu.
            </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* --- LEFT SIDE --- */}
            <div className="lg:col-span-5 space-y-3">
                
                <motion.div 
                whileHover={{ y: -5 }}
                className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-lg border border-white/10 relative overflow-hidden group shadow-2xl"
                >
                <div className="relative z-10">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                    <FiMapPin size={24} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Our Headquarter</h3>
                    <p className="text-xl font-bold text-white leading-tight mb-8 capitalize">{fullAddress}</p>
                    <button 
                        onClick={() => router.push('/about')}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest hover:gap-4 transition-all"
                    >
                    Learn More About Us! <FiNavigation />
                    </button>
                </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Card */}
                    <a href={`tel:${contact.generalPhone}`} className="bg-zinc-900/40 p-6 rounded-lg border border-white/5 group hover:border-blue-500/30 transition-all">
                        <FiPhone className="text-blue-600 mb-4" size={20} />
                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-1 tracking-widest">Call Support</h4>
                        <p className="text-sm font-bold text-white">{contact.generalPhone}</p>
                    </a>
                    
                    {/* Email Card */}
                    <a href={`mailto:${contact.generalEmail}`} className="bg-zinc-900/40 p-6 rounded-lg border border-white/5 group hover:border-blue-500/30 transition-all">
                        <FiMail className="text-blue-600 mb-4" size={20} />
                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-1 tracking-widest">Digital Mail</h4>
                        <p className="text-sm font-bold text-white truncate">{contact.generalEmail}</p>
                    </a>

                    {/* WhatsApp Quick Link */}
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-blue-600/10 p-6 rounded-lg border border-blue-500/20 md:col-span-2 flex items-center justify-between group hover:bg-blue-600/20 transition-all">
                        <div className="flex items-center gap-4">
                        <FiMessageCircle className="text-blue-500" size={24} />
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-1 tracking-widest">WhatsApp Chat</h4>
                            <p className="text-xs font-bold text-white">chat with our support team in real time</p>
                        </div>
                        </div>
                        <FiNavigation className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>

                <button className="w-full" >
                    <a 
                        className='w-full px-8 py-5 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-xl'
                        href={directMapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        >
                        Navigate to ur office <FiTruck />
                    </a>
                </button>
                
            </div>

            {/* --- MAP SIDE --- */}
            <div className="lg:col-span-7 h-[450px] md:h-[600px] lg:sticky lg:top-24">
                <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 relative"
                >
                <iframe
                    title="Location Map"
                    src={mapSource}
                    className="w-full h-full border-0 md:grayscale invert brightness-90 contrast-125 opacity-90 hover:opacity-100 hover:grayscale-0 hover:invert-0 transition-all duration-1000"
                    style={{ pointerEvents: 'auto' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute inset-0 pointer-events-none border-4 border-[#0a0a0a]/50 rounded-lg shadow-inner" />
                </motion.div>
            </div>
            </div>
        </div>
        </div>

        {/* NEWS SECTION */}
        <div className='pt-12 pb-8 md:pt-0'>
            <NewsPageUi/>
        </div>
    </>
  );
};

export default LocationUi;