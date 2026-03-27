"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import Link from "next/link";

export default function AboutPageUi() {
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null); // New state for site_configs
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 1. Fetch About Page Content
  useEffect(() => {
    const unsubAbout = onSnapshot(doc(db, "cms", "about_page"), (snap) => {
      if (snap.exists()) setData(snap.data());
    });
    return unsubAbout;
  }, []);

  // 2. Fetch Global Configs (Contact info, Site Name, etc.)
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "site_configs", "general"), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
      setLoading(false);
    });
    return unsubConfig;
  }, []);

  // 3. Image Interval logic
  useEffect(() => {
    if (!data?.heroImages?.length) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % data.heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;
  if (!data || !config) return null;

  return (
    <div className="mt-0 md:pb-20 flex justify-center min-h-screen bg-gray-100">
      <main className="">
        <div className="max-w-6xl mx-auto bg-white shadow-lg">

          {/* HEADER CONTENT */}
          <div className="text-center">            
            <div className="w-full h-48 sm:h-64 overflow-hidden border-2 border-gray-50 shadow-xl mb-6 bg-gray-200">
              <img 
                src={data.heroImages[currentImageIndex] || "/about.jpg"} 
                className="w-full h-full object-cover transition-opacity duration-1000"
                loading="lazy"
              />
            </div>
            
            <h1 className="px-4 text-2xl sm:text-4xl font-extrabold text-emerald-900">
              {data.title || "About Our Car Platform"}
            </h1>
            <p className="text-orange-800 mb-6 text-sm font-semibold italic">
              {data.subtitle}
            </p>
          </div>

          <div className="p-4 md:mx-8">
            <div className="border-t border-gray-300 my-6"></div>

            {/* INTRO PARAGRAPHS */}
            <div className="space-y-6">
              {data.introParagraphs?.map((para: string, idx: number) => (
                <section key={idx}>
                  <p className="text-gray-700 text-lg leading-relaxed">{para}</p>
                </section>
              ))}
            </div>

            {/* VISION & MISSION */}
            <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{data.visionText}</p>
            </div>

            <div className="mt-12 bg-gradient-to-r from-blue-50 to-gray-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{data.missionText}</p>
            </div>

            {/* WHY CHOOSE US */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Us?</h2>
              <div className="space-y-6">
                {data.whyChooseUs?.map((item: any, idx: number) => (
                  <div key={idx} className={`bg-white border-l-4 pl-4 py-3 ${
                    idx === 0 ? 'border-green-600' : idx === 1 ? 'border-blue-600' : 'border-orange-600'
                  }`}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
                    <p className="text-gray-700">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* GENERAL ASSISTANCE SECTION - NOW USING CONFIG STATE */}
            <div className="mt-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-4">Need Assistance?</h2>
              <p className="mb-6 text-lg">Our dedicated support team is ready to help with any transport or loading concerns.</p>
              
              <Link 
                href="/contact" 
                className="inline-block bg-white text-green-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                Contact Help Desk
              </Link>

              <p className="mt-6 text-white/90">
                <strong>Email:</strong> <a href={`mailto:${config.generalContact?.email}`}>{config.generalContact?.email}</a><br />
                <strong>Phone:</strong> <a href={`tel:${config.generalContact?.phone}`}>{config.generalContact?.phone}</a><br />
              </p>
            </div>

            {/* CEO CARD - NOW USING CONFIG STATE */}
            <div className="mt-16 bg-gray-50 border-2 border-green-600/20 rounded-xl p-4 md:p-6 sm:p-10 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-60 h-80 shrink-0 rounded-xl overflow-hidden shadow-2xl border-4 border-white bg-gray-200">
                  <img src={data.ceoImage} alt={data.ceoName} className="w-full h-full object-cover" />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    {data.ceoName?.split(' ').slice(0, -1).join(' ')} <span className="text-green-600 uppercase">{data.ceoName?.split(' ').pop()}</span>
                  </h2>
                  <p className="text-blue-700 font-bold text-lg mb-4">Founder & CEO</p>
                  <p className="text-gray-700 text-lg italic leading-relaxed mb-6">"{data.ceoQuote}"</p>
                  
                  <a 
                    href={`mailto:${config.ceoContact?.email}`} 
                    className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all"
                  >
                    Message the CEO
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center pb-8">
              <h3 className="text-2xl font-bold text-blue-700 mb-4">Thank You for Choosing Us</h3>
              <p className="text-gray-800 font-semibold text-xl">Together, we're moving Nigeria forward.</p>
              <div className="mt-8 pt-6 border-t border-gray-300 text-gray-600">
                <p>&copy; {new Date().getFullYear()} {config.siteNameMain} {config.siteNameSub}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}