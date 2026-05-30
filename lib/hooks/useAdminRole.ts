"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

interface AdminRole {
  isCEO: boolean;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * useAdminRole
 * Securely checks if the current user is CEO or admin via a server-side API call.
 * The CEO UID is never exposed to the browser (no NEXT_PUBLIC_ env var).
 */
export function useAdminRole(): AdminRole {
  const [role, setRole] = useState<AdminRole>({ isCEO: false, isAdmin: false, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole({ isCEO: false, isAdmin: false, loading: false });
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/check-role", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setRole({ isCEO: data.isCEO, isAdmin: data.isAdmin, loading: false });
        } else {
          setRole({ isCEO: false, isAdmin: false, loading: false });
        }
      } catch {
        setRole({ isCEO: false, isAdmin: false, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return role;
}

/**
 * verifyAdminPasscode
 * Sends the passcode to the server for verification.
 * Validates against Firestore using routePath context.
 */
export async function verifyAdminPasscode(
  passcode: string,
  action: string = "any"
): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const token = await user.getIdToken();
    const res = await fetch("/api/admin/verify-passcode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ passcode, action }),
    });

    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}
