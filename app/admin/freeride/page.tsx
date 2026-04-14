"use client";

import FreerideAdmin from "@/components/admin/FreerideAdmin";
import Link from 'next/link';
import { FiNavigation, FiArrowLeft } from 'react-icons/fi';
import { auth } from '@/lib/firebaseConfig';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

export default function FreeridePage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const CEO_ID = process.env.NEXT_PUBLIC_ADMIN_KEY;

  useEffect(() => {
    const checkAuth = async () => {
      // Small delay to ensure auth.currentUser is populated if session exists
      const user = auth.currentUser;
      
      const checkPermissions = async (uid: string) => {
        if (uid === CEO_ID) return true;
        try {
          const staffDoc = await getDoc(doc(db, "adminStaffs", uid));
          if (staffDoc.exists()) {
            const allowedRoutes = staffDoc.data().allowedRoutes || [];
            return allowedRoutes.includes("/admin/freeride");
          }
        } catch (err) {
          console.error("Auth check failed:", err);
        }
        return false;
      };

      if (!user) {
        // Fallback to onAuthStateChanged if immediate check fails
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
          if (u) {
            const authResult = await checkPermissions(u.uid);
            setIsAuthorized(authResult);
          } else {
            setIsAuthorized(false);
          }
          unsubscribe();
        });
      } else {
        const authResult = await checkPermissions(user.uid);
        setIsAuthorized(authResult);
      }
    };

    checkAuth();
  }, [CEO_ID]);

  // Loading State
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Security Gate
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050A0F] text-white p-6">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase italic mb-2 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">Access Denied</h1>
          <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black italic">Unauthorized Access. Security clearance required.</p>
          <Link href="/admin" className="mt-8 inline-block bg-white text-black px-8 py-3 rounded-full font-black uppercase italic text-[10px] hover:bg-gray-200 transition-all">
            Return to Command Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className='pt-6 mb-10'>
        <div className="px-4 max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/admin" className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-[#0B2A4A]">
              <FiArrowLeft  />
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-black uppercase italic">
                Freeride <span className="text-blue-600">Management</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Regulate rewards and manage qualifying customers</p>
            </div>
          </div>

          <div className='flex items-center gap-7'>
            <div className="hidden md:block text-right">
              <p className="text-[8px] text-gray-400 font-black uppercase">Auth Level</p>
              <p className="text-emerald-500 font-black italic text-[10px]">SUPREME COMMAND</p>
            </div>

            <Link href="/admin" className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-blue-600">
              <FiNavigation />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <FreerideAdmin />
      </div>

      <p className="mt-20 pb-10 text-gray-300 font-bold italic text-center text-[8px] uppercase tracking-widest">
        Powered by Nomop Ventures Group&reg; | Command Module v2.0
      </p>
    </div>
  );
}
