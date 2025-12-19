"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import CreateRequest from "./CreateRequest";
import ViewRequests from "./ViewRequests";
import NotificationBadge from "./NotificationBadge";

interface BookingRequestProps {
  userId?: string;
  userCity?: string;
  onBadgeUpdate?: (driverCount: number, customerCount: number) => void;
}

export default function BookingRequest({
  userId,
  userCity,
  onBadgeUpdate,
}: BookingRequestProps) {
  // ⭐ Default = BROWSE tab (but it will appear on the RIGHT)
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");

  const [loading, setLoading] = useState(true);
  const [isDriver, setIsDriver] = useState(false);

  const [userRequestCount, setUserRequestCount] = useState(0);
  const [driverNotificationCount, setDriverNotificationCount] = useState(0);
  const [customerNotificationCount, setCustomerNotificationCount] =
    useState(0);

  /* --------------------------------------------
   🔥 Fetch main user data
  -------------------------------------------- */
  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is driver
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setIsDriver(userSnap.data().isDriver || false);
      }

      // Count active requests
      const requestsRef = collection(db, "bookingRequests");
      const myReqQuery = query(
        requestsRef,
        where("userId", "==", userId),
        where("status", "==", "active")
      );
      const myReqSnap = await getDocs(myReqQuery);
      setUserRequestCount(myReqSnap.size);

      // Notifications
      await fetchNotificationCounts();
    } catch (err) {
      console.error("Error fetching data:", err);
    }

    setLoading(false);
  }, [userId]);

  /* --------------------------------------------
   🔥 Fetch notification badge counts
  -------------------------------------------- */
  const fetchNotificationCounts = useCallback(async () => {
    if (!userId) return;

    try {
      let driverCount = 0;
      let customerCount = 0;

      const requestsRef = collection(db, "bookingRequests");

      if (isDriver) {
        // Driver: count requests without offers from this driver
        const activeQuery = query(requestsRef, where("status", "==", "active"));
        const list = await getDocs(activeQuery);

        list.forEach((docSnap) => {
          const data = docSnap.data();
          const hasOffered = data.offers?.some(
            (offer: any) => offer.driverId === userId
          );

          if (!hasOffered && data.userId !== userId) {
            driverCount++;
          }
        });

        driverCount = Math.min(driverCount, 99);
        setDriverNotificationCount(driverCount);
      } else {
        // Customer: count total offers received
        const myReqQuery = query(
          requestsRef,
          where("userId", "==", userId),
          where("status", "==", "active")
        );
        const list = await getDocs(myReqQuery);

        list.forEach((docSnap) => {
          customerCount += docSnap.data()?.offers?.length || 0;
        });

        customerCount = Math.min(customerCount, 99);
        setCustomerNotificationCount(customerCount);
      }

      onBadgeUpdate?.(driverCount, customerCount);
    } catch (err) {
      console.error("Error fetching notification counts:", err);
    }
  }, [userId, isDriver, onBadgeUpdate]);

  /* --------------------------------------------
   🔥 Reduce customer badge on viewing offers
  -------------------------------------------- */
  const handleCustomerViewedOffers = useCallback(() => {
    if (!isDriver && customerNotificationCount > 0) {
      const newCount = Math.max(0, customerNotificationCount - 1);
      setCustomerNotificationCount(newCount);

      onBadgeUpdate?.(driverNotificationCount, newCount);
    }
  }, [isDriver, customerNotificationCount, driverNotificationCount, onBadgeUpdate]);

  /* --------------------------------------------
   🔥 Run fetch when tab changes or on load
  -------------------------------------------- */
  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab]);

  /* --------------------------------------------
   🔥 UI
  -------------------------------------------- */
  return (
    <div className="border border-gray-300 rounded-xl bg-white shadow-sm">
      {/* HEADER */}
      <div className="max-w-full px-2 py-5 md:p-5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-t-xl shadow-lg">
        <div className="max-w-full flex flex-col md:flex-row justify-between items-center gap-2">

          {/* TEXT */}
          <div className="px-2">
            <h2 className="text-center md:text-left text-xl md:text-2xl font-extrabold">
              🚗 Need a Specific Car?
            </h2>
            <p className="text-center md:text-left text-sm opacity-90">
              Tell us what you need — multiple drivers will contact you!
            </p>
          </div>

          {/* ⭐⭐ TABS (POST LEFT, BROWSE RIGHT) ⭐⭐ */}
          <div className="flex bg-white/20 p-1 rounded-lg backdrop-blur-md shadow-inner">

            {/* LEFT → Post Request */}
            <button
              onClick={() => setActiveTab("create")}
              className={`text-center px-1 md:px-4 py-2 rounded-md text-sm transition font-medium ${
                activeTab === "create"
                  ? "bg-white text-blue-700 shadow"
                  : "text-white hover:bg-white/10"
              }`}
            >
              📝 Post Request
            </button>

            {/* RIGHT → Browse Requests */}
            <button
              onClick={() => setActiveTab("browse")}
              className={`text-center relative px-1 md:px-4 py-2 rounded-md text-sm transition font-medium ${
                activeTab === "browse"
                  ? "bg-white text-blue-700 shadow"
                  : "text-white hover:bg-white/10"
              }`}
            >
              🔍 Browse Requests

              {/* Badges */}
              {isDriver && driverNotificationCount > 0 && (
                <NotificationBadge
                  count={driverNotificationCount}
                  type="driver"
                  size="sm"
                  className="absolute -top-1 -right-1"
                />
              )}

              {!isDriver && customerNotificationCount > 0 && (
                <NotificationBadge
                  count={customerNotificationCount}
                  type="customer"
                  size="sm"
                  className="absolute -top-1 -right-1"
                />
              )}
            </button>

          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mt-3 py-2 md:p-2 max-w-full overflow-x-auto scrollbar-hide">
        {activeTab === "browse" ? (
          <ViewRequests
            userId={userId}
            onNotificationUpdate={fetchNotificationCounts}
            onCustomerViewedOffers={handleCustomerViewedOffers}
          />
        ) : (
          <CreateRequest
            userId={userId}
            userCity={userCity}
            userRequestCount={userRequestCount}
          />
        )}
      </div>

      {/* FOOTER */}
      <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <span>✅ No upfront payment</span>
            <span>✅ Get multiple offers</span>
            <span>✅ Negotiate best price</span>
          </div>
          <span className="text-blue-600 font-medium">
            🇳🇬 Perfect for Nigerian market
          </span>
        </div>
      </div>
    </div>
  );
}
