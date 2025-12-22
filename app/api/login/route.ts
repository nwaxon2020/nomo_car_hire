// app/api/login/route.ts
import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin";

// Session duration: 7 days in milliseconds
const SESSION_DURATION_MS = 60 * 60 * 24 * 7 * 1000;

export async function POST(request: Request) {
  try {
    // Parse request body
    const { idToken } = await request.json();

    // Validate input
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid ID token is required" },
        { status: 400 }
      );
    }

    // Create session cookie
    const sessionCookie = await authAdmin.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DURATION_MS / 1000, // Convert to seconds
      path: "/",
      sameSite: "lax",
    });

    return response;

  } catch (error: any) {
    console.error("Login API Error:", error);

    // Handle specific Firebase errors
    let statusCode = 500;
    let errorMessage = "Authentication failed";

    if (error.code === "auth/id-token-expired") {
      statusCode = 401;
      errorMessage = "Session expired. Please login again.";
    } else if (error.code === "auth/invalid-id-token") {
      statusCode = 401;
      errorMessage = "Invalid authentication token.";
    } else if (error.code === "auth/user-disabled") {
      statusCode = 403;
      errorMessage = "This account has been disabled.";
    } else if (error.code === "auth/user-not-found") {
      statusCode = 404;
      errorMessage = "User account not found.";
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}