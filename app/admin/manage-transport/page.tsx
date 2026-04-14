"use client";

import ManageTransport from "@/ui/admin/ManageTransport";
import Link from 'next/link';
import { FiArrowLeft, FiNavigation } from 'react-icons/fi';

export default function ManageTransportPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Header */}
            <div className='pt-6 mb-10'>
                <div className="px-4 max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-[#0B2A4A]">
                            <FiArrowLeft />
                        </Link>
                        <div>
                            <h1 className="text-lg md:text-2xl font-black text-black uppercase italic">
                                Transport Hub <span className="text-blue-600">Management</span>
                            </h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Manage all registered transport companies and partners</p>
                        </div>
                    </div>

                    <div className='flex items-center gap-7'>
                        <div className="hidden md:block text-right">
                            <p className="text-[8px] text-gray-400 font-black uppercase">Auth Level</p>
                            <p className="text-emerald-500 font-black italic text-[10px]">AUTHORIZED ADMIN</p>
                        </div>

                        <Link href="/admin" className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-blue-600">
                            <FiNavigation />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">
                <ManageTransport />
            </div>

            <p className="mt-20 pb-10 text-gray-300 font-bold italic text-center text-[8px] uppercase tracking-widest">
                Powered by Nomop Ventures Group&reg; | Command Module v2.0
            </p>
        </div>
    );
}
