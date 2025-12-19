"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  doc, 
  getDoc 
} from "firebase/firestore";
import { 
  FaCar, FaMapMarkerAlt, FaStar, FaShieldAlt, 
  FaClock, FaWallet, FaUserCheck, FaArrowRight, FaCheckCircle,
  FaUsers, FaCrown, FaKey
} from "react-icons/fa";

export default function HomePageUi() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stats, setStats] = useState({
    drivers: 0,
    rides: 0,
    cities: 0,
    rating: 0
  });

  // Fetch user data and stats
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsDriver(Boolean(data.isDriver));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      
      // Fetch statistics
      await fetchStatistics();
      
    });

    return () => unsubscribe();
  }, []);

  // Function to fetch statistics from Firebase
  const fetchStatistics = async () => {
    try {
      // 1. Count Drivers (users with isDriver = true)
      const usersRef = collection(db, "users");
      const driversQuery = query(usersRef, where("isDriver", "==", true));
      const driversSnapshot = await getCountFromServer(driversQuery);
      const driversCount = driversSnapshot.data().count;

      // 2. Count Rides (count all vehicles in vehicleLog collection)
      const ridesRef = collection(db, "vehicleLog");
      const ridesSnapshot = await getCountFromServer(ridesRef);
      const ridesCount = ridesSnapshot.data().count;

      // 3. Count Unique Cities from drivers
      const driversDocs = await getDocs(driversQuery);
      const citiesSet = new Set<string>();
      
      driversDocs.forEach((doc) => {
        const data = doc.data();
        if (data.city) {
          citiesSet.add(data.city);
        }
      });
      const citiesCount = citiesSet.size;

      // 4. Calculate Average Rating (from ratings collection in users)
      let totalRating = 0;
      let ratingCount = 0;
      
      const allUsers = await getDocs(usersRef);
      allUsers.forEach((userDoc) => {
        const data = userDoc.data();
        if (data.ratings && Array.isArray(data.ratings) && data.ratings.length > 0) {
          const userRatings = data.ratings;
          userRatings.forEach((rating: any) => {
            if (rating.score) {
              totalRating += rating.score;
              ratingCount++;
            }
          });
        }
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 4.8;
      const roundedRating = Math.round(averageRating * 10) / 10;

      setStats({
        drivers: driversCount,
        rides: ridesCount,
        cities: citiesCount,
        rating: roundedRating
      });

    } catch (error) {
      console.error("Error fetching statistics:", error);
      // Fallback to default values
      setStats({
        drivers: 1250,
        rides: 45000,
        cities: 25,
        rating: 4.8
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Redirect to car hire page with search query as URL parameter
      router.push(`/user/car-hire?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      // If no search query, just go to car hire page
      router.push(`/user/car-hire`);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      if (isDriver) {
        router.push(`/user/driver-profile/${user.uid}`);
      } else {
        router.push(`/user/profile/${user.uid}`);
      }
    } else {
      router.push("/signup");
    }
  };

  const handleBookRide = () => {
    router.push("/user/car-hire");
  };

  const handleStartDriving = () => {
    if (user) {
      if (isDriver) {
        router.push(`/user/driver-profile/${user.uid}`);
      } else {
        router.push(`/user/profile/${user.uid}`);
      }
    } else {
      router.push("/signup");
    }
  };

  const handleRegisterDriver = () => {
    if (user) {
      if (isDriver) {
        // Already a driver, show message or redirect to driver profile
        router.push(`/user/driver-profile/${user.uid}`);
      } else {
        // Not a driver, go to driver registration
        router.push("/user/driver-register");
      }
    } else {
      // User not logged in, go to signup
      router.push("/signup?type=driver");
    }
  };

  const handleBookFirstRide = () => {
    router.push("/user/car-hire");
  };

  // Handle search input key press (Enter key)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section id="bg-home" className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <FaKey className="text-yellow-300" />
                <span className="text-sm font-medium">Nigeria's #1 Car Hire Platform</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Hire Professional
                <span className="block text-yellow-300">Drivers Instantly</span>
              </h1>
              
              <p className="text-xl text-blue-100 mb-8 max-w-2xl">
                Connect with verified drivers, book rides safely, and travel with confidence.
                Whether you're a passenger or a driver, Nomo Cars has you covered.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                >
                  {user ? "Go to Dashboard" : "Get Started Free"}
                  <FaArrowRight />
                </button>
                
                <button
                  onClick={handleBookRide}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <FaCar /> Book a Ride
                </button>
              </div>

              {!user && (
                <Link href={"/login"}
                  className="mt-4 bg-gray-50 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                >
                  LogIn
                  <FaArrowRight />
                </Link>
              )}
            </div>
            
            <div className="relative">
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
                {/* Search Card */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Find Your Ride</h3>
                  
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="relative">
                      <FaMapMarkerAlt className="absolute left-4 top-4 text-gray-400 text-lg" />
                      <input
                        type="text"
                        placeholder="Enter location, city, or destination..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full pl-12 pr-4 py-4 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-3"
                    >
                      <FaCar /> Search Available Cars
                    </button>
                  </form>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.drivers}+</div>
                        <div className="text-sm text-gray-600">Drivers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.rides.toLocaleString()}+</div>
                        <div className="text-sm text-gray-600">Rides</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.cities}+</div>
                        <div className="text-sm text-gray-600">Cities</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How Nomo Cars Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple steps to get you moving, whether you need a ride or want to earn
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-lg border border-blue-100">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <FaUserCheck className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">1. Create Account</h3>
              <p className="text-gray-600 mb-6">
                Sign up as a passenger or driver. Get verified quickly and start using the platform.
              </p>
              <Link href="/signup" className="text-blue-600 font-semibold flex items-center gap-2">
                Sign Up Now <FaArrowRight />
              </Link>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-white p-8 rounded-2xl shadow-lg border border-yellow-100">
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                <FaCar className="text-yellow-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">2. Book or Drive</h3>
              <p className="text-gray-600 mb-6">
                Passengers: Book rides instantly. Drivers: Get ride requests and start earning.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleBookRide}
                  className="text-yellow-600 font-semibold flex items-center gap-2 hover:text-yellow-700"
                >
                  Book Ride <FaArrowRight />
                </button>
                <Link href="/user/driver-register" className="text-gray-600 font-semibold flex items-center gap-2">
                  Become Driver <FaArrowRight />
                </Link>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl shadow-lg border border-green-100">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <FaWallet className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">3. Enjoy & Earn</h3>
              <p className="text-gray-600 mb-6">
                Passengers: Enjoy safe rides. Drivers: Earn money with flexible hours.
              </p>
              {user ? (
                <Link 
                  href={isDriver ? `/user/driver-profile/${user.uid}` : `/user/profile/${user.uid}`}
                  className="text-green-600 font-semibold flex items-center gap-2"
                >
                  Go to Dashboard <FaArrowRight />
                </Link>
              ) : (
                <Link href="/login" className="text-green-600 font-semibold flex items-center gap-2">
                  Login <FaArrowRight />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Nomo Cars?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're committed to providing the best car hire experience in Nigeria
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FaShieldAlt className="text-blue-600 text-xl" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Verified Drivers</h4>
              <p className="text-gray-600 text-sm">
                All drivers are background-checked and verified for your safety
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FaClock className="text-green-600 text-xl" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">24/7 Service</h4>
              <p className="text-gray-600 text-sm">
                Book rides anytime, day or night. We're always available
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <FaStar className="text-yellow-600 text-xl" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Top Ratings</h4>
              <p className="text-gray-600 text-sm">
                Rated {stats.rating.toFixed(1)}/5 by thousands of satisfied customers
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FaWallet className="text-purple-600 text-xl" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Flexible Payments</h4>
              <p className="text-gray-600 text-sm">
                Cash and other payments are negotiated between passengers and drivers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Drivers */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex justify-center md:inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <FaCrown className="text-yellow-300" />
                <span className="text-center text-sm font-medium">Become a Driver Partner</span>
              </div>
              
              <h2 className="text-center md:text-left text-3xl md:text-4xl font-bold mb-6">
                Earn Money on Your Schedule
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="text-yellow-300 text-xl mt-1" />
                  <div>
                    <h4 className="font-bold text-lg">Flexible Hours</h4>
                    <p className="text-blue-100">Drive whenever you want, full-time or part-time</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="text-yellow-300 text-xl mt-1" />
                  <div>
                    <h4 className="font-bold text-lg">Weekly Earnings</h4>
                    <p className="text-blue-100">Get paid weekly with transparent pricing</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="text-yellow-300 text-xl mt-1" />
                  <div>
                    <h4 className="font-bold text-lg">Support 24/7</h4>
                    <p className="text-blue-100">Driver support team available round the clock</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStartDriving}
                  className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  Start Driving
                </button>
                
                {user && isDriver && (
                  <Link
                    href={`/user/driver-profile/${user.uid}`}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    Driver Dashboard
                  </Link>
                )}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white/20 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold">₦25k+</div>
                  <div className="text-sm text-blue-100">Weekly Potential</div>
                </div>
                <div className="bg-white/20 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold">95%</div>
                  <div className="text-sm text-blue-100">Driver Satisfaction</div>
                </div>
                <div className="bg-white/20 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold">24/7</div>
                  <div className="text-sm text-blue-100">Support</div>
                </div>
                <div className="bg-white/20 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold">₦0</div>
                  <div className="text-sm text-blue-100">Signup Fee</div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-lg mb-4">Want to be a driver?</p>
                <button
                  onClick={handleRegisterDriver}
                  disabled={isDriver}
                  className={`inline-flex items-center gap-2 font-bold text-lg ${
                    isDriver 
                      ? 'text-gray-400 cursor-not-allowed opacity-50' 
                      : 'text-yellow-300 hover:text-yellow-200'
                  }`}
                >
                  Register A Driver Account {isDriver && '(Already a Driver)'}
                  {!isDriver && <FaArrowRight />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Passengers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <div className="order-1 lg:order-2">
              <h2 className="text-center md:text-left text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Safe Travels with Nomo Cars
              </h2>
              
              <p className="text-xl text-gray-600 mb-8">
                Your safety is our priority. From verified drivers to 24/7 support,
                we ensure every ride is secure and comfortable.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaShieldAlt className="text-green-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-2">Safety First</h4>
                    <p className="text-gray-600">
                      All drivers undergo thorough background checks and vehicle inspections
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaWallet className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-2">Flexible Payments</h4>
                    <p className="text-gray-600">
                      Cash and other payments are negotiated between passengers and drivers - pay what you feel is fair
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center md:justify-start flex">
                <button
                  onClick={handleBookFirstRide}
                  className="flex justify-center md:justify-start text-center md:inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300"
                >
                  <FaCar /> Book Your First Ride
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Join thousands of Nigerians who trust Nomo Cars for their transportation needs.
            Whether you need a ride or want to earn, we've got you covered.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
            >
              {user ? "Go to Dashboard" : "Sign Up Free"}
              <FaArrowRight />
            </button>
            
            <Link
              href="/about"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3"
            >
              Learn More
            </Link>
          </div>
          
          <div className="mt-12 pt-12 border-t border-white/20">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8">
              <div className="flex items-center gap-3">
                <FaShieldAlt className="text-green-400 text-2xl" />
                <span>100% Secure</span>
              </div>
              <div className="flex items-center gap-3">
                <FaStar className="text-yellow-400 text-2xl" />
                <span>Rated {stats.rating.toFixed(1)}/5</span>
              </div>
              <div className="flex items-center gap-3">
                <FaUsers className="text-blue-400 text-2xl" />
                <span>{stats.drivers.toLocaleString()}+ Drivers</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}