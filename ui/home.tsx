"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  getDocs, // Added getDocs to fetch unique city data
  doc, 
  getDoc, 
  onSnapshot 
} from "firebase/firestore";

// Component Imports
import HeroSection from "@/components/home/HeroSection";
import HowItWorks from "@/components/home/HowItWorks";
import Features from "@/components/home/Features";
import DriverPartner from "@/components/home/DriverPartner";
import PassengerSafety from "@/components/home/PassengerSafety";
import CTASection from "@/components/home/CTASection";

export default function HomePageUi() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Stats initialized with your defaults, but will be overwritten by fetch
  const [stats, setStats] = useState({ drivers: 1250, rides: 45000, cities: 0, rating: 4.8 });
  
  // --- CMS STATE ---
  const [cmsData, setCmsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. IMPROVED Auth Listener: Merges Firestore Data with Auth
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUser({ ...firebaseUser, ...userData });
            setIsDriver(Boolean(userData.isDriver));
          } else {
            setUser(firebaseUser);
            setIsDriver(false);
          }
        } catch (e) {
          console.error("Auth Data Merge Error:", e);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setIsDriver(false);
      }
    });

    // 2. REAL-TIME CMS Listener
    const unsubscribeCMS = onSnapshot(doc(db, "cms", "homePage"), (docSnap) => {
      if (docSnap.exists()) {
        setCmsData(docSnap.data());
      }
      setLoading(false);
    }, (error) => {
      console.error("CMS Listener Error:", error);
      setLoading(false);
    });

    // 3. REAL-TIME RATING Listener
    const unsubscribeReviews = onSnapshot(collection(db, "generalSiteReviews"), (snap) => {
      let totalScore = 0;
      snap.docs.forEach(doc => {
        totalScore += (doc.data().rating || 0);
      });
      const averageRating = snap.size > 0 ? totalScore / snap.size : 4.8;
      setStats(prev => ({ ...prev, rating: averageRating }));
    });

    fetchStatistics();

    return () => {
      unsubscribeAuth();
      unsubscribeCMS();
      unsubscribeReviews();
    };
  }, []);

  const fetchStatistics = async () => {
    try {
      // 1. Get total Driver count
      const driversQuery = query(collection(db, "users"), where("isDriver", "==", true));
      const driversSnapshot = await getCountFromServer(driversQuery);
      
      // 2. Get total Rides count
      const ridesSnapshot = await getCountFromServer(collection(db, "vehicleLog"));

      // 3. LOGIC FOR UNIQUE CITIES
      // We fetch the documents to check the "city" field specifically
      const cityQuery = query(collection(db, "users"), where("isDriver", "==", true));
      const citySnap = await getDocs(cityQuery);
      
      const uniqueCities = new Set();
      citySnap.docs.forEach(doc => {
        const data = doc.data();
        // It checks the 'city' field. If it's missing, it falls back to parsing the address string
        const cityName = data.city || data.location?.address?.split(',')[0];
        if (cityName) {
          uniqueCities.add(cityName.trim());
        }
      });
      
      setStats(prev => ({
        ...prev,
        drivers: driversSnapshot.data().count,
        rides: ridesSnapshot.data().count,
        cities: uniqueCities.size // This gives the number of unique cities
      }));
    } catch (e) { console.error("Stats Error:", e); }
  };

  // --- NAVIGATION FUNCTIONS ---
  const handleGetStarted = () => {
    if (user) {
      router.push(isDriver ? `/user/driver-profile/${user.uid}` : `/user/profile/${user.uid}`);
    } else {
      router.push("/signup");
    }
  };

  const handleBookRide = () => {
    router.push("/user/mobility");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/user/car-hire${searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : ""}`);
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 font-medium font-black uppercase tracking-widest text-[10px]">Loading Nomo Cars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <HeroSection 
        data={cmsData?.hero}
        user={user} 
        stats={stats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        handleGetStarted={handleGetStarted}
        handleBookRide={handleBookRide}
      />
      
      <HowItWorks 
        data={cmsData?.howItWorks}
        user={user} 
        isDriver={isDriver} 
        handleBookRide={handleBookRide} 
      />

      <Features 
        data={cmsData?.features}
        stats={stats} 
      />

      <DriverPartner 
        data={cmsData?.partner}
        user={user} 
        isDriver={isDriver} 
      />

      <PassengerSafety 
        data={cmsData?.safety}
      />

      <CTASection 
        data={cmsData?.cta}
        user={user} 
        stats={stats} 
        handleGetStarted={handleGetStarted} 
      />
    </div>
  );
}