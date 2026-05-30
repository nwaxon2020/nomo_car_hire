import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, adminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/admin/check-role
 * Verifies the Firebase ID token and returns the user's admin role.
 * CEO_UID is stored server-side only (no NEXT_PUBLIC prefix).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ isCEO: false, isAdmin: false }, { status: 401 });
  }

  try {
    const decoded = await authAdmin.verifyIdToken(token);
    const uid = decoded.uid;

    // CEO check — server-side only env var (no NEXT_PUBLIC)
    const CEO_UID = process.env.ADMIN_CEO_UID?.trim();
    const isCEO = CEO_UID ? uid === CEO_UID : false;

    if (isCEO) {
      return NextResponse.json({ isCEO: true, isAdmin: true, uid });
    }

    // Check admin staff membership
    const staffSnap = await adminDb.collection('adminStaffs').doc(uid).get();
    const isAdmin = staffSnap.exists;

    return NextResponse.json({ isCEO: false, isAdmin, uid });
  } catch {
    return NextResponse.json({ isCEO: false, isAdmin: false }, { status: 401 });
  }
}
