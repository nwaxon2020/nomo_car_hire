"use client";

import { useState } from 'react';
import { auth } from '@/lib/firebaseConfig';
import { FiInfo, FiGlobe, FiShield, FiHelpCircle, FiArrowLeft, FiNavigation } from 'react-icons/fi';
import Link from 'next/link';

// Import the sub-components (We will create these below)
import AboutSettings from '@/components/admin/adminSettings/AboutSettings';
import SiteSettings from '@/components/admin/adminSettings/SiteSettings';
import PolicySettings from '@/components/admin/adminSettings/PolicySettings';
import FaqSettings from '@/components/admin/adminSettings/FaqSettings';

export default function AdminSettingsPageUi() {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const CEO_ID = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const isCEO = auth.currentUser?.uid === CEO_ID;

  // Security Gate
  if (!isCEO) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050A0F] text-white p-6">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase italic mb-2">Access Denied</h1>
          <p className="text-gray-400 uppercase tracking-widest text-xs">Only the CEO can manage core system configurations.</p>
          <Link href="/admin" className="mt-6 inline-block text-blue-500 border border-blue-500/30 px-6 py-2 rounded-full font-bold uppercase text-[10px]">
            Return to Command Center
          </Link>
        </div>
      </div>
    );
  }

  const settingCards = [
    { id: 'site', title: 'Site Settings', desc: 'Main SEO, Logos, and Contact Details', icon: <FiGlobe />, color: 'text-emerald-400' },
    { id: 'about', title: 'About Component', desc: 'Manage company history and team info', icon: <FiInfo />, color: 'text-blue-400' },
    { id: 'policy', title: 'Policy Component', desc: 'Terms of Service and Privacy Policy', icon: <FiShield />, color: 'text-purple-400' },
    { id: 'faq', title: 'FAQ Component', desc: 'Manage help center questions', icon: <FiHelpCircle />, color: 'text-orange-400' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className='pt-4 mb-10'>
        <div className="px-2 max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-black text-black uppercase italic">
              System <span className="text-blue-600">Configurations</span>
            </h1>
          </div>

          <div className='flex items-center gap-7'>
            <div className="hidden md:block text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase">Auth Level</p>
              <p className="text-emerald-400 font-black italic">CEO PRIVILEGE</p>
            </div>

            <Link href="/admin" className="md:px-10 p-3 bg-white rounded-md md:rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all self-start md:self-auto">
              <FiNavigation className="text-[#0B2A4A]" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 md:px-6">
        {!activeTab ? (
          /* Grid of Setting Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {settingCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setActiveTab(card.id)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-500/50 hover:shadow-xl transition-all group text-left"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all ${card.color}`}>
                  {card.icon}
                </div>
                <h3 className="font-black uppercase italic text-[#0B2A4A] mb-2 group-hover:text-blue-600">{card.title}</h3>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase">{card.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Configure Now <span>→</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Sub-Component View */
          <div className="bg-white md:rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <button
                onClick={() => setActiveTab(null)}
                className="text-[10px] font-black uppercase text-gray-500 hover:text-blue-600 flex items-center gap-2"
              >
                <FiArrowLeft /> Back to Selection
              </button>
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Editing: {activeTab}
              </span>
            </div>

            <div className="p-2 md:p-8">
              {activeTab === 'about' && <AboutSettings />}
              {activeTab === 'site' && <SiteSettings />}
              {activeTab === 'policy' && <PolicySettings />}
              {activeTab === 'faq' && <FaqSettings />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}