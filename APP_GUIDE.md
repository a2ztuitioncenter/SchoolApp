# A2Z Tuition App - User Guide

Efficiently navigate and manage your academic workflow.

## 🎓 For Students

### 1. Dashboard Overview
- **Home**: View your latest homework, upcoming DPPs, and today's schedule.
- **Practice (DPP)**: Access daily practice problems.
- **Materials**: Download study resources provided by teachers.
- **Submissions**: Track your work history and upload new assignments.

### 2. Submitting Homework/DPPs
- Go to the **Submissions** tab.
- Click **"Submit Assignment"**.
- Select the active assignment from the dropdown.
- Upload your file (PDF or Image) and click **Submit**.
- *Note: You can re-submit work until it is reviewed by a teacher.*

### 3. Checking Results & Feedback
- Visit the **Results** tab to see your performance in tests.
- In the **Submissions** list, check for "Reviewed" status to see teacher remarks.

---

## 👩‍🏫 For Teachers

### 1. Managing Assignments
- Use the **Homework** module to create new tasks for specific classes/sections.
- Upload attachments (PDFs) that students can download.

### 2. Reviewing Submissions
- Go to **Submissions** to see pending student work.
- Use the **Review** button to view the file, provide marks, and add feedback (remarks).
- *Reviewing a submission hides it from the student's pending upload list.*

### 3. Attendance & Progress
- Mark daily attendance in the **Attendance** module.
- Track syllabus completion by marking chapters as "Done" in the **Syllabus** section.

### 4. Communication
- Post **Announcements** to notify all students in your assigned classes.
- Use **Help & Support** to report technical issues.

---

## 🛠️ General Tips
- **Profile**: Keep your email and phone updated via the Profile dropdown.
- **Documentation**: Access the dynamic "Documentation" tab for the latest feature updates.
- **Logout**: Always logout from shared devices using the red "Logout" button.

---

## 🚀 Deployment & Development Guide

### 1. Local Development (Native)
Run the services directly on your machine for the fastest development cycle.
- **Backend**: `cd backend && bun install && bun run dev`
- **Frontend**: `cd frontend && bun install && bun run dev`
- **Mobile**: `cd mobile-app && bun install && npx expo start`

### 2. Manual Docker Workflow (Production Ready)
This is the recommended way to run containers separately for hosting on different platforms.

#### **Backend Service**
**Build:**
```bash
cd backend
docker build -t tuition-backend .
```

**Run (Loads all variables from .env automatically):**
```bash
docker run -d --name tuition-backend -p 3000:3000 --env-file .env tuition-backend
```

#### **Frontend Service**
**Build:**
```bash
cd frontend
docker build -t tuition-frontend .
```

**Run:**
```bash
docker run -d --name tuition-frontend -p 8000:8000 tuition-frontend
```

### 3. Render Deployment
- **Backend**: 
  - Connect your repository.
  - Set the Build Command to: `bun install`
  - Set the Start Command to: `bun run src/server.js`
  - **Environment Variables**: Add your `DATABASE_URL`, `JWT_SECRET`, etc., directly in the Render Dashboard. The app will detect these automatically.
- **Frontend**:
  - Deploy as a Web Service or Static Site.
  - Port: `8000`

---

*Note: The `.env` file is excluded from Docker images via `.dockerignore` for security. Locally, Docker injects variables using `--env-file .env`. On Render, variables are injected automatically via the dashboard.*
