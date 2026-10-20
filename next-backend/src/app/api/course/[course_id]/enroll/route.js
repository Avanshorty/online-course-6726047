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

export async function POST(request, context) {
  const user = verifyJWT(request);

  if (!user) {
    return reply({ message: "Please log in" }, 401);
  }

  if (user.role !== "Student") {
    return reply({ message: "Only Students can enroll" }, 403);
  }

  const { course_id } = await context.params;

  if (!ObjectId.isValid(course_id)) {
    return reply({ message: "Invalid course ID" }, 400);
  }

  try {
    const client = await getClientPromise();
    const courses = client.db("online_course").collection("courses");
    const id = new ObjectId(course_id);

    // Check all enrollment rules in the same database operation.
    const result = await courses.updateOne(
      {
        _id: id,
        status: "Open",
        enrolledStudentIds: { $ne: user.id },
        $expr: {
          $lt: [{ $size: "$enrolledStudentIds" }, "$maxStudent"],
        },
      },
      {
        $addToSet: { enrolledStudentIds: user.id },
      }
    );

    if (result.modifiedCount === 1) {
      return reply({ message: "Enrolled successfully" }, 201);
    }

    const course = await courses.findOne({ _id: id });

    if (!course) {
      return reply({ message: "Course not found" }, 404);
    }

    if (course.enrolledStudentIds.includes(user.id)) {
      return reply({ message: "Already enrolled in this course" }, 409);
    }

    if (course.status !== "Open") {
      return reply({ message: "Course is not open for enrollment" }, 409);
    }

    return reply({ message: "Course is full or no longer available" }, 409);
  } catch (error) {
    console.error("Enrollment error:", error.message);
    return reply({ message: "Unable to enroll" }, 500);
  }
}