import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // 7 days
    const expiresIn = 60 * 60 * 24 * 7 * 1000;

    const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ success: true });

    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      maxAge: expiresIn / 1000,
      path: "/",
    });

    return res;

  } catch (err) {
    console.error("SESSION ERROR:", err);
    return NextResponse.json(
      { error: "Session creation failed" },
      { status: 500 }
    );
  }
}
