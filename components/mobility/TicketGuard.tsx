"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import LoadingRound from "@/components/re-useable-loading";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

interface TicketGuardProps {
  children: React.ReactNode;
}

export default function TicketGuard({ children }: TicketGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [adminConfig, setAdminConfig] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch Admin Finance Config (Pricing)
      const configRef = doc(db, "adminfinance", "pricing");
      const configSnap = await getDoc(configRef);
      const config = configSnap.exists() ? configSnap.data() : null;
      setAdminConfig(config);

      // 2. Listen to User Data
      const userRef = doc(db, "users", user.uid);
      const unsubscribeUser = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserData(data);

          // 3. Enforcement Logic
          if (data.isDriver && config?.startTicketCollect) {
            // Check Ticket Status
            const hasValidTicket = data.hasActiveTicket && 
                                  data.ticketExpiryDate?.toDate() > new Date();

            // Check Trial Period
            const regDate = data.newDriverConfig?.registeredAt?.toDate?.() || 
                            (data.newDriverConfig?.registeredAt ? new Date(data.newDriverConfig.registeredAt) : null);
            
            const trialDays = config.newDriver?.freeTrialDays || 60;
            let isTrialActive = false;
            
            if (regDate) {
              const trialEnd = new Date(regDate);
              trialEnd.setDate(trialEnd.getDate() + trialDays);
              isTrialActive = new Date() < trialEnd;
            }

            if (!hasValidTicket && !isTrialActive) {
              setIsBlocked(true);
            } else {
              setIsBlocked(false);
            }
          } else {
            setIsBlocked(false);
          }
          setLoading(false);
        } else {
          setLoading(false);
        }
      });

      return () => unsubscribeUser();
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040b18] flex items-center justify-center">
        <LoadingRound />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="relative bg-gray-900/50 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">
              <div className="text-6xl mb-6">🎫</div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                Ticket expired
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Please Buy a Ticket to continue accessing customer requests and mobility services.
              </p>
              
              <Link 
                href="/user/ticket"
                className="inline-block w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 uppercase tracking-wider text-sm"
              >
                Buy a Ticket
              </Link>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Security Enforcement Active
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
