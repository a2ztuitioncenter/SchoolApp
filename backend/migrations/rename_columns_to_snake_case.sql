-- Rename columns to snake_case for consistency

-- users table
ALTER TABLE users RENAME COLUMN "isActive" TO is_active;
ALTER TABLE users RENAME COLUMN "statusUpdatedAt" TO status_updated_at;
ALTER TABLE users RENAME COLUMN "schoolId" TO school_id;
ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE users RENAME COLUMN "teacherId" TO teacher_id;
ALTER TABLE users RENAME COLUMN "approvedBy" TO approved_by;
ALTER TABLE users RENAME COLUMN "rejectionReason" TO rejection_reason;

-- students table
ALTER TABLE students RENAME COLUMN "userId" TO user_id;
ALTER TABLE students RENAME COLUMN "createdAt" TO created_at;

-- fees table
ALTER TABLE fees RENAME COLUMN "studentId" TO student_id;
ALTER TABLE fees RENAME COLUMN "userId" TO user_id;
ALTER TABLE fees RENAME COLUMN "dueDate" TO due_date;
ALTER TABLE fees RENAME COLUMN "isPaid" TO is_paid;
ALTER TABLE fees RENAME COLUMN "paidDate" TO paid_date;
ALTER TABLE fees RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE fees RENAME COLUMN "schoolId" TO school_id;

-- attendance table
ALTER TABLE attendance RENAME COLUMN "userId" TO user_id;
ALTER TABLE attendance RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE attendance RENAME COLUMN "schoolId" TO school_id;

-- timetable table
ALTER TABLE timetable RENAME COLUMN "dayOfWeek" TO day_of_week;
ALTER TABLE timetable RENAME COLUMN "startTime" TO start_time;
ALTER TABLE timetable RENAME COLUMN "endTime" TO end_time;
ALTER TABLE timetable RENAME COLUMN "teacherId" TO teacher_id;
ALTER TABLE timetable RENAME COLUMN "classLevel" TO class_level;
ALTER TABLE timetable RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE timetable RENAME COLUMN "schoolId" TO school_id;

-- syllabus table
ALTER TABLE syllabus RENAME COLUMN "teacherId" TO teacher_id;
ALTER TABLE syllabus RENAME COLUMN "classLevel" TO class_level;
ALTER TABLE syllabus RENAME COLUMN "createdAt" TO created_at;

-- teacher_class_assignment table
ALTER TABLE teacher_class_assignment RENAME COLUMN "teacherId" TO teacher_id;
ALTER TABLE teacher_class_assignment RENAME COLUMN "classLevel" TO class_level;
ALTER TABLE teacher_class_assignment RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE teacher_class_assignment RENAME COLUMN "schoolId" TO school_id;

-- notifications table
ALTER TABLE notifications RENAME COLUMN "attachmentUrl" TO attachment_url;
ALTER TABLE notifications RENAME COLUMN "recipientRole" TO recipient_role;
ALTER TABLE notifications RENAME COLUMN "classLevel" TO class_level;
ALTER TABLE notifications RENAME COLUMN "createdBy" TO created_by;
ALTER TABLE notifications RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE notifications RENAME COLUMN "schoolId" TO school_id;

-- results table
ALTER TABLE results RENAME COLUMN "studentId" TO student_id;
ALTER TABLE results RENAME COLUMN "recordedBy" TO recorded_by;
ALTER TABLE results RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE results RENAME COLUMN "schoolId" TO school_id;

-- exam_results table
ALTER TABLE exam_results RENAME COLUMN "createdAt" TO created_at;

-- homework table
ALTER TABLE homework RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE homework RENAME COLUMN "schoolId" TO school_id;
