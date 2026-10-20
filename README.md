# How to Test the App

## Student Information

- **Student Name: Aunt Htoo Lin Win**
- **Student ID: 6726047**

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Teacher | teacher1@example.com | CourseTest2026 |
| Teacher | teacher2@example.com | CourseTest2026 |
| Teacher | teacher3@example.com | CourseTest2026 |
| Student | student1@example.com | CourseTest2026 |
| Student | student2@example.com | CourseTest2026 |
| Student | student3@example.com | CourseTest2026 |

## Deployed URLs

- Frontend: https://online-course-6726047-frontend.vercel.app
- Backend: https://online-course-6726047-backend.vercel.app

## Prerequisites

- Node.js 24 and npm
- MongoDB Atlas database and connection string
- Git

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

Open CMD in the project folder:

```cmd
cd next-backend
npm install
```

Create `.env.local` inside `next-backend`:

```env
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_JWT_SECRET
FRONTEND_URL=http://localhost:5173
```

Replace the placeholder values with your own database connection string
and JWT secret. Do not commit this file.

Create the six test accounts:

```cmd
node --env-file=.env.local seed.cjs
```

Start the backend:

```cmd
npm run dev
```

Backend runs at http://localhost:3000.

### 2. Frontend Setup (`react-frontend/`)

Open a second CMD in the project folder:

```cmd
cd react-frontend
npm install
```

Create `.env` inside `react-frontend`:

```env
VITE_API_URL=http://localhost:3000
```

Start the frontend:

```cmd
npm run dev
```

Open http://localhost:5173.

### 3. Testing Walkthrough

1. Log in as a Teacher using the test credentials above.
2. Create a course with its name, duration, topics, price,
   maximum students, and status.
3. View course details and edit the course.
4. Log out and log in as a Student.
5. Search by course name or Teacher name.
6. Enroll in an Open course with available places.
7. Select "My enrolled courses" to see enrolled courses.
8. Confirm duplicate enrollment is prevented.
9. Confirm enrollment is disabled for full or closed courses.
10. Log in as the course's Teacher and view enrolled students.
11. Confirm a course with enrolled students cannot be deleted.
12. Create a separate empty course and delete it.
13. Refresh the page to check that login persists.
14. Log out to end the session.

### 4. Production Configuration

Backend environment variables:

- MONGODB_URI: MongoDB Atlas connection string
- JWT_SECRET: secret used to sign authentication tokens
- FRONTEND_URL: https://online-course-6726047-frontend.vercel.app

Frontend environment variable:

- VITE_API_URL: https://online-course-6726047-backend.vercel.app

Both projects are deployed separately on Vercel from this repository.
