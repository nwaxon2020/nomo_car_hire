"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAdminRole } from '@/lib/hooks/useAdminRole';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { isCEO, loading: roleLoading } = useAdminRole();

  useEffect(() => {
    if (roleLoading) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // CEO gets full access (verified server-side via useAdminRole)
      if (isCEO) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      try {
        // Staff protocol: check specific route permissions
        const staffDoc = await getDoc(doc(db, "adminStaffs", user.uid));

        if (staffDoc.exists()) {
          const staffData = staffDoc.data();
          const allowedRoutes = staffData.allowedRoutes || [];
          const isBaseAdminDir = pathname === '/admin';
          const hasRoutePermission = allowedRoutes.some((route: string) =>
            pathname === route || pathname.startsWith(route + '/')
          );

          if (isBaseAdminDir || hasRoutePermission) {
            setAuthorized(true);
          } else {
            toast.error("Security: Access to this sector is restricted.");
            router.push('/admin');
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error("Auth check failed", error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isCEO, roleLoading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050A0F] flex items-center justify-center text-white font-black italic uppercase tracking-widest">
        Verifying Protocol...
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}