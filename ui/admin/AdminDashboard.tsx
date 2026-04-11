"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { FiSettings, FiShield, FiUserPlus, FiBriefcase, FiDollarSign } from 'react-icons/fi';
import { FaCar } from "react-icons/fa";
import AdminStatistics from '@/components/admin/AdminStatistics';

export default function AdminDashboardUi() {
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({
    applicants: 0,
    complaints: 0,
    manageDrivers: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSeenDriversCount, setLastSeenDriversCount] = useState(0);

  // Initialize stats with ticket-specific fields
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    vipRevenueOnly: 0,
    ticketRevenueOnly: 0, 
    transportRevenueOnly: 0,
    ticketCount: 0,        
    siteRating: 0,
    totalReviews: 0,
    vipCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  const CEO_ID = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const isCEO = auth.currentUser?.uid === CEO_ID;

  useEffect(() => {
    const saved = localStorage.getItem('admin_seen_drivers_count');
    if (saved) setLastSeenDriversCount(parseInt(saved));
  }, []);

  useEffect(() => {
    const fetchPerms = async () => {
      if (isCEO) return;
      const staffDoc = await getDoc(doc(db, "adminStaffs", auth.currentUser?.uid || ""));
      if (staffDoc.exists()) {
        setAllowedRoutes(staffDoc.data().allowedRoutes || []);
      }
    };
    fetchPerms();
  }, [isCEO]);

  useEffect(() => {
    const unsubApps = onSnapshot(query(collection(db, "employment_applications"), where("status", "!=", "read")), (snap) => {
      setUnreadCounts(prev => ({ ...prev, applicants: snap.size }));
    });
    const unsubComplaints = onSnapshot(query(collection(db, "complains"), where("status", "!=", "read")), (snap) => {
      setUnreadCounts(prev => ({ ...prev, complaints: snap.size }));
    });

    const unsubNewDrivers = onSnapshot(query(collection(db, "users"), where("isDriver", "==", true), where("verified", "==", false)), (dSnap) => {
      const unsubNewVehicles = onSnapshot(collection(db, "vehicleLog"), (vSnap) => {
        setUnreadCounts(prev => ({ ...prev, manageDrivers: dSnap.size + vSnap.size }));
      });
      return () => unsubNewVehicles();
    });

    const unsubReviews = onSnapshot(collection(db, "generalSiteReviews"), (snap) => {
      let totalScore = 0;
      snap.docs.forEach(doc => {
        totalScore += (doc.data().rating || 0);
      });
      setStats(prev => ({
        ...prev,
        totalReviews: snap.size,
        siteRating: snap.size > 0 ? totalScore / snap.size : 0
      }));
    });

    // --- CORRECTED TICKETING & REVENUE LOGIC ---
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let vipRevenue = 0;
      let ticketRevenue = 0;
      let validTicketUserCount = 0;
      let drivers = 0;
      let customers = 0;
      const vips = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.isDriver) drivers++;
        else customers++;

        // Calculate VIP Revenue
        if (data.vipHistory && Array.isArray(data.vipHistory)) {
          data.vipHistory.forEach((item: { price: any }) => {
            const priceVal = Number(item.price);
            if (!isNaN(priceVal)) vipRevenue += priceVal;
          });
        }

        // Target 'tickets' array for Revenue and Valid User count
        if (data.tickets && Array.isArray(data.tickets)) {
          let userHasActiveTicket = false;

          data.tickets.forEach((ticket: { amount?: any; expired?: boolean }) => {
            // Add all money ever spent on tickets to revenue
            const ticketAmt = Number(ticket.amount);
            if (!isNaN(ticketAmt)) ticketRevenue += ticketAmt;

            // If even one ticket in their array is not expired, they are a valid user
            if (ticket.expired === false) {
              userHasActiveTicket = true;
            }
          });

          if (userHasActiveTicket) validTicketUserCount++;
        }

        let calculatedVipLevel = data.vipLevel || 0;
        if (data.vipHistory && Array.isArray(data.vipHistory)) {
          const activeVips = data.vipHistory.filter((v: { expired?: boolean; expiryDate?: { toDate?: () => Date; seconds?: number | string }; level?: number }) => {
            if (v.expired) return false;
            if (!v.expiryDate) return false;
            const expDate = v.expiryDate.toDate ? v.expiryDate.toDate() : new Date(Number(v.expiryDate.seconds) * 1000);
            return expDate > new Date();
          });
          if (activeVips.length > 0) {
            const purchasedLvl = Math.max(...activeVips.map((v: { level?: number }) => v.level || 0));
            calculatedVipLevel = Math.max(calculatedVipLevel, purchasedLvl);
          }
        }

        if (calculatedVipLevel >= 1 && calculatedVipLevel <= 5) {
          vips[calculatedVipLevel as keyof typeof vips]++;
        }
      });

      setStats(prev => {
        const total = vipRevenue + ticketRevenue + (prev.transportRevenueOnly || 0);
        return {
          ...prev,
          totalDrivers: drivers,
          totalCustomers: customers,
          vipRevenueOnly: vipRevenue,
          ticketRevenueOnly: ticketRevenue,
          ticketCount: validTicketUserCount,
          totalRevenue: total,
          vipCounts: vips
        };
      });
    });

    const unsubTransport = onSnapshot(collection(db, "transportCompanies"), (snap) => {
      let transportRevenue = 0;
      snap.docs.forEach(d => {
        const amtVal = Number(d.data().paymentAmount);
        if (!isNaN(amtVal)) transportRevenue += amtVal;
      });
      setStats(prev => ({
        ...prev,
        transportRevenueOnly: transportRevenue,
        totalRevenue: (prev.vipRevenueOnly || 0) + (prev.ticketRevenueOnly || 0) + transportRevenue
      }));
    });

    return () => {
      unsubApps();
      unsubComplaints();
      unsubUsers();
      unsubReviews();
      unsubNewDrivers();
      unsubTransport();
    };
  }, []);

  const handleClearDrivers = () => {
    localStorage.setItem('admin_seen_drivers_count', unreadCounts.manageDrivers.toString());
    setLastSeenDriversCount(unreadCounts.manageDrivers);
  };

  const driverBadgeCount = unreadCounts.manageDrivers > lastSeenDriversCount
    ? unreadCounts.manageDrivers - lastSeenDriversCount
    : 0;

  const allCards = [
    { title: "Manage Drivers", icon: <FaCar />, link: "/admin/manage-driver", badge: driverBadgeCount },
    { title: "Manage Transport Hub", icon: <FiBriefcase />, link: "/admin/manage-transport", badge: 0 },
    { title: "Applicants", icon: <FiBriefcase />, link: "/admin/applicants", badge: unreadCounts.applicants },
    { title: "Broadcast", icon: <FiBriefcase />, link: "/admin/broadcast", badge: 0 },
    { title: "Complaints", icon: <FiUserPlus />, link: "/admin/complaints", badge: unreadCounts.complaints },
    { title: "Finance Management", icon: <FiDollarSign />, link: "/admin/finance-management", badge: 0, ceoOnly: true },
    { title: "Add Staff", icon: <FiShield />, link: "/admin/add-staff", badge: 0 },
    { title: "Settings", icon: <FiSettings />, link: "/admin/admin-settings", badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AdminStatistics
        stats={stats}
        isCEO={isCEO}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      // Removed MOCK props as they are no longer needed
      />

      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {allCards.map((card) => {
          const canSee = isCEO || (allowedRoutes.includes(card.link) && !((card as { ceoOnly?: boolean }).ceoOnly));
          if (!canSee) return null;

          return (
            <Link
              href={card.link}
              key={card.link}
              onClick={() => {
                if (card.title === "Manage Drivers") handleClearDrivers();
              }}
            >
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm hover:shadow-xl transition-all border border-gray-100 group relative overflow-hidden">
                {card.badge > 0 && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-200">
                    {card.badge > 9 ? '9+' : card.badge}
                  </div>
                )}
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {card.icon}
                </div>
                <h3 className="font-black uppercase italic text-[#0B2A4A] group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                  Access Route: {card.link}
                </p>
                <div className="mt-4 flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${card.badge > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                    {card.badge > 0 ? `${card.badge} New Actions` : 'System Clear'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}