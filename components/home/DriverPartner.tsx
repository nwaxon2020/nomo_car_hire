"use client";

import { useRouter } from "next/navigation";
import { FaCrown, FaCheckCircle, FaArrowRight, FaStar, FaShieldAlt, FaCar, FaWallet, FaClock, FaUsers, FaUserCheck, FaGem, FaUserShield, FaUserPlus } from "react-icons/fa";

const IconComponent = ({ name, className }: { name: string; className: string }) => {
  const icons: any = {
    FaCrown: <FaCrown />,
    FaCheckCircle: <FaCheckCircle />,
    FaStar: <FaStar />,
    FaShieldAlt: <FaShieldAlt />,
    FaCar: <FaCar />,
    FaWallet: <FaWallet />,
    FaClock: <FaClock />,
    FaUsers: <FaUsers />,
    FaUserCheck: <FaUserCheck />,
    FaGem: <FaGem />,
    FaUserShield: <FaUserShield />,
  };
  return icons[name] || <FaCheckCircle className={className} />;
};

export default function DriverPartner({ user, isDriver, data }: any) {
  const router = useRouter();
  const content = data || {};

  const getUserDisplayName = () => {
    if (!user) return "User";
    const nameSource = user.firstName || user.fullName || user.userName || user.displayName || "";
    if (!nameSource) return "User";
    const cleanFirstName = nameSource.trim().split(/\s+/)[0];
    return cleanFirstName || "User";
  };

  const handleRegisterDriver = () => {
    if (user) {
      router.push(isDriver ? `/user/driver-profile/${user.uid}` : "/user/driver-register");
    } else {
      router.push("/signup?type=driver");
    }
  };

  const sectionStyle = {
    backgroundImage: content.backgroundImage
      ? `linear-gradient(rgba(30, 58, 138, 0.9), rgba(23, 37, 75, 0.9)), url("${content.backgroundImage}")`
      : `linear-gradient(to right, #1e3a8a, #1e40af)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <section style={sectionStyle} className="py-20 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex justify-center md:inline-flex items-center gap-2 border-2 border-yellow-400 px-4 py-2 rounded-full mb-6">
              <IconComponent name={content.sectionIcon || "FaCrown"} className="text-yellow-300" />
              <span className="text-sm font-medium">{"Partnership"}</span>
            </div>

            <h2 className="text-center md:text-left text-3xl md:text-4xl font-bold mb-4">
              {content.title || "Become a Driver Partner"}
            </h2>
            <p className="text-center md:text-left text-xl text-blue-100 mb-8">
              {content.description || "Earn Money on Your Schedule"}
            </p>

            <div className="space-y-4 mb-8">
              {(content.benefits || []).map((benefit: any) => (
                <CheckItem
                  key={benefit.id}
                  title={benefit.title}
                  desc={benefit.description}
                  icon={content.sectionIcon}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={handleRegisterDriver}
                className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isDriver ? 'Go to Driver Dashboard' : (content.primaryButtonText || "Start Driving")}
                <FaArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-8 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
              {(content.stats || []).map((stat: any) => (
                <StatCard key={stat.id} val={stat.value} label={stat.label} />
              ))}
            </div>

            <div className="text-center">
              {user ? (
                <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 text-sm font-bold tracking-wide">
                  {isDriver ? (
                    <span className="flex items-center gap-2">
                      <FaUserShield className="text-green-400" /> You are already a Driver
                    </span>
                  ) : (
                    <span>Welcome, {getUserDisplayName()}</span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push("/signup")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10 text-sm font-bold tracking-wide hover:bg-white/30 transition-all cursor-pointer"
                >
                  <FaUserPlus className="text-yellow-300" /> Join Us
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckItem({ title, desc, icon }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-yellow-300 text-xl mt-1">
        <IconComponent name={icon || "FaCheckCircle"} className="" />
      </div>
      <div>
        <h4 className="font-bold text-lg leading-tight">{title}</h4>
        <p className="text-blue-100 text-sm md:text-base">{desc}</p>
      </div>
    </div>
  );
}

function StatCard({ val, label }: any) {
  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center border border-white/10 hover:bg-white/30 transition-all">
      <div className="text-2xl md:text-3xl font-bold mb-1">{val}</div>
      <div className="text-xs md:text-sm text-blue-100 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}