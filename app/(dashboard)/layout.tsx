"use client";

import { useState, useEffect, useRef } from "react";
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
  Bell,
  Navigation,
  AlertCircle,
  Download
} from "lucide-react";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, onSnapshot, updateDoc, collection, query, where, QuerySnapshot, getDoc } from "firebase/firestore";
import NotificationPanel from "@/components/notification/Notification";
import FcmTokenHandler from "@/components/notification/FcmTokenHandler";

// Helper: today as YYYY-MM-DD
const getTodayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export default function SidebarPageUi({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("/profile.png");
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [hasPendingOffer, setHasPendingOffer] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState("nomopoventures@yahoo.com");
  const [hasFullyBookedLoad, setHasFullyBookedLoad] = useState(false); // Load Booking full-seat alert

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useUnreadChats();

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("To install this app on your device:\n\n• Android: Tap the menu (3 dots) → 'Install app'\n• iPhone: Tap Share → 'Add to Home Screen'");
      return;
    }

    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }

    setDeferredPrompt(null);
    setInstalling(false);
  };

  // --- AUTO-CLOSE LOGIC ---
  const CLOSE_TIMER = 15000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startIdleTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (sidebarOpen) {
        timerRef.current = setTimeout(() => {
          setSidebarOpen(false);
        }, CLOSE_TIMER);
      }
    };

    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    if (sidebarOpen) {
      startIdleTimer();
      activityEvents.forEach(event => {
        window.addEventListener(event, startIdleTimer);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach(event => {
        window.removeEventListener(event, startIdleTimer);
      });
    };
  }, [sidebarOpen]);

  const totalUnreadMobile = Number(unreadCount) + unreadNotifs;

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

      const userDocRef = doc(db, "users", user.uid);
      const unsubDoc = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsDriver(data.isDriver === true);
          setIsDisabled(data.isDisabled === true);

          let finalName = data.isDriver
            ? getFirstName(data.firstName)
            : getFirstName(data.fullName || user.displayName);

          setDisplayName(capitalize(finalName));
          setPhotoURL(data.profileImage || user.photoURL || "/profile.png");

          const notifs = data.notifications || [];
          const unread = notifs.filter((n: any) => !n.read).length;
          setUnreadNotifs(unread);
        }
      });

      const fetchAdminEmail = async () => {
        try {
          const configSnap = await getDoc(doc(db, "site_configs", "general"));
          if (configSnap.exists()) {
            setAdminEmail(configSnap.data()?.generalContact?.email || "nomopoventures@yahoo.com");
          }
        } catch (err) {
          console.error("Failed to fetch admin config", err);
        }
      };
      fetchAdminEmail();

      setAuthChecking(false);
      return () => unsubDoc();
    });

    return () => unsub();
  }, [router, pathname]);

  useEffect(() => {
    if (!userId || !isDriver) {
      setHasPendingOffer(false);
      return;
    }

    const q = query(
      collection(db, "directOffers"),
      where("driverId", "==", userId),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      setHasPendingOffer(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [userId, isDriver]);

  // Listen for driver's fully-booked load session
  useEffect(() => {
    if (!userId || !isDriver) {
      setHasFullyBookedLoad(false);
      return;
    }

    const today = getTodayStr();
    const qLoad = query(
      collection(db, "loadBookings"),
      where("driverId", "==", userId),
      where("status", "==", "active"),
      where("date", "==", today)
    );

    const unsubLoad = onSnapshot(qLoad, (snapshot: QuerySnapshot) => {
      if (snapshot.empty) {
        setHasFullyBookedLoad(false);
        return;
      }
      const bookingData = snapshot.docs[0].data();
      setHasFullyBookedLoad(
        (bookingData.bookedCount ?? 0) >= (bookingData.totalSeats ?? 1)
      );
    });

    return () => unsubLoad();
  }, [userId, isDriver]);

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
    { name: "Mobility", href: "/user/mobility", icon: <Navigation size={20} /> },
    { name: "Load Booking", href: "/user/mobility/load-booking", icon: <Car size={20} /> },
    { name: "Hire a Car", href: "/user/mobility/car-hire", icon: <Car size={20} /> },
    { name: "Bookings", href: "/user/mobility/bookings", icon: <Car size={20} /> },
    { name: "Transport Hub", href: "/user/mobility/transport-hub", icon: <Navigation size={20} /> },
    !isDriver && { name: "Register as Driver", href: "/user/driver-register", icon: <UserPlus size={20} /> },
    {
      name: "About",
      icon: <Info size={20} />,
      isDropdown: true,
      subItems: [
        { name: "About Us", href: "/about" },
        { name: "FAQ", href: "/faq" },
        { name: "Location", href: "/location" },
        { name: "Install App", isInstall: true } // ← NEW install item
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
      <style jsx global>{`
        @keyframes pulse-orange {
          0% { border-color: rgba(249, 115, 22, 0.5); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          70% { border-color: rgba(249, 115, 22, 1); box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
          100% { border-color: rgba(249, 115, 22, 0.5); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
        .animate-pulse-orange {
          animation: pulse-orange 2s infinite;
        }
      `}</style>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      <div className="flex min-h-screen md:h-screen bg-gray-100 md:overflow-hidden">

        {/* Mobile Toggle Button Container */}
        <div className="md:hidden absolute top-6 right-4 z-[60] flex items-center gap-2">
          {!sidebarOpen && totalUnreadMobile > 0 && (
            <div className="h-6 min-w-[24px] px-1.5 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce border border-white/20">
              {totalUnreadMobile}
            </div>
          )}

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
                  className={`flex items-center w-full px-4 py-3.5 rounded-xl hover:bg-green-800 transition-all group relative ${pathname === item.href ? "bg-gray-800 text-green-400 font-semibold" : "text-gray-300 hover:text-white"} ${item.name === "Bookings" && hasPendingOffer ? "border border-orange-500 animate-pulse-orange" : ""} ${item.name === "Load Booking" && hasFullyBookedLoad ? "border border-green-500 animate-pulse-orange" : ""}`}
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

                  {item.name === "Bookings" && hasPendingOffer && (
                    <span className="absolute right-4 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                      New
                    </span>
                  )}

                  {item.name === "Load Booking" && hasFullyBookedLoad && (
                    <span className="absolute right-4 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                      Full!
                    </span>
                  )}

                  {item.isDropdown && (
                    <ChevronDown size={14} className={`transition-transform duration-300 ${aboutOpen ? "rotate-180 text-green-400" : "text-gray-500"}`} />
                  )}
                </button>

                {item.isDropdown && aboutOpen && (
                  <div className="mt-1 space-y-1 bg-white/5 rounded-xl overflow-hidden py-1 mx-2">
                    {item.subItems.map((sub: any) => (
                      sub.isInstall ? (
                        // Install App Button
                        <button
                          key="install-app"
                          onClick={() => { setSidebarOpen(false); handleInstall() }}

                          disabled={installing}
                          className="w-full flex items-center gap-3 pl-10 pr-4 py-2.5 text-[13px] text-left transition-colors text-gray-400 hover:text-white hover:bg-white/5"
                        >
                          {installing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                              <span>Installing...</span>
                            </>
                          ) : (
                            <div className="text-green-400 hover:text-white flex items-center gap-2">
                              <Download size={16} />
                              <span>Install App</span>
                            </div>
                          )}
                        </button>
                      ) : (
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
                      )
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

        <FcmTokenHandler />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-h-screen md:h-screen md:overflow-y-auto bg-[#F8F9FA] relative">
          {isDisabled && pathname.startsWith("/user") ? (
            <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 text-center">
              <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-100/50">
                  <AlertCircle size={48} />
                </div>
                <h1 className="text-4xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Account <span className="text-red-600">Disabled</span></h1>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-10">
                  Your access to the Nomopo platform has been restricted due to policy violations or multiple flags.<br />
                  Administrative clearance is required to restore access.
                </p>
                <div className="space-y-4">
                  <a
                    href={`mailto:${adminEmail}`}
                    className="block w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-all outline-none"
                  >
                    Contact Admin Support
                  </a>
                  <p className="text-[10px] font-bold text-gray-400">EMAIL: {adminEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-8 text-gray-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <LogOut size={14} /> Exit System
                </button>
              </div>
            </div>
          ) : (
            <div className="md:p-1 md:pb-0 max-w-7xl mx-auto">
              {msg && (
                <div className="bg-green-500 text-white p-4 rounded-2xl mb-6 text-center shadow-lg font-bold animate-in fade-in slide-in-from-top-4">
                  {msg}
                </div>
              )}
              {children}
            </div>
          )}
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