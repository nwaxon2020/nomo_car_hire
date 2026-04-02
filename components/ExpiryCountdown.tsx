"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0)
    return days + "d " + String(hours).padStart(2, "0") + "h " + String(mins).padStart(2, "0") + "m";
  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}

export default function ExpiryCountdown({ userData }: { userData: any }) {
  const [now, setNow] = useState(new Date());
  const [adminConfig, setAdminConfig] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getDoc(doc(db, "adminfinance", "pricing")).then((snap) => {
      if (snap.exists()) setAdminConfig(snap.data());
    });
  }, []);

  if (!userData) return null;

  // VIP logic
  const vipWarningMs = (adminConfig?.vip?.warningDays ?? 30) * 24 * 60 * 60 * 1000;
  const hasVip = userData.vipLevel > 0 && userData.vipExpiryDate;
  let remainingVipMs = 0;
  if (hasVip) {
     remainingVipMs = userData.vipExpiryDate.toDate().getTime() - now.getTime();
  }
  const inVipWarning = hasVip && remainingVipMs > 0 && remainingVipMs <= vipWarningMs;

  // Ticket logic
  const tickets: any[] = userData.tickets || [];
  const currentTicketType = userData.hasActiveTicket && userData.ticketExpiryDate?.toDate() > now ? userData.ticketType : null;
  const activeTicket = currentTicketType ? 
    tickets.filter(t => t.type === currentTicketType && !t.expired && t.expiryDate?.toDate() > now)
           .sort((a,b) => (b.purchaseDate?.toDate()?.getTime() ?? 0) - (a.purchaseDate?.toDate()?.getTime() ?? 0))[0] : null;
  
  let inTicketWarning = false;
  let remainingTicketMs = 0;
  let ticketWarningMs = 48 * 60 * 60 * 1000; // default
  
  if (activeTicket) {
      const type = activeTicket.type;
      let defaultWarning = 48;
      if (type === 'daily') defaultWarning = 3;
      if (type === 'monthly') defaultWarning = 96;
      ticketWarningMs = (adminConfig?.tickets?.[type]?.warningHours ?? defaultWarning) * 60 * 60 * 1000;
      remainingTicketMs = activeTicket.expiryDate.toDate().getTime() - now.getTime();
      inTicketWarning = remainingTicketMs > 0 && remainingTicketMs <= ticketWarningMs;
  }

  if (!inVipWarning && !inTicketWarning) return null;

  return (
    <div className="flex flex-col gap-2 mb-4 w-full">
      {inVipWarning && (
        <div className="w-full py-2 px-4 rounded-xl text-center bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg">
          <p className="text-[10px] font-bold tracking-widest opacity-80 mb-0.5">⚠ VIP Expires In</p>
          <p className="font-mono text-xl font-black leading-none tabular-nums">
            {formatCountdown(remainingVipMs)}
          </p>
        </div>
      )}
      {inTicketWarning && (
        <div className="w-full py-2 px-4 rounded-xl text-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
          <p className="text-[10px] font-bold tracking-widest opacity-80 mb-0.5">⚠ Ticket Expires In</p>
          <p className="font-mono text-xl font-black leading-none tabular-nums">
            {formatCountdown(remainingTicketMs)}
          </p>
        </div>
      )}
    </div>
  );
}
