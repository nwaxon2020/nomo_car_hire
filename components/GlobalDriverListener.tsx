"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";

export default function GlobalDriverListener() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let unsubscribeOffers: () => void;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Check if user is a driver
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().isDriver === true) {
                    
                    const q = query(
                        collection(db, "directOffers"),
                        where("driverId", "==", user.uid),
                        where("status", "==", "pending")
                    );

                    unsubscribeOffers = onSnapshot(q, (snapshot) => {
                        let hasNewPending = false;
                        
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === "added" || change.type === "modified") {
                                hasNewPending = true;
                            }
                        });

                        // If there is a new pending offer, and the driver isn't already on the bookings page
                        if (hasNewPending && pathname !== "/user/mobility/bookings") {
                            toast("New Ride Request! Redirecting...", {
                                icon: '🚕',
                                duration: 4000,
                            });
                            router.push("/user/mobility/bookings?viewMode=driver");
                        }
                    });
                }
            } else {
                if (unsubscribeOffers) unsubscribeOffers();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeOffers) unsubscribeOffers();
        };
    }, [pathname, router]);

    return null; // This is a purely logical component
}
