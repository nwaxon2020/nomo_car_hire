"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiMinus, FiHelpCircle, FiCalendar, 
  FiCreditCard, FiShield, FiMessageSquare,
  FiArrowRight, FiSearch, FiX, FiTruck, FiStar
} from 'react-icons/fi';
import Link from 'next/link';
import { db } from '@/lib/firebaseConfig'
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';

const FaqPageUi = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- DATABASE STATES ---
  const [faqSubtitle, setFaqSubtitle] = useState("Your guide to seamless mobility and excellence");
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [contactPhone, setContactPhone] = useState("2349023688246"); // Default fallback

  // --- REAL-TIME DATA FETCHING ---
  useEffect(() => {
    // 1. Listen for FAQ Settings (Subtitle) and Contact Info
    const unsubSettings = onSnapshot(doc(db, "site_configs", "general"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFaqSubtitle(data.faqSubtitle || '');
        if (data.generalContact?.phone) {
          // Remove any '+', spaces or dashes for the WhatsApp URL
          const rawPhone = data.generalContact.phone.replace(/\D/g, '');
          setContactPhone(rawPhone);
        }
      }
    });

    // 3. Listen for Categories
    const unsubCategories = onSnapshot(
      query(collection(db, "faq_categories"), orderBy("order", "asc")),
      (snap) => {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    // 4. Listen for Questions
    const unsubQuestions = onSnapshot(
      query(collection(db, "faq_questions"), orderBy("order", "asc")),
      (snap) => {
        setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => { 
      unsubSettings(); 
      unsubCategories(); 
      unsubQuestions(); 
    };
  }, []);

  // --- FILTER LOGIC ---
  const filteredCategories = useMemo(() => {
    const data = categories.map(cat => ({
      category: cat.name,
      id: cat.id,
      questions: questions.filter(q => q.categoryId === cat.id)
    }));

    if (!searchQuery) return data.filter(cat => cat.questions.length > 0);
    
    return data.map(cat => ({
      ...cat,
      questions: cat.questions.filter(q => 
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(cat => cat.questions.length > 0);
  }, [searchQuery, categories, questions]);

  const getIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('car') || cat.includes('rent') || cat.includes('hire')) return <FiCalendar />;
    if (cat.includes('pay') || cat.includes('pric')) return <FiCreditCard />;
    if (cat.includes('logistics') || cat.includes('haulage')) return <FiTruck />;
    return <FiShield />;
  };



  return (
    <div className="bg-[#f8fafc] min-h-screen pt-8 pb-20 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="text-center mb-4">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black uppercase italic text-slate-900 tracking-tighter"
          >
            Frequently Asked <span className="text-blue-700">Questions</span>
          </motion.h1>
          <p className="text-slate-500 mt-4 text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] max-w-2xl mx-auto leading-loose">
            {faqSubtitle}
          </p>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="relative max-w-2xl mx-auto mb-12 md:mb-16">
          <div className="relative group">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search services, pricing or support..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-14 pr-14 text-sm font-medium outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all shadow-sm text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <FiX size={14} className="text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* --- FAQ CONTENT --- */}
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category, catIndex) => (
            <motion.div layout key={category.id} className="mb-12">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                <span className="text-blue-700 text-xl">{getIcon(category.category)}</span>
                <h2 className="text-sm font-black uppercase tracking-widest text-blue-800">
                  {category.category}
                </h2>
              </div>

              <div className="space-y-4">
                {category.questions.map((item: any, qIndex: number) => {
                  const uniqueKey = catIndex * 1000 + qIndex;
                  const isOpen = activeIndex === uniqueKey;

                  return (
                    <div key={item.id} className={`bg-white rounded-lg border transition-all duration-300 ${isOpen ? 'border-blue-600 shadow-xl shadow-blue-600/5' : 'border-slate-100'}`}>
                      <button 
                        onClick={() => setActiveIndex(isOpen ? null : uniqueKey)} 
                        className="w-full flex items-center justify-between p-5 text-left group"
                      >
                        <span className={`text-xs md:text-sm font-bold uppercase tracking-tight transition-colors ${isOpen ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-600'}`}>
                          {item.q}
                        </span>
                        <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-blue-700 text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {isOpen ? <FiMinus size={14} /> : <FiPlus size={14} />}
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-6 pb-6 pt-5 text-[12px] md:text-[13px] text-slate-500 leading-relaxed border-t border-slate-50 mx-5">
                              {item.a}
                              {item.link && (
                                <div className="mt-4">
                                  <Link href={item.link} className="inline-flex items-center gap-2 text-blue-700 font-black uppercase text-[10px] tracking-widest hover:underline">
                                    {item.linkText || "View Details"} <FiArrowRight />
                                  </Link>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <FiHelpCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-900 font-black uppercase text-sm tracking-tighter">No information found for "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} className="text-blue-700 text-[10px] font-bold uppercase mt-2 hover:underline">Reset Search</button>
          </div>
        )}



        {/* --- SUPPORT CTA --- */}
        <div className="mt-20 p-10 bg-[#0a192f] rounded-lg text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />
          <div className="flex flex-col items-center relative z-10">
            <FiMessageSquare size={24} className='mb-2 text-blue-400'/>
            <h3 className="text-white font-black uppercase text-lg mb-2 italic tracking-tighter">Need live assistance?</h3>
            <p className="text-slate-400 text-[10px] mb-8 font-bold uppercase tracking-widest">
              Our team is available 24/7 for urgent inquiries and support
            </p>
            <a 
               href={`https://wa.me/${contactPhone}`} target="_blank" rel="noopener noreferrer"
                className="bg-blue-700 text-white px-12 py-4 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(29,78,216,0.4)]"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqPageUi;