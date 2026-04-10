"use client";

import { FiTruck, FiTrendingUp, FiStar, FiTag, FiUsers, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface StatsProps {
  stats: any;
  isCEO: boolean;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
}

export default function AdminStatistics({
  stats,
  isCEO,
  isExpanded,
  setIsExpanded,
}: StatsProps) {

  const vipLevels = [
    { lvl: 1, name: "Green VIP", color: "bg-emerald-500", text: "text-emerald-500" },
    { lvl: 2, name: "Yellow VIP", color: "bg-yellow-400", text: "text-yellow-400" },
    { lvl: 3, name: "Purple VIP", color: "bg-purple-600", text: "text-purple-600" },
    { lvl: 4, name: "Gold VIP", color: "bg-amber-400", text: "text-amber-400" },
    { lvl: 5, name: "Black VIP", color: "bg-gray-50", text: "text-gray-50" },
  ];

  return (
    <div className="bg-[#050A0F] p-4 mb-10 shadow-2xl border border-white/5">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-black uppercase italic text-[#fff]">
          Nomo <span className="text-blue-600">Command Center</span>
        </h1>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-4 items-stretch">
        <MiniStat
          label="Total Revenue"
          value={isCEO ? `₦${stats.totalRevenue.toLocaleString()}` : "CEO Access Only"}
          icon={<FiTrendingUp />}
          color="text-blue-400"
        />

        <div className={`${isExpanded ? 'block' : 'hidden'} md:block relative`}>
          <MiniStat
            label="Tickets"
            value={isCEO ? (
              <span className="flex items-center gap-2">
                ₦{stats.ticketRevenueOnly.toLocaleString()}
                <span className="absolute top-2 right-2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300 font-semibold">
                  {stats.ticketCount}
                </span>
              </span>
            ) : `${stats.ticketCount}`}
            icon={<FiTag />}
            color="text-orange-400"
          />
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>
          <MiniStat
            label="Transport"
            value={isCEO ? `₦${stats.transportRevenueOnly.toLocaleString()}` : "CEO Only"}
            icon={<FiTruck className="rotate-12" />}
            color="text-emerald-400"
          />
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>
          <MiniStat label="Drivers" value={stats.totalDrivers} icon={<FiTruck />} color="text-amber-400" />
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>
          <MiniStat label="Customers" value={stats.totalCustomers} icon={<FiUsers />} color="text-purple-400" />
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} md:block bg-white/5 p-2 rounded flex items-center justify-between border border-white/10 min-h-[58px]`}>
          <p className="w-full text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight">Site Rating ({stats.totalReviews})</p>
          <p className="w-full flex gap-4 items-center mt-1">
            <span className='w-full text-emerald-400 font-semibold text-[10px] whitespace-nowrap'>Reviews ({stats.totalReviews})</span>
            <span className="w-full text-lg font-black text-white flex items-center">{stats.siteRating.toFixed(1)} <FiStar className="text-yellow-400 text-xl fill-current shrink-0 ml-2" /></span>
          </p>
        </div>
      </div>

      {/* VIP Level Tiers */}
      <div className={`${isExpanded ? 'grid' : 'hidden'} md:grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4 md:mb-0`}>
        {vipLevels.map((v) => (
          <div key={v.lvl} className="bg-white/5 border border-white/10 px-3 py-2 rounded flex items-center justify-between group hover:bg-white/10 transition-all">
            <div>
              <p className={`text-[7px] font-black uppercase ${v.text}`}>{v.name}</p>
              <div className="flex gap-0.5 mt-1">
                {[...Array(v.lvl)].map((_, i) => (
                  <FiStar key={i} className={`${v.text} text-[10px] fill-current`} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-black text-sm">{(stats.vipCounts as any)[v.lvl]}</p>
              <p className="text-[6px] text-gray-400 uppercase font-bold">Users</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Toggle Button */}
      <div className='md:hidden flex justify-end mt-2'>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-500 border border-blue-500/30 px-2 py-1 rounded"
        >
          {isExpanded ? 'Hide' : 'More'} {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, color }: any) {
  return (
    <div className="bg-white/5 p-2 rounded border border-white/10 flex items-center gap-3 min-h-[58px]">
      <div className={`${color} text-xl bg-white/5 p-2 rounded-lg shrink-0`}>{icon}</div>
      <div>
        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight">{label}</p>
        <div className="text-lg font-black text-white leading-none mt-1">{value}</div>
      </div>
    </div>
  );
}