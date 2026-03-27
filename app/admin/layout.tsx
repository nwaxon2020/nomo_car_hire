"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { auth, db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // Get current URL path
  const CEO_ID = process.env.NEXT_PUBLIC_ADMIN_KEY;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Master Protocol: CEO Access
      if (user.uid === CEO_ID) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      try {
        // 2. Staff Protocol: Check specific permissions
        const staffDoc = await getDoc(doc(db, "adminStaffs", user.uid));
        
        if (staffDoc.exists()) {
          const staffData = staffDoc.data();
          const allowedRoutes = staffData.allowedRoutes || [];

          // The root /admin page is usually allowed for all staff
          const isBaseAdminDir = pathname === '/admin';
          
          // Check if the current path (or a sub-path) is in their allowed list
          const hasRoutePermission = allowedRoutes.some((route: string) => 
            pathname === route || pathname.startsWith(route + '/')
          );

          if (isBaseAdminDir || hasRoutePermission) {
            setAuthorized(true);
          } else {
            // Unauthorized for this specific route
            toast.error("Security: Access to this sector is restricted.");
            router.push('/admin'); // Redirect to their main dashboard
          }
        } else {
          // Not a staff member at all
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
  }, [CEO_ID, router, pathname]); // Added pathname to dependency array

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050A0F] flex items-center justify-center text-white font-black italic uppercase tracking-widest">
        Verifying Protocol...
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}