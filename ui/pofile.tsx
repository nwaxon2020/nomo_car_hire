"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import TransportNewsPageUi from "./news";
import WordGuessGame from "./game";


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

    return (
        <div className="relative p-3 sm:p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                {capitalizeFullName(userData.fullName || "Unnamed User")}
                </h1>
                <p className="text-gray-500 text-sm">Passenger</p>

                {/* open Game Button */}
                <p
                onClick={() => setGame(true)}
                className="cursor-pointer text-sm text-right underline"
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

            {/* Fun images */}
            <section className="mt-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4">Enjoy the Ride!</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
                    <img
                    src="/customerSmiling.jpeg"
                    alt="Person Smiling"
                    className="w-full h-40 object-cover"
                    />
                    <div className="mx-auto text-center p-4 text-green-800 font-semibold hover:underline">
                    <a href="">Share Link to get Free Ride</a>
                    </div>
                </div>

                <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
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

                <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-500">
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
