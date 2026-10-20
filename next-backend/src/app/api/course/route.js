//src/app/api/course/route.js

import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getClientPromise } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";

function reply(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  const user = verifyJWT(request);

  if (!user) return reply({ message: "Please log in" }, 401);

  if (!["Teacher", "Student"].includes(user.role)) {
    return reply({ message: "Access denied" }, 403);
  }

  try {
    const client = await getClientPromise();
    const collection = client.db("online_course").collection("courses");
    const params = new URL(request.url).searchParams;

    const filter =
      user.role === "Teacher"
        ? { teacherId: user.id }
        : { status: { $ne: "Cancel" } };

    if (user.role === "Student" && params.get("mine") === "true") {
      filter.enrolledStudentIds = user.id;
    }

    const search = (params.get("search") || "").trim();

    if (search) {
      // Escape symbols so the search matches literal text.
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { teacherName: { $regex: escaped, $options: "i" } },
      ];
    }

    const courses = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return reply({ courses });
  } catch (error) {
    console.error("Course list error:", error.message);
    return reply({ message: "Unable to load courses" }, 500);
  }
}

export async function POST(request) {
  const user = verifyJWT(request);

  if (!user) return reply({ message: "Please log in" }, 401);

  if (user.role !== "Teacher") {
    return reply({ message: "Only Teachers can create courses" }, 403);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return reply({ message: "Invalid JSON" }, 400);
  }

  const valid =
    body &&
    typeof body.name === "string" &&
    body.name.trim().length > 0 &&
    Number.isInteger(body.duration) &&
    body.duration > 0 &&
    Array.isArray(body.topics) &&
    body.topics.length > 0 &&
    body.topics.every(
      (topic) => typeof topic === "string" && topic.trim().length > 0
    ) &&
    typeof body.price === "number" &&
    Number.isFinite(body.price) &&
    body.price >= 0 &&
    Number.isInteger(body.maxStudent) &&
    body.maxStudent > 0 &&
    ["Open", "Close", "Cancel"].includes(body.status);

  if (!valid) {
    return reply({ message: "Please provide valid course information" }, 400);
  }

  try {
    const client = await getClientPromise();

    const course = {
      name: body.name.trim(),
      duration: body.duration,
      topics: body.topics.map((topic) => topic.trim()),
      price: body.price,
      maxStudent: body.maxStudent,
      status: body.status,
      teacherId: user.id,
      teacherName: user.username,
      enrolledStudentIds: [],
      createdAt: new Date(),
    };

    const result = await client
      .db("online_course")
      .collection("courses")
      .insertOne(course);

    return reply(
      {
        message: "Course created",
        course: { ...course, _id: result.insertedId },
      },
      201
    );
  } catch (error) {
    console.error("Course creation error:", error.message);
    return reply({ message: "Unable to create course" }, 500);
  }
}