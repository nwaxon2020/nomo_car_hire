"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { getDoc, doc, onSnapshot } from "firebase/firestore";
import { 
  FaTachometerAlt, FaHome, FaInfoCircle, FaSignInAlt, 
  FaSignOutAlt, FaCar, FaMobileAlt, FaSuitcase, 
  FaGavel, FaBus, FaQuestionCircle, FaMapMarkerAlt, 
  FaUsers, FaChevronDown, FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube, FaTiktok, FaWhatsapp
} from "react-icons/fa";
import SiteReviews from "@/components/Reviews"; 

// --- Service Link with Hover Hint ---
function ServiceLink({ href, label, icon, hint }: { href: string; label: string; icon: any; hint: string }) {
  return (
    <li className="relative group">
      <div className="absolute bottom-full mb-2 left-0 w-56 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 leading-snug border border-gray-700">
        {hint}
        <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900"></div>
      </div>
      
      <Link href={href} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition py-1 group-hover:translate-x-1 duration-200">
        <span className="text-blue-500 text-sm">{icon}</span>
        <span className="font-medium text-sm md:text-base">{label}</span>
      </Link>
    </li>
  );
}

const getSocialIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'facebook': return <FaFacebook />;
    case 'instagram': return <FaInstagram />;
    case 'x (twitter)': 
    case 'twitter': return <FaTwitter />;
    case 'linkedin': return <FaLinkedin />;
    case 'youtube': return <FaYoutube />;
    case 'tiktok': return <FaTiktok />;
    case 'whatsapp': return <FaWhatsapp />;
    default: return <FaMobileAlt />;
  }
};

export default function Footer() {
  const router = useRouter();
  const pathName = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [config, setConfig] = useState<any>({
    siteNameMain: "Nomo",
    siteNameSub: "Cars",
    logoUrl: "/favicon.png",
    goalStatement: "Nigeria's safest way to hire professional drivers and book reliable transportation.",
    generalContact: { email: "nomopoventures@yahoo.com", phone: "", address: "" },
    socials: []
  });

  useEffect(() => {
    // 1. Real-time Listener for Site Config
    const configRef = doc(db, "site_configs", "general");
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      }
    }, (err) => {
      console.error("Error fetching real-time footer config:", err);
    });

    // 2. Auth State Listener
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const uDoc = await getDoc(doc(db, "users", u.uid));
        if (uDoc.exists()) setIsDriver(!!uDoc.data().isDriver);
      }
      setLoading(false);
    });
    
    // Cleanup both listeners when the component unmounts
    return () => {
      unsubConfig();
      unsubAuth();
    };
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); router.push("/login"); } catch (e) { console.error(e); }
  };

  if (pathName === "/user/chat") return null;

  return (
    <footer className="w-full bg-white">

      {/*REVIEWS*/}
      <div className="mb-1">
          <SiteReviews /> 
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10">
        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 border-t border-gray-100 pt-10 px-2">
          {/* Branding */}
          <div>
            <Link href={"/"} className="p-1 flex gap-2 items-center bg-white rounded-sm w-fit">
              <h2 className="md:text-xl font-extrabold italic text-blue-700 drop-shadow-md">
                {config.siteNameMain} <span className="text-yellow-500">{config.siteNameSub}</span>
              </h2>
              <img src={config.logoUrl || "/favicon.png"} alt="logo" className="w-5 h-4 object-contain" />
            </Link>

            <p className="text-gray-600 mt-4 leading-relaxed text-sm font-medium uppercase text-[11px]">
              {config.goalStatement}
            </p>

            {/* Dynamic Socials */}
            <div className="flex gap-4 mt-6">
              {config.socials?.map((social: any, i: number) => (
                <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-all text-xl">
                  {getSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
            <ul className="flex flex-col gap-3">
              <ServiceLink href="/user/car-hire" label="Hire Car" icon={<FaCar/>} hint="Private Uber-style service. Rent a car and driver for your exclusive use." />
              <ServiceLink href="/user/booking" label="Booking" icon={<FaGavel/>} hint="A negotiation hub: Drop your request and price, and let drivers bid for your trip." />
              <ServiceLink href="/user/load-booking" label="Load-Booking" icon={<FaSuitcase/>} hint="Shared travel: Book a specific vacant seat in a vehicle heading your way." />
              <ServiceLink href="/user/transport" label="Transport" icon={<FaBus/>} hint="View prices and routes from major transport companies across Nigeria." />
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation</h2>
            <ul className="flex flex-col gap-3 text-gray-700">
              <li><Link href="/" className="flex items-center gap-2 hover:text-blue-600 text-sm"><FaHome/> Home</Link></li>
              
              {/* About Dropdown */}
              <li 
                className="relative group"
                onMouseEnter={() => setAboutOpen(true)}
                onMouseLeave={() => setAboutOpen(false)}
              >
                <button 
                  onClick={() => setAboutOpen(!aboutOpen)}
                  className="flex items-center justify-between w-full md:w-auto gap-2 hover:text-blue-600 text-sm transition-colors"
                >
                  <span className="flex items-center gap-2"><FaInfoCircle/> About</span>
                  <FaChevronDown className={`text-[10px] transition-transform duration-300 ${aboutOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <div className={`
                  md:absolute left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 transition-all duration-300
                  ${aboutOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 md:h-auto h-0 overflow-hidden'}
                `}>
                  <ul className="p-2 flex flex-col gap-1">
                    <li>
                      <Link href="/about" className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors">
                        <FaInfoCircle className="text-blue-500"/> About Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/faq" className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors">
                        <FaQuestionCircle className="text-blue-500"/> FAQ
                      </Link>
                    </li>
                    <li>
                      <Link href="/location" className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors">
                        <FaMapMarkerAlt className="text-blue-500"/> Location
                      </Link>
                    </li>
                  </ul>
                </div>
              </li>

              <li><Link href="/join-us" className="flex items-center gap-2 hover:text-blue-600 text-sm"><FaUsers/> Join our team</Link></li>

              {user && <li><Link href={isDriver ? `/user/driver-profile/${user.uid}` : `/user/profile/${user.uid}`} className="flex items-center gap-2 hover:text-blue-600 text-sm"><FaTachometerAlt/> Dashboard</Link></li>}
              <li><Link href={`mailto:${config.generalContact.email}`} className="flex items-center gap-2 hover:text-blue-600 text-sm"><FaMobileAlt/> Contact Us</Link></li>
            </ul>
          </div>

          {/* Account & Delete Section */}
          <div className="flex flex-col items-start md:items-end">
            <h3 className="font-semibold text-xl text-gray-900 mb-4">Account</h3>
            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition text-sm font-bold">
                <FaSignOutAlt /> Logout
              </button>
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition text-sm font-bold">
                <FaSignInAlt /> Login
              </Link>
            )}

            {user && (
              <div className="mt-8 underline text-gray-500 hover:text-red-600 text-sm transition">
                <Link href="/delete-account">Delete Account</Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between text-gray-500 text-[11px]">
          <p>© {new Date().getFullYear()} <span className="font-semibold">{config.siteNameMain} {config.siteNameSub}</span>. All rights reserved.</p>
          
          <div className="flex gap-4">
            <Link className="font-black hover:text-blue-600" href={"/policy"}>Privacy Policy</Link>
            <p>Last Updated: <span className="font-semibold text-gray-900">2026-03-24</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
}