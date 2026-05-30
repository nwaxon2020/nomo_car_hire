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
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 401 });
  }

  // Only CEO can use passcode actions, unless we allow specific staff later. For now, checking CEO.
  if (uid !== process.env.ADMIN_CEO_UID) {
    return NextResponse.json({ valid: false, error: 'CEO access only' }, { status: 403 });
  }

  const body = await request.json();
  const { passcode, action } = body;

  if (!passcode || !action) {
    return NextResponse.json({ valid: false, error: 'Missing fields' }, { status: 400 });
  }

  try {
    const passcodesSnap = await adminDb.collection("adminPasscodes")
      .where("passcode", "==", passcode)
      .get();
      
    if (passcodesSnap.empty) {
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ valid: false, error: 'Invalid passcode' }, { status: 403 });
    }

    let isAuthorizedForRoute = false;

    // Check if the route is authorized for this passcode
    passcodesSnap.forEach(doc => {
      const data = doc.data();
      const routes = data.routes || [];
      if (action === 'any' || routes.includes(action)) {
        isAuthorizedForRoute = true;
      }
    });

    if (!isAuthorizedForRoute) {
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ valid: false, error: 'Passcode not authorized for this route' }, { status: 403 });
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("Passcode verification error:", err);
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
