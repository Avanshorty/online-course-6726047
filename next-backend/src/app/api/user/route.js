//src/app/api/user/route.js

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyJWT } from "@/lib/auth";
import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  const identity = verifyJWT(request);

  if (!identity || !ObjectId.isValid(identity.id)) {
    return NextResponse.json(
      { message: "Please log in" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const user = await client
      .db("online_course")
      .collection("users")
      .findOne(
        { _id: new ObjectId(identity.id) },
        { projection: { password: 0 } }
      );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("User lookup failed:", error.message);

    return NextResponse.json(
      { message: "Unable to load user" },
      { status: 500, headers: corsHeaders }
    );
  }
}