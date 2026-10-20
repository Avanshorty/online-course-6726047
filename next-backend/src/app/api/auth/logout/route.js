//src/app/api/auth/logout/route.js

import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out" },
    { headers: corsHeaders }
  );

  const production = process.env.NODE_ENV === "production";

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}