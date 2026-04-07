# Tuition Management System (A2Z)

A comprehensive, full-stack tuition management system featuring dashboards for Admins, Teachers, and Students. Built with Express.js, PostgreSQL, and Bun.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your local machine:
- [Bun](https://bun.sh/) (Recommended) or [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (Ensure it is running)

---

### 2. Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd tuition-app
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   bun install  # or npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   DB_NAME=tuition_app

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Initialization (Set to true for first run)
   INITIALIZE_DB=true
   ```

4. **Setup Database:**
   Ensure PostgreSQL is running and the database `tuition_app` exists. The server will automatically create tables on the first run if `INITIALIZE_DB=true`.

---

### 3. Running the Application

For the best experience, run both the backend and the frontend gateway:

#### **Backend (API Server)**
```bash
cd backend
bun run src/server.js
```
Runs on: `http://localhost:3000`

#### **Frontend (Gateway Server)**
The frontend uses a Bun-based server to handle routing and proxy requests to the backend.
```bash
cd frontend
bun run server.ts
```
Runs on: `http://localhost:8000`

---

### 4. Default Login Credentials

After the first run (initialization), use these credentials to access the Admin panel:

- **Admin Login:** [http://localhost:8000/admin-login.html](http://localhost:8000/admin-login.html)
  - **Phone:** `9999999999`
  - **Password:** `admin123`

- **Student Dashboard:** [http://localhost:8000/student-login.html](http://localhost:8000/student-login.html)
- **Teacher Dashboard:** [http://localhost:8000/teacher-login.html](http://localhost:8000/teacher-login.html)

---

## 🛠️ Project Structure

- `/backend`: Express.js API, database models, and route logic.
- `/frontend`: Static HTML files and modular Vanilla JS for the UI.
- `/frontend/server.ts`: Bun-based reverse proxy for local development.
- `/uploads`: Storage for materials, homework, and notifications.

---

## 📁 Key Features
- **Admin Dashboard**: User management, student onboarding, fee tracking, and financials.
- **Teacher Dashboard**: Attendance marking, homework assignment, and material uploads.
- **Student Dashboard**: Real-time attendance summary, homework tracker, and fee status.
- **Unified Messaging**: Send notifications and notices with file attachments.
