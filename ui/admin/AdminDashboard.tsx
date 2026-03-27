"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { FiSettings, FiShield, FiUserPlus, FiBriefcase } from 'react-icons/fi';
import { FaCar } from "react-icons/fa";
import AdminStatistics from '@/components/admin/AdminStatistics'; // Import the new component

export default function AdminDashboardUi() {
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({
    applicants: 0,
    complaints: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const MOCK_TICKET_REVENUE = 100000000;
  const MOCK_TICKET_COUNT = 4;

  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    vipRevenueOnly: 0,
    siteRating: 0,
    totalReviews: 0,
    vipCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  const CEO_ID = process.env.NEXT_PUBLIC_ADMIN_KEY;
  const isCEO = auth.currentUser?.uid === CEO_ID;

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

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let vipRevenue = 0;
      let drivers = 0;
      let customers = 0;
      const vips = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.isDriver) drivers++;
        else customers++;

        if (data.vipPurchaseHistory && Array.isArray(data.vipPurchaseHistory)) {
          data.vipPurchaseHistory.forEach((item: any) => {
            vipRevenue += (item.price || 0);
          });
        }

        if (data.vipLevel >= 1 && data.vipLevel <= 5) {
          vips[data.vipLevel as keyof typeof vips]++;
        }
      });

      setStats(prev => ({
        ...prev,
        totalDrivers: drivers,
        totalCustomers: customers,
        vipRevenueOnly: vipRevenue,
        totalRevenue: vipRevenue + MOCK_TICKET_REVENUE,
        vipCounts: vips
      }));
    });

    return () => {
      unsubApps();
      unsubComplaints();
      unsubUsers();
      unsubReviews();
    };
  }, []);

  const allCards = [
    { title: "Manage Drivers", icon: <FaCar />, link: "/admin/manage-driver", badge: 0 },
    { title: "Applicants", icon: <FiBriefcase />, link: "/admin/applicants", badge: unreadCounts.applicants },
    { title: "Complaints", icon: <FiUserPlus />, link: "/admin/complaints", badge: unreadCounts.complaints },
    { title: "Add Staff", icon: <FiShield />, link: "/admin/add-staff", badge: 0 },
    { title: "Settings", icon: <FiSettings />, link: "/admin/admin-settings", badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Replaced old Stat section with the new Component */}
      <AdminStatistics 
        stats={stats} 
        isCEO={isCEO} 
        isExpanded={isExpanded} 
        setIsExpanded={setIsExpanded}
        MOCK_TICKET_REVENUE={MOCK_TICKET_REVENUE}
        MOCK_TICKET_COUNT={MOCK_TICKET_COUNT}
      />
      
      {/* --- ACTION CARDS --- */}
      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {allCards.map((card) => {
          const canSee = isCEO || allowedRoutes.includes(card.link);
          if (!canSee) return null;

          return (
            <Link href={card.link} key={card.link}>
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