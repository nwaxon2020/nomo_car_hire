"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import LoadingDots from "../components/loading";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        router.replace("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold"><LoadingDots /></p>
      </div>
    );

  // If user exists → show the protected content
  return <>{children}</>;
}
