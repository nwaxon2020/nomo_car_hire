"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";

import { FaHome, FaInfoCircle, FaUserPlus, FaSignInAlt, FaSignOutAlt, FaCar, FaMobileAlt} from "react-icons/fa";

export default function Footer() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => await signOut(auth);

  const lastUpdated = new Date().toLocaleDateString();

  return (
    <footer className="w-full mt-0 bg-gradient-to-br from-[#f6f7f9] to-[#e9eef3] py-12 border-t border-gray-300 shadow-inner">
      <div className="max-w-7xl mx-auto px-6">

        {/* Top Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-14">

          {/* Branding */}
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-wide">
              Nomopo Car Hire
            </h2>

            <p className="text-gray-600 mt-3 leading-relaxed text-[15px]">
              Nigeria’s safest and simplest way to hire professional drivers
              and book reliable transportation.  
              Comfort • Safety • Transparency — every single ride.
            </p>
          </div>

            {/* Navigation Links */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h3>

                <ul className="flex flex-col gap-3 text-gray-700">
                    <FooterLink href="/" label="Home" icon={<FaHome />} />
                    <FooterLink href="/about" label="About" icon={<FaInfoCircle />} />
                    {!user && (
                        <FooterLink href="/signup" label="Sign Up" icon={<FaUserPlus />} />
                    )}
                    <FooterLink href="/policy" label="Policy" icon={<FaInfoCircle />} />

                    <FooterLink href="/hire" label="Hire a Car" icon={<FaCar />} />

                    <FooterLink href="mailto:@nomopoventures@yahoo.com" label="Contact Us" icon={<FaMobileAlt />} />
                </ul>
            </div>

            {/* Account */}
            <div className="flex flex-col items-start sm:items-end">
                <h3 className="p-2 text-lg font-semibold text-gray-900 mb-4">Account</h3>

                {user ? (
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-600 text-white shadow hover:bg-red-700 transition-all duration-300"
                >
                    <FaSignOutAlt /> Logout
                </button>
                ) : (
                <Link
                    href="/login"
                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 transition-all duration-300"
                >
                    <FaSignInAlt /> Login
                </Link>
                )}

                {user && <div className="p-2 mt-12 sm:mt-20 underline text-gray-700"><Link href={"/delete-account"}>Delete Account</Link></div>}
            </div>
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-gray-300"></div>

        {/* Bottom */}
        <div className="flex flex-col text-center sm:flex-row justify-between text-gray-700 text-sm">

          <p>
            © {new Date().getFullYear()}  
            <span className="font-semibold"> Nomopo Ventures</span>.  
            All rights reserved.
          </p>

          <p className="mt-2 sm:mt-0">
            Last Updated:{" "}
            <span className="font-semibold text-gray-900">{lastUpdated}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* Reusable link item component */
function FooterLink({ href, label, icon }: { href: string; label: string; icon: any }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 text-gray-700 hover:text-blue-600 relative group transition"
      >
        {/* Circle animation */}
        <span className="absolute -left-3 h-7 w-7 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></span>

        <span className="text-lg z-10">{icon}</span>
        <span className="z-10 font-medium">{label}</span>
      </Link>
    </li>
  );
}
