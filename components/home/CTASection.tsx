"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaShieldAlt, FaStar, FaUsers, FaArrowRight } from "react-icons/fa";

export default function CTASection({ user, stats, data }: any) {
  const router = useRouter();
  
  // Populating from your homePage -> cta map
  const content = data || {};

  return (
    <section className="py-20 bg-gradient-to-r from-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          {content.title || "Ready to Get Started?"}
        </h2>
        
        <p className="text-xl text-gray-300 mb-10">
          {content.description || "Join thousands of Nigerians who trust Nomo Cars."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={() => router.push(user ? "/user/mobility" : "/signup")}
            className="bg-blue-500 text-gray-50 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-300 transition-all flex items-center justify-center gap-3"
          >
            {user ? "Explore Our Services" : "Sign Up Free"}
            <FaArrowRight />
          </button>
          
          <Link 
            href={"/about"} 
            className="bg-white/10 border border-white/20 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
          >
            {"Learn More"}
          </Link>
        </div>
        
        <div className="mt-12 pt-12 border-t border-white/20 flex flex-col sm:flex-row justify-center items-center gap-8 text-sm">
          <FooterStat icon={<FaShieldAlt className="text-green-400" />} text="100% Secure" />
          
          {/* Using optional chaining to prevent errors if stats are missing */}
          <FooterStat 
            icon={<FaStar className="text-yellow-400" />} 
            text={`Rated ${(stats?.rating || 4.9).toFixed(1)}`} 
          />
          
          <FooterStat 
            icon={<FaUsers className="text-blue-400" />} 
            text={`${(stats?.drivers || 1000).toLocaleString()}+ Drivers`} 
          />
        </div>
      </div>
    </section>
  );
}

function FooterStat({ icon, text }: any) {
  return (
    <div className="flex items-center gap-3 font-medium uppercase tracking-wider text-[11px]">
      {icon} <span>{text}</span>
    </div>
  );
}
