"use client";

import { FaKey, FaArrowRight, FaCar, FaMapMarkerAlt } from "react-icons/fa";
import Link from "next/link";

export default function HeroSection({
  user,
  stats,
  searchQuery,
  setSearchQuery,
  handleSearch,
  handleKeyPress,
  handleGetStarted,
  handleBookRide,
  data // Pulling CMS data here
}: any) {
  const content = data || {};

  // Construct the dynamic background style from DB
  const heroStyle = {
    backgroundImage: content.backgroundImage
      ? `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url("${content.backgroundImage}")`
      : `linear-gradient(to right, #2563eb, #1e40af)`, // Default blue gradient fallback
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <section
      id="bg-home"
      style={heroStyle}
      className="relative text-white overflow-hidden min-h-screen flex items-center"
    >
      {/* Background Pattern - White Circles */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-gray-500 px-4 py-2 rounded-full mb-6">
              <FaKey className="text-yellow-300" />
              <span className="text-sm font-medium">
                {content.badgeText || "Nigeria's #1 Car Hire Platform"}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight">
              {content.title || "Hire Professional"}
              <span className="-mt-3 block text-yellow-300">
                {content.subtitle || "Drivers Instantly"}
              </span>
            </h1>

            <p className="text-xl text-blue-100 mb-8 max-w-2xl leading-relaxed">
              {content.description || "Connect with verified drivers, book rides safely, and travel with confidence. Whether you're a passenger or a driver, Nomo Cars has you covered."}
            </p>

            {user && (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="w-full bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                >
                  {user ? "Go to Dashboard" : (content.primaryButtonText || "Get Started Free")}
                  <FaArrowRight />
                </button>

                <button
                  onClick={handleBookRide}
                  className="w-full border-2 border-white/90 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <FaCar /> {content.secondaryButtonText || "Book a Ride"}
                </button>
              </div>
            )}

            {!user && (
              <div className="w-full col-span-3 mt-2 flex gap-4 max-w-lg">
                <Link
                  href="/signup"
                  className="w-full border-2 border-white/90 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  Sign Up
                  <FaArrowRight />
                </Link>
                
                <Link
                  href="/login" 
                  className="w-full flex-1 bg-white text-blue-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"
                >
                  Login
                  <FaArrowRight />
                </Link>
              </div>
            )}
          </div>

          <div className="relative md:mb-0">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-2 md:p-6 shadow-2xl border border-white/10">
              <div className="bg-white rounded-xl p-4 py-6 md:p-10 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Find Your Ride</h3>

                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input
                      type="text"
                      placeholder={content.searchPlaceholder || "Enter location, city, or destination..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full pl-12 pr-4 py-4 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-3 shadow-md"
                  >
                    <FaCar /> Search Available Cars
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.drivers}+</div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Drivers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.rides.toLocaleString()}+</div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Rides</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.cities}+</div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Cities</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
