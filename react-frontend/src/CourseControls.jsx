import { useContext, useState } from "react";
import { UserContext, api } from "./context/UserContext";

export default function CourseControls({ course, onChanged }) {
  const { user } = useContext(UserContext);
  const [details, setDetails] = useState(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const teacher = user.role === "Teacher";

  async function viewDetails() {
    setBusy(true);
    setMessage("");

    try {
      const data = await api(`/course/${course._id}`);
      setDetails(data.course);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function enroll() {
    setBusy(true);
    setMessage("");

    try {
      const data = await api(`/course/${course._id}/enroll`, {
        method: "POST",
      });

      setMessage(data.message);
      setDetails(null);
      onChanged();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${course.name}"?`)) return;

    setBusy(true);
    setMessage("");

    try {
      await api(`/course/${course._id}`, { method: "DELETE" });
      onChanged();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const enrolled = course.enrolledStudentIds.includes(user.id);
  const full = course.enrolledStudentIds.length >= course.maxStudent;

  return (
    <div>
      <button disabled={busy} onClick={viewDetails}>
        Details
      </button>

      {teacher ? (
        <>
          <button disabled={busy} onClick={() => setEditing(!editing)}>
            {editing ? "Close editor" : "Edit"}
          </button>
          <button
            disabled={busy || course.enrolledStudentIds.length > 0}
            onClick={remove}
          >
            Delete
          </button>
        </>
      ) : (
        <button
          disabled={busy || enrolled || full || course.status !== "Open"}
          onClick={enroll}
        >
          {enrolled ? "Already enrolled" : full ? "Full" : "Enroll"}
        </button>
      )}

      {message && <p role="status">{message}</p>}

      {details && (
        <section>
          <h4>Course details</h4>
          <p>Name: {details.name}</p>
          <p>Teacher: {details.teacherName}</p>
          <p>Duration: {details.duration} days</p>
          <p>Topics: {details.topics.join(", ")}</p>
          <p>Price: {details.price} THB</p>
          <p>Status: {details.status}</p>

          {teacher && (
            <>
              <h4>Enrolled Students</h4>
              {details.students.length === 0 ? (
                <p>No Students enrolled.</p>
              ) : (
                <ul>
                  {details.students.map((student) => (
                    <li key={student._id}>
                      {student.username} — {student.email}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <button onClick={() => setDetails(null)}>Close details</button>
        </section>
      )}

      {editing && (
        <CourseForm
          course={course}
          onSaved={() => {
            setEditing(false);
            setDetails(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

export function CourseForm({ course, onSaved }) {
  const [form, setForm] = useState({
    name: course?.name || "",
    duration: course?.duration ?? 1,
    topics: course?.topics.join(", ") || "",
    price: course?.price ?? 0,
    maxStudent: course?.maxStudent ?? 1,
    status: course?.status || "Open",
  });

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await api(course ? `/course/${course._id}` : "/course", {
        method: course ? "PUT" : "POST",
        body: JSON.stringify({
          name: form.name,
          duration: Number(form.duration),
          topics: form.topics.split(",").map((topic) => topic.trim())
            .filter(Boolean),
          price: Number(form.price),
          maxStudent: Number(form.maxStudent),
          status: form.status,
        }),
      });

      onSaved();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} style={{ padding: 16, border: "1px solid #ccc" }}>
      <h3>{course ? "Edit Course" : "Create Course"}</h3>

      <label>
        Course name
        <input name="name" value={form.name} onChange={change} required />
      </label>
      <br />

      <label>
        Duration (days)
        <input type="number" name="duration" min="1" step="1"
          value={form.duration} onChange={change} required />
      </label>
      <br />

      <label>
        Topics (separate with commas)
        <input name="topics" value={form.topics} onChange={change} required />
      </label>
      <br />

      <label>
        Price (THB)
        <input type="number" name="price" min="0" step="0.01"
          value={form.price} onChange={change} required />
      </label>
      <br />

      <label>
        Max Students
        <input type="number" name="maxStudent" min="1" step="1"
          value={form.maxStudent} onChange={change} required />
      </label>
      <br />

      <label>
        Status
        <select name="status" value={form.status} onChange={change}>
          <option>Open</option>
          <option>Close</option>
          <option>Cancel</option>
        </select>
      </label>
      <br />

      <button disabled={busy}>{busy ? "Saving..." : "Save Course"}</button>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}