import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin";

// Session duration: 7 days
const SESSION_DURATION_MS = 60 * 60 * 24 * 7 * 1000;

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "ID token is required" },
        { status: 400 }
      );
    }

    // Create the session cookie using Firebase Admin
    const sessionCookie = await authAdmin.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    // Set the cookie
    // 'lax' is safer for redirects than 'none'
    // 'secure' must be true on Vercel (HTTPS)
    response.cookies.set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: true, 
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("CRITICAL LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error during session creation" },
      { status: 500 }
    );
  }
}