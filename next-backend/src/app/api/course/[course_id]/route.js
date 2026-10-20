//src/app/api/course/[course_id]/route.js

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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

// Shared authentication, ID validation, and ownership checks.
async function handle(request, context, action) {
  const user = verifyJWT(request);

  if (!user) return reply({ message: "Please log in" }, 401);

  if (!["Teacher", "Student"].includes(user.role)) {
    return reply({ message: "Access denied" }, 403);
  }

  const { course_id } = await context.params;

  if (!ObjectId.isValid(course_id)) {
    return reply({ message: "Invalid course ID" }, 400);
  }

  try {
    const client = await getClientPromise();
    const db = client.db("online_course");
    const courses = db.collection("courses");
    const course = await courses.findOne({
      _id: new ObjectId(course_id),
    });

    if (!course) {
      return reply({ message: "Course not found" }, 404);
    }

    if (user.role === "Teacher" && course.teacherId !== user.id) {
      return reply({ message: "This course belongs to another Teacher" }, 403);
    }

    return await action({ user, db, courses, course });
  } catch (error) {
    console.error("Course operation error:", error.message);
    return reply({ message: "Unable to complete operation" }, 500);
  }
}

export async function GET(request, context) {
  return handle(request, context, async ({ user, db, course }) => {
    if (user.role === "Student") {
      if (course.status === "Cancel") {
        return reply({ message: "Course not available" }, 404);
      }

      const { enrolledStudentIds, ...details } = course;

      return reply({
        course: {
          ...details,
          enrolledCount: enrolledStudentIds.length,
          isEnrolled: enrolledStudentIds.includes(user.id),
        },
      });
    }

    const students = await db
      .collection("users")
      .find(
        {
          _id: {
            $in: course.enrolledStudentIds.map((id) => new ObjectId(id)),
          },
        },
        { projection: { username: 1, email: 1 } }
      )
      .toArray();

    return reply({ course: { ...course, students } });
  });
}

export async function PUT(request, context) {
  return handle(request, context, async ({ user, courses, course }) => {
    if (user.role !== "Teacher") {
      return reply({ message: "Only Teachers can update courses" }, 403);
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
      return reply({ message: "Invalid course information" }, 400);
    }

    // Check capacity inside the update to handle concurrent enrollments.
    const result = await courses.updateOne(
      {
        _id: course._id,
        teacherId: user.id,
        $expr: {
          $lte: [{ $size: "$enrolledStudentIds" }, body.maxStudent],
        },
      },
      {
        $set: {
          name: body.name.trim(),
          duration: body.duration,
          topics: body.topics.map((topic) => topic.trim()),
          price: body.price,
          maxStudent: body.maxStudent,
          status: body.status,
        },
      }
    );

    if (!result.matchedCount) {
      return reply(
        { message: "Capacity cannot be lower than the enrolled count" },
        409
      );
    }

    return reply({ message: "Course updated" });
  });
}

export async function DELETE(request, context) {
  return handle(request, context, async ({ user, courses, course }) => {
    if (user.role !== "Teacher") {
      return reply({ message: "Only Teachers can delete courses" }, 403);
    }

    // Enrollment and deletion conditions are checked atomically.
    const result = await courses.deleteOne({
      _id: course._id,
      teacherId: user.id,
      enrolledStudentIds: { $size: 0 },
    });

    if (!result.deletedCount) {
      return reply(
        { message: "Cannot delete a course with enrolled Students" },
        409
      );
    }

    return reply({ message: "Course deleted" });
  });
}