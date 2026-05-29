import { NextRequest, NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebaseAdmin';

/**
 * POST /api/admin/verify-passcode
 * Validates the admin passcode on the server.
 * Passcodes are now stored in server-only env vars (no NEXT_PUBLIC).
 * 
 * Body: { passcode: string, action: 'primary' | 'secondary' }
 * Auth: Bearer {idToken} — must be a valid admin
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

  // Only CEO can use passcode actions
  if (uid !== process.env.ADMIN_CEO_UID) {
    return NextResponse.json({ valid: false, error: 'CEO access only' }, { status: 403 });
  }

  const body = await request.json();
  const { passcode, action } = body;

  if (!passcode || !action) {
    return NextResponse.json({ valid: false, error: 'Missing fields' }, { status: 400 });
  }

  // Compare against server-side env vars
  const primaryCode = process.env.ADMIN_PASS_CODE;
  const secondaryCode = process.env.ADMIN_PASS_CODE2;

  const isValid =
    (action === 'primary' && passcode === primaryCode) ||
    (action === 'secondary' && passcode === secondaryCode) ||
    // Allow primary code for generic 'any' action
    (action === 'any' && (passcode === primaryCode || passcode === secondaryCode));

  if (!isValid) {
    // Add a small delay to slow down brute-force attempts
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ valid: false, error: 'Invalid passcode' }, { status: 403 });
  }

  return NextResponse.json({ valid: true });
}
