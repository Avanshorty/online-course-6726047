import { useContext, useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { UserContext, UserProvider, api } from "./context/UserContext";
import CourseControls, { CourseForm } from "./CourseControls";

function Home() {
  const { user, loading, login, logout } = useContext(UserContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      setCourses([]);
      return;
    }

    let active = true;

    const params = new URLSearchParams({
      search,
      mine: String(mine),
    });

    api(`/course?${params}`)
      .then((data) => {
        if (active) {
          setCourses(data.courses);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [user, search, mine, refresh]);

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      await login(email, password);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await logout();
      setCreating(false);
      setSearch("");
      setMine(false);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Online Course Service</h1>

      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}

      {!user ? (
        <form onSubmit={submitLogin}>
          <h2>Login</h2>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{ display: "block", margin: "8px 0 16px" }}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{ display: "block", margin: "8px 0 16px" }}
            />
          </label>

          <button disabled={busy}>
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>
      ) : (
        <>
          <p>
            Welcome, {user.username} — {user.role}
          </p>

          <button onClick={signOut}>Logout</button>

          {user.role === "Teacher" && (
            <div>
              <button onClick={() => setCreating(!creating)}>
                {creating ? "Cancel" : "Create Course"}
              </button>

              {creating && (
                <CourseForm
                  onSaved={() => {
                    setCreating(false);
                    setRefresh((value) => value + 1);
                  }}
                />
              )}
            </div>
          )}

          <h2>
            {user.role === "Teacher" ? "My Courses" : "Available Courses"}
          </h2>

          {user.role === "Student" && (
            <div>
              <input
                placeholder="Search course or Teacher name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <label style={{ marginLeft: 16 }}>
                <input
                  type="checkbox"
                  checked={mine}
                  onChange={(event) => setMine(event.target.checked)}
                />
                My enrolled courses
              </label>
            </div>
          )}

          {courses.length === 0 && <p>No courses found.</p>}

          {courses.map((course) => (
            <article
              key={course._id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 16,
                marginTop: 16,
              }}
            >
              <h3>{course.name}</h3>
              <p>Teacher: {course.teacherName}</p>
              <p>Duration: {course.duration} days</p>
              <p>Topics: {course.topics.join(", ")}</p>
              <p>Price: {course.price} THB</p>
              <p>Status: {course.status}</p>
              <p>
                Enrolled: {course.enrolledStudentIds.length}
                /{course.maxStudent}
              </p>
              <CourseControls
                course={course}
                onChanged={() => setRefresh((value) => value + 1)}
              />
            </article>
          ))}
        </>
      )}
    </main>
  );
}

export default function App() {
  return (
    <UserProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </HashRouter>
    </UserProvider>
  );
}