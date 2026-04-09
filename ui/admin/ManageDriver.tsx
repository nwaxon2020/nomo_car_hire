"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import Link from "next/link";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import DriverCard from "@/components/adminManageDrivers/DriverCard";
import DriverProfileView from "@/components/adminManageDrivers/DriverProfileView";
import { FaSearch, FaCalendarAlt } from "react-icons/fa";
import { FiNavigation } from "react-icons/fi"

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterNewOnly, setFilterNewOnly] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("isDriver", "==", true));
    return onSnapshot(q, (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const filtered = drivers.filter(d => {
    // 1. Search Logic
    const fullName = `${d.firstName || ""} ${d.lastName || ""}`.toLowerCase();
    const searchLower = search.toLowerCase();
    const matchesSearch = fullName.includes(searchLower) || d.uid?.toLowerCase().includes(searchLower);

    // 2. Just Joined Logic
    const isNew = d.justJoined === true;

    // Apply multiple filters
    let passes = matchesSearch;

    // Existing filters
    if (filterNewOnly) passes = passes && isNew;

    return passes;
  });

  const handleSelectDriver = async (driver: any) => {
    setSelectedDriver(driver);
    if (driver.newCarCount > 0) {
      try {
        await updateDoc(doc(db, "users", driver.id), { newCarCount: 0 });
      } catch (err) {
        console.error("Reset failed", err);
      }
    }
  };

  return (
    <div className="px-4 py-6 md:px-6 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-start justify-between md:items-center gap-4">
          <div className="flex flex-col items-center">
            <h1 className="text-xl md:text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Drivers Master List</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Managing {drivers.length} Registered Drivers</p>
          </div>

          {/*Navigation Back*/}
          <Link href="/admin" className="md:hidden flex justify-center items-center p-3 bg-white rounded-md md:rounded-xl border border-gray-100 shadow-sm transition-all">
            <FiNavigation className="text-[#0B2A4A]" />
          </Link>
        </div>

        <div className="px-1 flex flex-col md:flex-row  gap-3 w-full md:w-auto">
          {/* SEARCH BAR */}
          <div className="relative flex-1 md:w-64">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              className="pl-10 pr-4 py-2 w-full border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white shadow-sm"
              placeholder="Search Name or ID..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>



          {/* filter buttons */}
          <div className="flex flex-row gap-2">
            {/* 60-DAY FILTER */}
            <button
              onClick={() => setFilterNewOnly(!filterNewOnly)}
              className={`px-4 py-3 md:py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border-2 
              ${filterNewOnly ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:border-green-400 shadow-sm'}`}
            >
              <FaCalendarAlt /> New (60D)
            </button>

            {/*Navigation Back*/}
            <Link href="/admin" className="hidden md:flex justify-center items-center p-3 bg-white rounded-md md:rounded-xl border border-gray-100 shadow-sm transition-all">
              <FiNavigation className="text-[#0B2A4A]" />
            </Link>
          </div>

        </div>
      </header>

      <div className="px-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(driver => (
          <DriverCard
            key={driver.id}
            driver={driver}
            onClick={() => handleSelectDriver(driver)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
          <FaSearch size={48} className="mb-4" />
          <p className="font-black uppercase tracking-widest text-sm">No Drivers Match These Filters</p>
        </div>
      )}

      {selectedDriver && (
        <DriverProfileView
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  );
}