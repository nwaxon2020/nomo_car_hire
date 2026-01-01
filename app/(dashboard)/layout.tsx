"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import LoadingDots from "@/components/loading";
import { useUnreadChats } from "@/lib/hooks/useUnreadChats";
import Script from "next/script";

import {
  FaHome,
  FaTachometerAlt,
  FaUserPlus,
  FaCar,
  FaInfoCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaRegCommentDots,
} from "react-icons/fa";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function SidebarPageUi({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [displayName, setDisplayName] = useState("fetching...");
  const [photoURL, setPhotoURL] = useState("/profile.png");
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // FIXED: Properly check for purchase page
  const hideSidebar =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname === "/user/driver-register" ||
    pathname === "/user/purchase"; 
    
  const { unreadCount } = useUnreadChats();

  const getFirstName = (name: string | null | undefined) => {
    if (!name) return "User";
    return name.split(" ")[0];
  };

  const capitalize = (name: string) => {
    if (!name) return "User";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthChecking(true);

      if (!user) {
        // FIX: Don't redirect if on purchase page
        if (!hideSidebar) {
          router.push("/login");
        }
        setAuthChecking(false);
        return;
      }

      setUserId(user.uid);

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        let finalName = "User";
        let photo = user.photoURL || "/profile.png";

        if (snap.exists()) {
          const data = snap.data();
          setIsDriver(data.isDriver === true);

          if (data.isDriver) {
            finalName = getFirstName(data.firstName || user.displayName);
          } else {
            const full = data.fullName || user.displayName || "User";
            finalName = getFirstName(full);
          }

          photo = data.profileImage || user.photoURL || "/profile.png";
        } else {
          finalName = getFirstName(user.displayName);
        }

        finalName = capitalize(finalName);
        setDisplayName(finalName);
        setPhotoURL(photo);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setAuthChecking(false);
      }
    });

    return () => unsub();
  }, [router, hideSidebar]);

  const dashboardRoute = isDriver ? `/user/driver-profile/${userId}` : `/user/profile/${userId}`;

  const menuItems = [
    { name: "Home", href: "/", icon: <FaHome /> },
    { name: "Dashboard", href: dashboardRoute, icon: <FaTachometerAlt /> },
    {
      name: "Chat",
      href: "/user/chat",
      icon: <FaRegCommentDots />,
      unreadCount
    },
    { name: "Hire a Car", href: "/user/car-hire", icon: <FaCar /> },
    !isDriver && { name: "Register as Driver", href: "/user/driver-register", icon: <FaUserPlus /> },
    { name: "About", href: "/about", icon: <FaInfoCircle /> },
    { name: "Logout", icon: <FaSignOutAlt /> },
  ].filter(Boolean);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMsg("Logging Out!");
      setTimeout(() => router.push("/login"), 1500);
    } catch (error) {
      alert("Failed to log out.");
    }
  };

  if (authChecking && !hideSidebar) {
    return (
      <div className="flex min-h-screen bg-gray-100 items-center justify-center">
        <div className="text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="beforeInteractive"
      />
      {/* ADDEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD */}

      <div className="flex min-h-screen bg-gray-100">
        {/* MOBILE TOGGLE - Only show if not on purchase page */}
        {!hideSidebar && !authChecking && (
          <div className="md:hidden absolute top-6 right-4 z-50">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white text-2xl"
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        )}

        {/* SIDEBAR - Only show if not on purchase page */}
        {!hideSidebar && !authChecking && (
          <aside
            className={`z-30 border-r border-gray-50 sm:border-0 fixed top-0 left-0 w-60 bg-black text-white min-h-screen flex flex-col 
              transform transition-transform duration-300
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
              md:translate-x-0 md:static`}
          >
            <div className="p-6 bg-gray-900 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white mb-4">
                <img
                  src={photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/profile.png";
                  }}
                />
              </div>

              {displayName === "fetching..." ? (
                <div className="text-xl font-semibold">
                  <LoadingDots />
                </div>
              ) : (
                <h2 className="text-xl font-bold">
                  <small className="font-normal text-sm">Hello{" "}</small>
                  {displayName}
                </h2>
              )}
            </div>

            <nav className="flex-1 mt-6 flex flex-col">
              {menuItems.map((item: any) => (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.name === "Logout") {
                      handleLogout();
                    } else if (item.href) {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center w-full px-6 py-3 hover:bg-green-800 transition-colors relative
                    ${pathname === item.href ? "bg-gray-800 font-bold" : "font-semibold"}`}
                >
                  <span className="mr-3 text-lg">
                    {item.icon}
                  </span>
                  {item.name}

                  {item.name === "Chat" && unreadCount > 0 && (
                    <span className="absolute right-4 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* MAIN CONTENT - EXACTLY AS YOUR ORIGINAL */}
        <main className="flex-1 p-4 px-1 md:px-2">
          {msg && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-4 text-center">
              {msg}
            </div>
          )}

          {children}
        </main>
      </div>
    </>
  );
}