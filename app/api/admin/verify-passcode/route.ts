import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, adminDb } from '@/lib/firebaseAdmin';

/**
 * POST /api/admin/verify-passcode
 * Validates the admin passcode on the server.
 * Passcodes are fetched from Firestore collection "adminPasscodes".
 * 
 * Body: { passcode: string, action: string (which is the route path) }
 * Auth: Bearer {idToken} — must be a valid admin/CEO
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Unauthenticated' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await authAdmin.verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error("[verify-passcode] Token verification failed:", err);
    return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
  }

  const CEO_UID = process.env.ADMIN_CEO_UID?.trim();
  const isCEO = CEO_UID ? uid === CEO_UID : false;

  let isAdmin = isCEO;

  // If not CEO, check if they are in the adminStaffs collection
  if (!isCEO) {
    const staffSnap = await adminDb.collection('adminStaffs').doc(uid).get();
    if (staffSnap.exists) {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    return NextResponse.json({ valid: false, error: 'Admin access only' }, { status: 403 });
  }

  const body = await request.json();
  const { passcode, action } = body;

  if (!passcode || !action) {
    return NextResponse.json({ valid: false, error: 'Missing fields' }, { status: 400 });
  }

  const cleanPasscode = String(passcode).trim();
  const cleanAction = String(action).trim();

  console.log(`[verify-passcode] Attempt by UID: ${uid}, CEO: ${isCEO}, Admin: ${isAdmin}, action: ${cleanAction}`);

  try {
    const passcodesSnap = await adminDb.collection("adminPasscodes")
      .where("passcode", "==", cleanPasscode)
      .get();
      
    if (passcodesSnap.empty) {
      console.log(`[verify-passcode] FAILED: Passcode not found in db. (Entered: ${cleanPasscode})`);
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ valid: false, error: 'Invalid passcode' }, { status: 403 });
    }

    let isAuthorizedForRoute = false;
    let foundRoutes: string[] = [];

    // Check if the route is authorized for this passcode
    passcodesSnap.forEach(doc => {
      const data = doc.data();
      const routes = data.routes || [];
      foundRoutes = [...foundRoutes, ...routes];
      if (cleanAction === 'any' || routes.includes(cleanAction)) {
        isAuthorizedForRoute = true;
      }
    });

    if (!isAuthorizedForRoute) {
      console.log(`[verify-passcode] FAILED: Passcode not authorized for route. Action: ${cleanAction}, Assigned routes: ${foundRoutes.join(',')}`);
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ valid: false, error: 'Passcode not authorized for this route' }, { status: 403 });
    }

    console.log(`[verify-passcode] SUCCESS: Authorized`);
    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("Passcode verification error:", err);
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
