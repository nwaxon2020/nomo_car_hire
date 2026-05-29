"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { FiHeadphones, FiGrid, FiChevronUp, FiLogOut, FiLogIn, FiUser, FiChevronDown, FiMapPin } from "react-icons/fi";
import { FaUsers, FaUserShield, FaHome } from "react-icons/fa";
import { Navigation } from "lucide-react";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isCEOUser, setIsCEOUser] = useState(false);
  const [cmsLogo, setCmsLogo] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const hiddenPathPrefixes = ["/user", "/login", "/register"];
  const isHiddenRoute = hiddenPathPrefixes.some(prefix => pathname.startsWith(prefix));

  useEffect(() => {
    const unsubCms = onSnapshot(doc(db, "cms", "brand"), (docSnap) => {
      if (docSnap.exists()) setCmsLogo(docSnap.data());
    });

    const unsub = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", authUser.uid)
          );
          const userSnap = await getDocs(userQuery);

          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            setUser({ ...authUser, ...userData });
            setProfileImage(
              userData.profileImage ||
              authUser.photoURL ||
              null
            );

            const staffDoc = await getDoc(doc(db, "adminStaffs", authUser.uid));
            setIsStaff(staffDoc.exists());
            setIsCEOUser(staffDoc.exists() && staffDoc.data()?.isCEO === true);
          } else {
            setUser(authUser);
            setProfileImage(authUser.photoURL || null);
            setIsStaff(false);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUser(authUser);
          setProfileImage(authUser.photoURL || null);
        }
      } else {
        setUser(null);
        setProfileImage(null);
        setIsStaff(false);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsub();
      unsubCms();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      setAdminDropdownOpen(false);
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    const nameSource = user.firstName || user.fullName || user.displayName || "";
    if (!nameSource) return "User";
    const cleanFirstName = nameSource.trim().split(/\s+/)[0];
    return cleanFirstName || "User";
  };

  const isPrivileged =
    user?.isAdmin === true ||
    isStaff === true;

  return (
    <nav className="text-center relative">
      <div className="flex justify-between items-center p-4 pr-1 sm:px-6 bg-gray-900 z-20 relative">

        <Link href={"/"} onClick={() => setMenuOpen(false)} className="p-1 flex gap-2 items-center bg-white rounded-sm">
          <h2 className="md:text-xl font-extrabold italic text-blue-700 drop-shadow-md">
            {cmsLogo?.brandName || "Nomo"} <span className="text-yellow-500">{cmsLogo?.brandSuffix || "Cars"}</span>
          </h2>
          <img src={cmsLogo?.logoUrl || "/favicon.png"} alt="logo" className="w-5 h-4 object-contain" />
          <i className="fa fa-car text-blue-600"></i>
        </Link>

        <div className="flex justify-between items-center gap-4 md:gap-12">

          {!isHiddenRoute && (
            <Link href={"/contact"} className="md:hidden flex items-center gap-2 text-white hover:text-yellow-400 transition-colors">
              <FiHeadphones size={20} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Contact</span>
            </Link>
          )}

          {!isHiddenRoute && (
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden flex items-center gap-2 text-white">
              {menuOpen ? <FiChevronUp size={20} /> : <FiGrid size={20} />}
            </button>
          )}


          <Link href="/" className="hidden md:flex items-center gap-2 text-white hover:text-yellow-400 transition-colors">
            <FaHome size={20} />
          </Link>

          <Link href="/join-us" className="hidden md:flex items-center gap-2 text-white hover:text-yellow-400 transition-colors">
            <FaUsers size={20} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Join our team</span>
          </Link>

          <Link href={"/contact"} className="hidden md:flex items-center gap-2 text-white hover:text-yellow-400 transition-colors">
            <FiHeadphones size={20} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Contact</span>
          </Link>

          {!isHiddenRoute && (
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              {user ? (
                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    className="flex items-center gap-2 group focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-600 hidden md:block">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white">
                          <FiUser size={16} />
                        </div>
                      )}
                    </div>
                    <span className="hidden md:flex items-center gap-1 text-white text-[11px] font-bold uppercase tracking-widest hover:text-blue-300">
                      {getUserDisplayName()} <FiChevronDown />
                    </span>
                  </button>

                  {adminDropdownOpen && (
                    <div className="hidden md:block absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-[60] border border-gray-100">
                      {isPrivileged && (
                        <Link
                          href="/admin"
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-bold"
                        >
                          <FaUserShield size={16} /> Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold"
                      >
                        <FiLogOut size={16} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* RESTORED SIGN IN FOR DESKTOP ONLY */
                <Link href="/login" className="hidden md:flex items-center gap-3 text-white text-[11px] font-bold uppercase tracking-widest pt-2 hover:text-blue-300">
                  <FiLogIn size={18} /> Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {!isHiddenRoute && (
        <div className={`md:hidden absolute left-0 right-0 bg-gray-900 border-t border-gray-800 shadow-2xl transition-all duration-300 z-40 ${menuOpen ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'}`}>
          <div className="flex flex-col p-4 pl-6 pb-20 gap-4">
            {user ? (
              <>
                <div className="pb-4 border-b border-gray-800 flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white">
                        <FiUser size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      {isCEOUser ? 'Chief Executive' : (isPrivileged ? 'Administrator' : 'Authorized Member')}
                    </p>
                    <p className="text-white font-bold text-sm truncate">{getUserDisplayName()}</p>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                  </div>
                </div>

                <Link href="/" className="my-2 md:my-0 flex items-center gap-3 text-white text-[11px] font-bold uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
                  <FaHome size={18} className="text-blue-500" /> Home
                </Link>

                {isPrivileged && (
                  <Link href="/admin" className="my-2 md:my-0 flex items-center gap-3 text-blue-400 text-[11px] font-bold uppercase tracking-widest border-l-2 border-blue-500 pl-2" onClick={() => setMenuOpen(false)}>
                    <FaUserShield size={18} /> Admin Panel
                  </Link>
                )}

                <div className="py-2 border-t border-gray-800 space-y-4">
                  <p className="text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Mobility Services</p>

                  <Link href="/user/mobility" className="pb-2 flex items-center gap-3 text-white text-[11px] font-bold uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
                    <FiGrid size={18} className="text-blue-500" /> My Bookings
                  </Link>
                </div>

                <Link href="/join-us" className="my-2 md:my-0 flex items-center gap-3 text-white text-[11px] font-bold uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
                  <FaUsers size={18} className="text-yellow-500" /> Join Our Team
                </Link>

                <button onClick={handleLogout} className="my-2 md:my-0 flex items-center gap-3 text-red-500 text-[11px] font-bold uppercase tracking-widest pt-2">
                  <FiLogOut size={18} /> Sign Out
                </button>
              </>
            ) : (
              /* MOBILE SIGN IN - ONLY SHOWS WHEN MENU IS OPEN */
              <>
                <Link href="/" className="my-2 md:my-0 flex items-center gap-3 text-white text-[11px] font-bold uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
                  <FaHome size={18} className="text-blue-500" /> Home
                </Link>
                <Link href="/join-us" className="my-2 md:my-0 flex items-center gap-3 text-white text-[11px] font-bold uppercase tracking-widest" onClick={() => setMenuOpen(false)}>
                  <FaUsers size={18} className="text-yellow-500" /> Join Our Team
                </Link>
                <Link href="/login" className="my-2 md:my-0 flex items-center gap-3 text-blue-400 text-[11px] font-bold uppercase tracking-widest pt-2 border-t border-gray-800" onClick={() => setMenuOpen(false)}>
                  <FiLogIn size={18} /> Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}