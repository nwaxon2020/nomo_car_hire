"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { 
  FaTachometerAlt, FaHome, FaInfoCircle, FaUserPlus, 
  FaSignInAlt, FaSignOutAlt, FaCar, FaMobileAlt
} from "react-icons/fa";

export default function Footer() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = auth.onAuthStateChanged(
      async (firebaseUser) => {
        if (!isMounted) return;
        
        try {
          setUser(firebaseUser);
          
          if (firebaseUser) {
            // Validate user ID format
            if (!isValidUserId(firebaseUser.uid)) {
              console.warn("Invalid user ID format detected");
              setIsDriver(false);
              return;
            }
            
            await fetchUserProfile(firebaseUser.uid);
          } else {
            setIsDriver(false);
          }
        } catch (error) {
          console.error("Auth error:", error);
          setError("Authentication error");
        } finally {
          if (isMounted) setLoading(false);
        }
      },
      (error) => {
        if (isMounted) {
          console.error("Auth listener error:", error);
          setError("Authentication error");
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Validate user ID format
  const isValidUserId = (userId: string): boolean => {
    // Firebase UIDs are typically 28 characters, but we'll check for reasonable length
    return typeof userId === 'string' && userId.length >= 10 && userId.length <= 50;
  };

  // Secure user profile fetch
  const fetchUserProfile = async (userId: string) => {
    if (!isValidUserId(userId)) {
      console.warn("Invalid user ID format");
      setIsDriver(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 5000)
      );
      
      const userRef = doc(db, "users", userId);
      const fetchPromise = getDoc(userRef);
      
      const userDoc = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Only extract necessary boolean flag
        setIsDriver(Boolean(data.isDriver));
      } else {
        setIsDriver(false);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      setIsDriver(false);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // Secure logout
  const handleLogout = async () => {
    try {
      // Prevent double clicks
      if (loading) return;
      
      setLoading(true);
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      setError("Logout failed");
    } finally {
      setLoading(false);
    }
  };

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
              Nigeria's safest and simplest way to hire professional drivers
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
              
              {user && (
                <FooterLink 
                  href={isDriver ? `/user/driver-profile/${user.uid}` : `/user/profile/${user.uid}`} 
                  label="Dashboard" 
                  icon={<FaTachometerAlt />} 
                  disabled={loading}
                />
              )}
              
              <FooterLink href="/policy" label="Policy" icon={<FaInfoCircle />} />
              <FooterLink href="/hire" label="Hire a Car" icon={<FaCar />} />
              <FooterLink 
                href="mailto:nomopoventures@yahoo.com" 
                label="Contact Us" 
                icon={<FaMobileAlt />} 
                isExternal={true}
              />
            </ul>
          </div>

          {/* Account */}
          <div className="flex flex-col items-start sm:items-end">
            <h3 className="p-2 text-lg font-semibold text-gray-900 mb-4">Account</h3>

            {user ? (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-600 text-white shadow hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSignOutAlt /> 
                {loading ? "Processing..." : "Logout"}
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 transition-all duration-300"
              >
                <FaSignInAlt /> Login
              </Link>
            )}

            {user && (
              <div className="p-2 mt-12 sm:mt-20 underline text-gray-700">
                <Link href="/delete-account">Delete Account</Link>
              </div>
            )}
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

/* Footer Link Component with Security */
interface FooterLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  isExternal?: boolean;
}

function FooterLink({ href, label, icon, disabled = false, isExternal = false }: FooterLinkProps) {
  if (disabled) {
    return (
      <li className="opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-3 text-gray-500">
          <span className="text-lg">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
      </li>
    );
  }

  if (isExternal || href.startsWith('http') || href.startsWith('mailto:')) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-gray-700 hover:text-blue-600 relative group transition"
        >
          <span className="absolute -left-3 h-7 w-7 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></span>
          <span className="text-lg z-10">{icon}</span>
          <span className="z-10 font-medium">{label}</span>
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 text-gray-700 hover:text-blue-600 relative group transition"
      >
        <span className="absolute -left-3 h-7 w-7 bg-blue-100 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></span>
        <span className="text-lg z-10">{icon}</span>
        <span className="z-10 font-medium">{label}</span>
      </Link>
    </li>
  );
}