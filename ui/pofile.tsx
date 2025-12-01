"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import TransportNewsPageUi from "./news";
import WordGuessGame from "./game";
import ShareButton from "@/ui/sharebutton";

// ⭐ Capitalize full name function
function capitalizeFullName(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

export default function UserProfilePageUi() {
    const params = useParams();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [game, setGame] = useState(false);

    const userId = Array.isArray(params.id) ? params.id[0] : params.id;

    useEffect(() => {
        if (!userId) {
        setLoading(false);
        return;
        }

        const fetchUser = async () => {
        try {
            const userRef = doc(db, "users", userId);
            const snap = await getDoc(userRef);

            if (snap.exists()) {
            setUserData(snap.data());
            } else {
            setUserData(null);
            }
        } catch (err) {
            console.error("Error loading user:", err);
            setUserData(null);
        } finally {
            setLoading(false);
        }
        };

        fetchUser();
    }, [userId]);

    if (loading) {
        return (
        <div className="flex justify-center items-center h-screen">
            <div className="text-xl font-semibold animate-pulse">Fetching profile...</div>
        </div>
        );
    }

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-red-600">User not found</div>
      </div>
    );
  }

  // Calculate referral progress
  const referralPoints = userData.referralPoints || 0;
  const freeRides = userData.freeRides || 0;
  const pointsToNextFreeRide = 10 - (referralPoints % 10);
  const progressPercentage = (referralPoints % 10) * 10;

    return (
        <div className="relative p-3 sm:p-6 max-w-5xl mx-auto">
            {/* Header with Free Ride Status */}
            <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">
                <div className="flex flex-col  justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                                {capitalizeFullName(userData.fullName || "Unnamed User")}
                            </h1>
                            
                            {/* Star indicator for free rides */}
                            {freeRides > 0 && (
                                <div className="flex items-center gap-1">
                                    {freeRides > 1 && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                            {freeRides}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm">Passenger</p>
                        
                        {/* Free Ride Status */}
                        {freeRides > 0 ? (
                            <div className="mt-2 inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-lg">
                                <span className="text-yellow-600 font-bold">★</span>
                                <span className="text-yellow-800 font-semibold">
                                    You have {freeRides} free ride{freeRides > 1 ? 's' : ''}
                                </span>
                            </div>
                        ) : referralPoints > 0 && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold">{referralPoints} points</span> • 
                                    Need {pointsToNextFreeRide} more points for a free ride
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1 max-w-xs">
                                    <div 
                                        className="bg-green-600 h-2 rounded-full" 
                                        style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Referral Stats Card */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 w-full">
                        <h3 className="font-bold text-green-800 text-sm mb-2">Referral Progress</h3>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-2xl font-bold text-green-900">{referralPoints}</p>
                                <p className="text-xs text-green-700">Points</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-gray-800 ml-1">{freeRides}</p>                               
                                <p className={`text-xs ${freeRides >= 1 ? "text-[goldenrod] font-semibold" : "text-gray-800"}`}>Free Rides</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-900">{userData.referralCount || 0}</p>
                                <p className="text-xs text-blue-700">Referrals</p>
                            </div>
                        </div>
                        <p className="text-center sm:text-left text-xs text-gray-500 mt-6 sm:mt-2 hover:text-gray-600">
                            <a href="#share-link" >
                                {referralPoints === 0 
                                    ? "Share your link to start earning points!"
                                    : referralPoints >= 10 
                                        ? "🎉 You've earned free rides! Keep sharing!"
                                        : `${pointsToNextFreeRide} more points for your next free ride. Share Link to earn more`
                                }
                            </a>
                        </p>
                    </div>
                </div>

                {/* open Game Button */}
                <p
                onClick={() => setGame(true)}
                className="cursor-pointer text-sm text-right underline mt-4"
                >
                Play Word Guess
                </p>

                {/* Word guessing game section div */}
                {game && (
                    <div className="p-10 bg-black rounded-md absolute top-0 right-[-12px] sm:right-1 lg:right-65 z-20">
                        {/* close Game Button */}
                        <p
                        onClick={() => setGame(false)}
                        className="cursor-pointer text-white text-right text-2xl font-black"
                        >
                        x
                        </p>
                        <WordGuessGame />
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                {/* Cars User Has Hired */}
                <section className="w-full bg-white shadow-lg rounded-xl p-6 mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Cars You've Hired</h2>

                {userData.hiredCars && userData.hiredCars.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userData.hiredCars.map((car: any, index: number) => (
                        <div
                        key={index}
                        className="bg-white shadow-lg rounded-xl p-4 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                        >
                        <div className="flex flex-col">
                            <img
                            src={car.picture || "/car-placeholder.png"}
                            alt={car.carName || "Car"}
                            className="w-full h-40 object-cover rounded-xl mb-3"
                            />
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                            {car.carName || "Unnamed Car"}
                            </h3>
                            <p className="text-gray-500 text-sm mb-3">
                            Hired on: {car.date || "Unknown"}
                            </p>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200 w-full">
                            Hire This Car Again
                            </button>
                        </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500">You haven't hired any cars yet.</p>
                )}
                </section>

                {/* Drivers Contacted */}
                <section className="w-full bg-white shadow-lg rounded-xl p-6 mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Drivers You Contacted</h2>

                {userData.contactedDrivers && userData.contactedDrivers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userData.contactedDrivers.map((driver: any, index: number) => (
                        <div
                        key={index}
                        className="bg-white shadow-lg rounded-xl p-4 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                        >
                        <div className="flex flex-col">
                            <img
                            src={driver.picture || "/profile.png"}
                            alt={driver.driverName || "Driver"}
                            className="w-full h-40 object-cover rounded-xl mb-3"
                            />
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                            {driver.driverName || "Unnamed Driver"}
                            </h3>
                            <p className="text-gray-500 text-sm mb-3">
                            Phone: {driver.driverPhone || "Unknown"}
                            </p>
                            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors duration-200 w-full">
                            Contact Again
                            </button>
                        </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500">You haven't contacted any drivers yet.</p>
                )}
                </section>
            </div>

            {/* Fun images and Cards */}
            <section id={"share-link"} className="mt-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Enjoy the Ride!</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

                    {/* First card  */}
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                        <img
                        src="/customerSmiling.jpeg"
                        alt="Person Smiling"
                        className="w-full h-40 object-cover"
                        />
                        <div className="text-sm mx-auto text-center p-4 pb-0 text-green-800 font-semibold hover:underline">
                            {/* ONLY HERE - Replaced the link with ShareButton */}
                            <ShareButton 
                                userId={userId}  // ✅ NEW PROP NAME
                                title="Get a Free Ride on Nomopoventures!"
                                text="Join me on Nomopoventures for amazing rides! Use my link to sign up and get a FREE RIDE up to ₦5,000! 🚗✨"
                            />
                        </div>
                        <p className="mt-0 p-4 pt-0 text-center text-xs text-gray-500">{"🎁 Invite friends, earn 2 points each! Score 10 points and unlock a FREE ₦5,000 ride!"}</p>
                    </div>

                    {/* Second card  */}
                    <div className="text-sm bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                        <img
                        src="/driverSmiling.webp"
                        alt="Happy Driving"
                        className="w-full h-40 object-cover"
                        />
                        <div className="mx-auto text-center p-4 text-green-800 font-semibold hover:underline">
                        <a href="">
                            Upgrade to <span className="text-[gold]">VIP</span> Service
                        </a>
                        </div>
                    </div>

                    {/* Third card */}
                    <div className="text-sm bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                        <img
                        src="/keke.jpeg"
                        alt="Stopping Car"
                        className="w-full h-40 object-cover"
                        />
                        <div className="mx-auto text-center p-4 text-green-800 font-semibold hover:underline">
                        <a href="">You Can Now Hire Keke Napep</a>
                        </div>
                    </div>
                </div>
            </section>

            <div className="my-16 bg-gray-300 rounded p-1 flex items-center justify-center flex-col sm:flex-row text-center">
                <p>For complains, enquiries, report and much more:</p>
                <span className="m-3 p-2 rounded-lg bg-red-800 text-white hover:bg-red-600 font-semibold">
                <a href="mailto:@nomopoventures@yahoo.com">Contact Us Today!</a>
                </span>
            </div>

            {/* Transport News Section */}
            <div className="bg-white mt-8 p-2">
                <h1 className="py-3 text-2xl sm:text-3xl font-bold mb-4 text-center text-gray-800">
                    Latest Transport, Flight, Pricing, Shipping, & Other News
                </h1><hr />

                <div className="p-2 py-3 w-full rounded max-h-[30rem] overflow-y-auto">
                    <TransportNewsPageUi />
                </div>
            </div>
        </div>
    );
}