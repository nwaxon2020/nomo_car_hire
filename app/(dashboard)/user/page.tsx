// app/(dashboard)/user/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function UserPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        // Not logged in → redirect to login
        router.replace("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const isDriver = snap.exists() ? snap.data().isDriver === true : false;

        if (isDriver) {
          router.replace("/user/driver-profile");
        } else {
          router.replace(`/user/profile/${user.uid}`);
        }
      } catch (err) {
        console.error(err);
        router.replace("/login"); // fallback
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen text-xl font-semibold">
      Checking user...
    </div>
  );
}
