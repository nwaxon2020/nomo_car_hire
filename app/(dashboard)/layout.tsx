"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUnreadChats } from "@/lib/hooks/useUnreadChats";
import Script from "next/script";

// Modern Lucide icons
import {
  Home,
  LayoutDashboard,
  UserPlus,
  Car,
  Info,
  LogOut,
  Menu,
  X,
  MessageSquare,
  ChevronDown,
  Bell // Added Bell
} from "lucide-react";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import NotificationPanel from "@/components/notification/Notification"; // Assuming this is your component

export default function SidebarPageUi({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false); // Added for Notif Panel
  const [msg, setMsg] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("/profile.png");
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0); // Added for Bell count

  const router = useRouter();
  const pathname = usePathname();
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
      if (!user) {
        setIsAuthenticated(false);
        const returnUrl = encodeURIComponent(pathname);
        router.replace(`/login?redirect=${returnUrl}`);
        setAuthChecking(false);
        return;
      }

      setUserId(user.uid);
      setIsAuthenticated(true);

      // Real-time listener for user data (including notifications)
      const userDocRef = doc(db, "users", user.uid);
      const unsubDoc = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsDriver(data.isDriver === true);

          let finalName = data.isDriver
            ? getFirstName(data.firstName)
            : getFirstName(data.fullName || user.displayName);

          setDisplayName(capitalize(finalName));
          setPhotoURL(data.profileImage || user.photoURL || "/profile.png");

          // Sync notification count
          const notifs = data.notifications || [];
          const unread = notifs.filter((n: any) => !n.read).length;
          setUnreadNotifs(unread);
        }
      });

      setAuthChecking(false);
      return () => unsubDoc();
    });

    return () => unsub();
  }, [router, pathname]);

  const handleOpenNotifs = async () => {
    setNotifOpen(true);
    if (userId) {
      await updateDoc(doc(db, "users", userId), {
        hasUnreadNotifications: false
      });
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying Account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const dashboardRoute = isDriver ? `/user/driver-profile/${userId}` : `/user/profile/${userId}`;

  const menuItems: any[] = [
    { name: "Home", href: "/", icon: <Home size={20} /> },
    { name: "Dashboard", href: dashboardRoute, icon: <LayoutDashboard size={20} /> },
    { name: "Chat", href: "/user/chat", icon: <MessageSquare size={20} /> },
    { name: "Hire a Car", href: "/user/car-hire", icon: <Car size={20} /> },
    !isDriver && { name: "Register as Driver", href: "/user/driver-register", icon: <UserPlus size={20} /> },
    {
      name: "About",
      icon: <Info size={20} />,
      isDropdown: true,
      subItems: [
        { name: "About Us", href: "/about" },
        { name: "FAQ", href: "/faq" },
        { name: "Location", href: "/location" },
      ]
    },
    { name: "Logout", icon: <LogOut size={20} /> },
  ].filter(Boolean);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMsg("Logging Out!");
      setTimeout(() => window.location.href = "/login", 1000);
    } catch (error) {
      alert("Logout failed.");
    }
  };

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      <div className="flex h-screen bg-gray-100 overflow-hidden">

        {/* Mobile Toggle Button (Position untouched) */}
        <div className="md:hidden absolute top-6 right-4 z-[60]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white text-2xl">
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* STATIC SIDEBAR */}
        <aside className={`
          z-50 fixed top-0 left-0 w-55 bg-black text-white h-screen flex flex-col 
          transform transition-transform duration-300 shadow-2xl
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static
        `}>

          {/* Profile Header */}
          <div className="p-4 pt-8 md:pt-4 bg-gray-900 flex flex-col items-center border-b border-white/5 relative">

            {/* Added Notification Bell in Sidebar Profile Header */}
            <button
              onClick={handleOpenNotifs}
              className="absolute top-10 right-6 md:top-6 md:right-6 p-2 text-gray-300 hover:text-amber-500 transition-colors"
            >
              <Bell size={20} className="text-yellow-400" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotifs}
                </span>
              )}
            </button>

            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 mb-3 shadow-lg">
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-lg font-bold text-center">
              <small className="block font-normal text-[10px] uppercase tracking-wider text-gray-500 mb-1">Welcome back,</small>
              {displayName}
            </h2>
          </div>

          <nav className="flex-1 mt-4 overflow-y-auto px-2 custom-scrollbar">
            {menuItems.map((item: any) => (
              <div key={item.name} className={`mb-1 ${item.name === "Home" ? "md:hidden" : "block"}`}>
                <button
                  onClick={() => {
                    if (item.name === "Logout") handleLogout();
                    else if (item.isDropdown) setAboutOpen(!aboutOpen);
                    else if (item.href) { router.push(item.href); setSidebarOpen(false); }
                  }}
                  className={`flex items-center w-full px-4 py-3.5 rounded-xl hover:bg-green-800 transition-all group relative ${pathname === item.href ? "bg-gray-800 text-green-400 font-semibold" : "text-gray-300 hover:text-white"}`}
                >
                  <span className={`mr-3 transition-colors ${pathname === item.href ? "text-green-400" : "text-gray-500 group-hover:text-white"}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left text-sm">{item.name}</span>

                  {item.name === "Chat" && Number(unreadCount) > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}

                  {item.isDropdown && (
                    <ChevronDown size={14} className={`transition-transform duration-300 ${aboutOpen ? "rotate-180 text-green-400" : "text-gray-500"}`} />
                  )}
                </button>

                {item.isDropdown && aboutOpen && (
                  <div className="mt-1 space-y-1 bg-white/5 rounded-xl overflow-hidden py-1 mx-2">
                    {item.subItems.map((sub: any) => (
                      <button
                        key={sub.name}
                        onClick={() => {
                          router.push(sub.href);
                          setSidebarOpen(false);
                          setAboutOpen(false);
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 text-[13px] text-left transition-colors ${pathname === sub.href ? "text-green-400 font-bold bg-green-400/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5">
            <p className="text-[10px] text-center text-gray-600 font-bold tracking-widest uppercase">NOMO v2.0</p>
          </div>
        </aside>

        {/* NOTIFICATION SLIDE-OUT PANEL */}
        <div className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-96 transform transition-transform duration-500 ease-in-out shadow-2xl bg-white ${notifOpen ? "translate-x-0" : "translate-x-full"}`}>
          <NotificationPanel
            onClose={() => setNotifOpen(false)}
            onUnreadUpdate={(count: number) => setUnreadNotifs(count)}
          />
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 h-screen overflow-y-auto bg-[#F8F9FA]">
          <div className="md:p-1 max-w-7xl mx-auto">
            {msg && (
              <div className="bg-green-500 text-white p-4 rounded-2xl mb-6 text-center shadow-lg font-bold animate-in fade-in slide-in-from-top-4">
                {msg}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}