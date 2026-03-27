"use client";

import Link from "next/link";
import { 
  FaUserCheck, FaArrowRight, FaCar, FaWallet, FaShieldAlt, 
  FaClock, FaStar, FaUsers, FaCrown, FaGem, FaUserShield, FaCheckCircle 
} from "react-icons/fa";

const ICON_MAP: any = {
  FaUserCheck: <FaUserCheck />,
  FaCar: <FaCar />,
  FaWallet: <FaWallet />,
  FaShieldAlt: <FaShieldAlt />,
  FaClock: <FaClock />,
  FaStar: <FaStar />,
  FaUsers: <FaUsers />,
  FaCrown: <FaCrown />,
  FaGem: <FaGem />,
  FaUserShield: <FaUserShield />,
  FaCheckCircle: <FaCheckCircle />,
};

export default function HowItWorks({ user, isDriver, handleBookRide, data }: any) {
  const content = data || {};
  const steps = content.steps || [];

  const cardStyles = [
    { bg: "from-blue-50 to-white", border: "border-blue-100", iconBg: "bg-blue-100", iconCol: "text-blue-600" },
    { bg: "from-yellow-50 to-white", border: "border-yellow-100", iconBg: "bg-yellow-100", iconCol: "text-yellow-600" },
    { bg: "from-green-50 to-white", border: "border-green-100", iconBg: "bg-green-100", iconCol: "text-green-600" },
  ];

  // Helper to inject the User ID into CMS links like "/profile/{id}"
  const formatLink = (link: string) => {
    if (!link) return "/";
    if (user && link.includes("{id}")) {
      return link.replace("{id}", user.uid);
    }
    // If user isn't logged in and tries to go to a profile, redirect to login
    if (!user && link.includes("{id}")) return "/login";
    return link;
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {content.title || "How Nomo Cars Works"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {content.subtitle || "Simple steps to get you moving."}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step: any, index: number) => {
            const style = cardStyles[index % cardStyles.length];
            
            return (
              <div 
                key={step.id || index} 
                className={`bg-gradient-to-br ${style.bg} p-8 rounded-2xl shadow-lg border ${style.border}`}
              >
                <div className={`w-16 h-16 ${style.iconBg} rounded-xl flex items-center justify-center mb-6`}>
                  <div className={`${style.iconCol} text-2xl`}>
                    {ICON_MAP[step.icon] || <FaCar />}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 mb-6">
                  {step.description}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  {/* Logic for Booking Button */}
                  {step.title.toLowerCase().includes("book") ? (
                    <button 
                      onClick={handleBookRide} 
                      className={`${style.iconCol} font-semibold flex items-center gap-2 hover:opacity-80 transition-all`}
                    >
                      {step.buttonText || "Book Ride"} <FaArrowRight />
                    </button>
                  ) : (
                    /* Logic for Profile/General Links */
                    <Link 
                      href={formatLink(step.buttonLink)} 
                      className={`${style.iconCol} font-semibold flex items-center gap-2 hover:opacity-80 transition-all`}
                    >
                      {step.buttonText || "Continue"} <FaArrowRight />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}