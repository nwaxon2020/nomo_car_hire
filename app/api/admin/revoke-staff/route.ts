import { NextRequest, NextResponse } from 'next/server';
import { authAdmin, adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await authAdmin.verifyIdToken(token);
    uid = decoded.uid;
  } catch (err) {
    console.error("[revoke-staff] Token verification failed:", err);
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }

  const CEO_UID = process.env.ADMIN_CEO_UID?.trim();
  const isCEO = CEO_UID ? uid === CEO_UID : false;

  // ONLY CEO can revoke staff or delete passcodes
  if (!isCEO) {
    return NextResponse.json({ success: false, error: 'CEO access only. Admins cannot revoke staff.' }, { status: 403 });
  }

  const body = await request.json();
  const { targetUid, action } = body;

  if (!targetUid || !action) {
    return NextResponse.json({ success: false, error: 'Missing targetUid or action' }, { status: 400 });
  }

  try {
    if (action === 'revoke-staff') {
      await adminDb.collection("adminStaffs").doc(targetUid).delete();
      await adminDb.collection("users").doc(targetUid).update({ isAdmin: false });
      console.log(`[revoke-staff] Successfully revoked access for UID: ${targetUid}`);
    } else if (action === 'delete-passcode') {
      await adminDb.collection("adminPasscodes").doc(targetUid).delete();
      console.log(`[revoke-staff] Successfully deleted passcode ID: ${targetUid}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[revoke-staff] Error processing request:", err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
