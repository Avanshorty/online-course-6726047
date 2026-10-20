//src/app/api/auth/login/route.js

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !body.email.trim() ||
      !body.password
    ) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const user = await client
      .db("online_course")
      .collection("users")
      .findOne({ email: body.email.trim().toLowerCase() });

    const validPassword =
      user && (await bcrypt.compare(body.password, user.password));

    if (!validPassword) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401, headers: corsHeaders }
      );
    }

    const safeUser = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(safeUser, process.env.JWT_SECRET, {
      expiresIn: "8h",
      algorithm: "HS256",
    });

    const response = NextResponse.json(
      { message: "Login successful", user: safeUser },
      { headers: corsHeaders }
    );

    const production = process.env.NODE_ENV === "production";

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: production,
      sameSite: production ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error.message);

    return NextResponse.json(
      { message: "Unable to log in" },
      { status: 500, headers: corsHeaders }
    );
  }
}