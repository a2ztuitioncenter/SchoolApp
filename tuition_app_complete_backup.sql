-- PostgreSQL database export for tuition_app
-- Generated on 2026-05-22T06:38:50.232Z
-- Complete schema and data dump

-- Drop existing tables
DROP TABLE IF EXISTS "academic_classes" CASCADE;
DROP TABLE IF EXISTS "academic_sections" CASCADE;
DROP TABLE IF EXISTS "app_files" CASCADE;
DROP TABLE IF EXISTS "attendance" CASCADE;
DROP TABLE IF EXISTS "audit_log" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "content_pages" CASCADE;
DROP TABLE IF EXISTS "exam_results" CASCADE;
DROP TABLE IF EXISTS "fees" CASCADE;
DROP TABLE IF EXISTS "homework" CASCADE;
DROP TABLE IF EXISTS "materials" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;
DROP TABLE IF EXISTS "results" CASCADE;
DROP TABLE IF EXISTS "students" CASCADE;
DROP TABLE IF EXISTS "study_materials" CASCADE;
DROP TABLE IF EXISTS "subject_assignments" CASCADE;
DROP TABLE IF EXISTS "subjects" CASCADE;
DROP TABLE IF EXISTS "submissions" CASCADE;
DROP TABLE IF EXISTS "syllabus" CASCADE;
DROP TABLE IF EXISTS "teacher_class_assignment" CASCADE;
DROP TABLE IF EXISTS "timetable" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

CREATE TABLE "academic_classes" (
  "id" integer DEFAULT nextval('academic_classes_id_seq'::regclass) NOT NULL,
  "class_name" character varying NOT NULL,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX academic_classes_class_name_unique ON public.academic_classes USING btree (class_name);

CREATE TABLE "academic_sections" (
  "id" integer DEFAULT nextval('academic_sections_id_seq'::regclass) NOT NULL,
  "class_id" integer NOT NULL,
  "section_name" character varying NOT NULL,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX academic_sections_class_section_unique ON public.academic_sections USING btree (class_id, section_name);

CREATE TABLE "app_files" (
  "id" integer DEFAULT nextval('app_files_id_seq'::regclass) NOT NULL,
  "drive_file_id" character varying NOT NULL,
  "file_name" character varying NOT NULL,
  "class_level" character varying,
  "section" character varying,
  "uploaded_by" integer,
  "file_type" character varying,
  "mime_type" character varying,
  "file_size" bigint,
  "web_view_link" text,
  "download_link" text,
  "created_at" timestamp without time zone DEFAULT now()
);


CREATE TABLE "attendance" (
  "id" integer DEFAULT nextval('attendance_id_seq'::regclass) NOT NULL,
  "student_id" integer,
  "user_id" integer,
  "class_level" character varying,
  "section" character varying,
  "date" date NOT NULL,
  "is_present" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "school_id" character varying DEFAULT 'school-001'::character varying
);

CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);
CREATE UNIQUE INDEX attendance_unique ON public.attendance USING btree (student_id, date);

CREATE TABLE "audit_log" (
  "id" integer DEFAULT nextval('audit_log_id_seq'::regclass) NOT NULL,
  "admin_id" integer,
  "action" character varying NOT NULL,
  "target_type" character varying,
  "target_id" integer,
  "changes" jsonb,
  "created_at" timestamp without time zone DEFAULT now()
);


CREATE TABLE "audit_logs" (
  "id" integer DEFAULT nextval('audit_logs_id_seq'::regclass) NOT NULL,
  "user_id" integer,
  "action" text NOT NULL,
  "entity" text,
  "entity_id" text,
  "details" jsonb,
  "ip_address" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "school_id" character varying
);


CREATE TABLE "content_pages" (
  "id" integer DEFAULT nextval('content_pages_id_seq'::regclass) NOT NULL,
  "key" character varying NOT NULL,
  "content" text DEFAULT ''::text,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX content_pages_key_unique ON public.content_pages USING btree (key);

CREATE TABLE "exam_results" (
  "id" integer DEFAULT nextval('exam_results_id_seq'::regclass) NOT NULL,
  "student_id" integer,
  "student_name" character varying,
  "roll_number" character varying,
  "class_level" character varying,
  "section" character varying,
  "exam_title" character varying,
  "subjects" jsonb NOT NULL,
  "total_marks" numeric,
  "obtained_marks" numeric,
  "percentage" numeric,
  "teacher_id" integer,
  "created_at" timestamp without time zone DEFAULT now(),
  "remarks" text,
  "school_id" character varying DEFAULT 'school-001'::character varying
);

CREATE INDEX idx_exam_results_student ON public.exam_results USING btree (student_id);

CREATE TABLE "fees" (
  "id" integer DEFAULT nextval('fees_id_seq'::regclass) NOT NULL,
  "student_id" integer NOT NULL,
  "user_id" integer,
  "amount" numeric NOT NULL,
  "description" character varying,
  "due_date" date NOT NULL,
  "is_paid" boolean DEFAULT false,
  "paid_date" date,
  "status" character varying DEFAULT 'pending'::character varying,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fees_student ON public.fees USING btree (student_id);

CREATE TABLE "homework" (
  "id" integer DEFAULT nextval('homework_id_seq'::regclass) NOT NULL,
  "teacher_id" integer,
  "class_level" character varying NOT NULL,
  "section" character varying,
  "title" character varying NOT NULL,
  "description" text,
  "due_date" date,
  "subject_id" uuid,
  "subject" character varying,
  "attachment_url" character varying,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "type" character varying DEFAULT 'homework'::character varying,
  "created_at" timestamp without time zone DEFAULT now()
);

CREATE INDEX idx_homework_class ON public.homework USING btree (class_level, section);

CREATE TABLE "materials" (
  "id" integer DEFAULT nextval('materials_id_seq'::regclass) NOT NULL,
  "title" character varying NOT NULL,
  "description" text,
  "class_level" character varying NOT NULL,
  "section" character varying DEFAULT 'ALL'::character varying,
  "subject" character varying,
  "file_url" character varying NOT NULL,
  "uploaded_by" character varying,
  "uploaded_by_id" integer,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "subject_id" uuid
);

CREATE INDEX idx_materials_class_section ON public.materials USING btree (class_level, section);

CREATE TABLE "notifications" (
  "id" integer DEFAULT nextval('notifications_id_seq'::regclass) NOT NULL,
  "title" character varying NOT NULL,
  "message" text NOT NULL,
  "recipient_role" character varying DEFAULT 'ALL'::character varying,
  "class_level" character varying,
  "section" character varying DEFAULT 'ALL'::character varying,
  "created_by" integer,
  "attachment_url" character varying,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now()
);


CREATE TABLE "organizations" (
  "id" integer DEFAULT nextval('organizations_id_seq'::regclass) NOT NULL,
  "name" text DEFAULT 'ABC School'::text NOT NULL,
  "logo_url" text,
  "contact_email" text,
  "address" text,
  "settings" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE "results" (
  "id" integer DEFAULT nextval('results_id_seq'::regclass) NOT NULL,
  "student_id" integer NOT NULL,
  "exam_title" character varying NOT NULL,
  "subject" character varying NOT NULL,
  "marks_obtained" numeric NOT NULL,
  "total_marks" numeric NOT NULL,
  "remarks" text,
  "recorded_by" integer,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_student ON public.results USING btree (student_id);
CREATE INDEX idx_results_exam ON public.results USING btree (exam_title);

CREATE TABLE "students" (
  "id" integer DEFAULT nextval('students_id_seq'::regclass) NOT NULL,
  "user_id" integer,
  "name" character varying NOT NULL,
  "class_level" character varying NOT NULL,
  "section" character varying,
  "father_name" character varying,
  "mother_name" character varying,
  "phone" character varying,
  "email" character varying,
  "roll_number" character varying,
  "joining_date" date NOT NULL,
  "date_of_birth" date,
  "status" character varying DEFAULT 'pending'::character varying,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now()
);

CREATE INDEX idx_students_class_section ON public.students USING btree (class_level, section);
CREATE UNIQUE INDEX students_roll_number_unique ON public.students USING btree (roll_number);
CREATE UNIQUE INDEX students_user_id_unique ON public.students USING btree (user_id);
CREATE UNIQUE INDEX unique_student_user_id ON public.students USING btree (user_id);

CREATE TABLE "study_materials" (
  "id" integer DEFAULT nextval('study_materials_id_seq'::regclass) NOT NULL,
  "title" character varying NOT NULL,
  "description" text,
  "file_url" text NOT NULL,
  "class_id" integer NOT NULL,
  "section_id" integer,
  "uploaded_by" integer NOT NULL,
  "uploader_role" character varying NOT NULL,
  "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "subject_id" uuid
);

CREATE INDEX idx_study_materials_class_section ON public.study_materials USING btree (class_id, section_id);
CREATE INDEX idx_study_materials_uploaded_by ON public.study_materials USING btree (uploaded_by);
CREATE INDEX idx_study_materials_created_at ON public.study_materials USING btree (created_at DESC);

CREATE TABLE "subject_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "subject_id" uuid,
  "class_level" character varying NOT NULL,
  "section" character varying DEFAULT 'ALL'::character varying,
  "teacher_id" integer,
  "assigned_by" integer,
  "created_at" timestamp without time zone DEFAULT now()
);


CREATE TABLE "subjects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" character varying NOT NULL,
  "code" character varying,
  "created_at" timestamp without time zone DEFAULT now()
);


CREATE TABLE "submissions" (
  "id" integer DEFAULT nextval('submissions_id_seq'::regclass) NOT NULL,
  "homework_id" integer,
  "student_id" integer,
  "file_url" text NOT NULL,
  "status" character varying DEFAULT 'submitted'::character varying,
  "remark_text" text,
  "marks" text,
  "reviewed_by" integer,
  "reviewed_at" timestamp without time zone,
  "submitted_at" timestamp without time zone DEFAULT now()
);

CREATE INDEX idx_submissions_student ON public.submissions USING btree (student_id);
CREATE INDEX idx_submissions_homework ON public.submissions USING btree (homework_id);
CREATE UNIQUE INDEX submissions_unique ON public.submissions USING btree (homework_id, student_id);

CREATE TABLE "syllabus" (
  "id" integer DEFAULT nextval('syllabus_id_seq'::regclass) NOT NULL,
  "teacher_id" integer,
  "class_level" character varying NOT NULL,
  "section" character varying DEFAULT 'ALL'::character varying,
  "subject" character varying NOT NULL,
  "chapter" character varying NOT NULL,
  "description" text,
  "completed" boolean DEFAULT false,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now()
);


CREATE TABLE "teacher_class_assignment" (
  "id" integer DEFAULT nextval('teacher_class_assignment_id_seq'::regclass) NOT NULL,
  "teacher_id" integer,
  "class_level" character varying NOT NULL,
  "section" character varying DEFAULT 'ALL'::character varying,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now()
);

CREATE UNIQUE INDEX tca_unique ON public.teacher_class_assignment USING btree (teacher_id, class_level, section);

CREATE TABLE "timetable" (
  "id" integer DEFAULT nextval('timetable_id_seq'::regclass) NOT NULL,
  "teacher_id" integer,
  "day_of_week" character varying NOT NULL,
  "start_time" time without time zone NOT NULL,
  "end_time" time without time zone NOT NULL,
  "class_level" character varying NOT NULL,
  "section" character varying DEFAULT 'ALL'::character varying,
  "subject" character varying,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now(),
  "subject_id" uuid
);


CREATE TABLE "users" (
  "id" integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  "name" character varying,
  "phone" character varying NOT NULL,
  "email" character varying,
  "password" character varying NOT NULL,
  "role" character varying NOT NULL,
  "is_active" boolean DEFAULT true,
  "school_id" character varying DEFAULT 'school-001'::character varying,
  "created_at" timestamp without time zone DEFAULT now(),
  "status" character varying DEFAULT 'pending'::character varying,
  "teacher_id" character varying,
  "approved_by" integer,
  "rejection_reason" text,
  "username" character varying,
  "status_updated_at" timestamp without time zone,
  "avatar_url" text,
  "avatar_drive_id" character varying,
  "last_login_at" timestamp without time zone,
  "designation" text,
  "password_status" character varying DEFAULT 'verified'::character varying
);

CREATE INDEX idx_users_username_lower ON public.users USING btree (lower((username)::text));
CREATE INDEX idx_users_role_status ON public.users USING btree (role, status);
CREATE UNIQUE INDEX idx_users_username_unique ON public.users USING btree (lower((username)::text)) WHERE (username IS NOT NULL);

INSERT INTO "academic_classes" ("id", "class_name", "created_at") VALUES (1, '10', '"2026-04-19T11:07:13.066Z"');
INSERT INTO "academic_classes" ("id", "class_name", "created_at") VALUES (73, '12', '"2026-04-24T12:16:38.218Z"');

INSERT INTO "academic_sections" ("id", "class_id", "section_name", "created_at") VALUES (1, 1, 'A', '"2026-04-19T11:07:13.066Z"');
INSERT INTO "academic_sections" ("id", "class_id", "section_name", "created_at") VALUES (2, 1, 'B', '"2026-04-19T11:07:13.066Z"');
INSERT INTO "academic_sections" ("id", "class_id", "section_name", "created_at") VALUES (144, 73, 'A', '"2026-04-24T12:16:38.638Z"');

INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (12, '1778754755197_1000454526.jpg', '1778754755197_1000454526.jpg', '12', 'A', 12, 'homework', 'image/jpeg', '73270', '/uploads/1778754755197_1000454526.jpg', '/uploads/1778754755197_1000454526.jpg', '"2026-05-14T05:02:35.227Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (13, '1778755086880_Screenshot_2026-05-10-10-22-40-84_1c337646f29875672b5a61192b9010f9.jpg', '1778755086880_Screenshot_2026-05-10-10-22-40-84_1c337646f29875672b5a61192b9010f9.jpg', '12', 'A', 12, 'material', 'image/jpeg', '613906', '/uploads/1778755086880_Screenshot_2026-05-10-10-22-40-84_1c337646f29875672b5a61192b9010f9.jpg', '/uploads/1778755086880_Screenshot_2026-05-10-10-22-40-84_1c337646f29875672b5a61192b9010f9.jpg', '"2026-05-14T05:08:06.907Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (14, '1778755209418_IMG_20260514_095557.jpg', '1778755209418_IMG_20260514_095557.jpg', '12', 'A', 12, 'notice', 'image/jpeg', '73270', '/uploads/1778755209418_IMG_20260514_095557.jpg', '/uploads/1778755209418_IMG_20260514_095557.jpg', '"2026-05-14T05:10:09.447Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (5, '1777623102792_Resume_..pdf', '1777623102792_Resume_..pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '211700', '/uploads/1777623102792_Resume_..pdf', '/uploads/1777623102792_Resume_..pdf', '"2026-05-01T02:41:38.982Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (7, '1778575484027_BIO.pdf', '1778575484027_BIO.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '72551', '/uploads/1778575484027_BIO.pdf', '/uploads/1778575484027_BIO.pdf', '"2026-05-12T03:14:44.192Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (8, '1778576257593_BIO.pdf', '1778576257593_BIO.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '72551', '/uploads/1778576257593_BIO.pdf', '/uploads/1778576257593_BIO.pdf', '"2026-05-12T03:27:37.778Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (9, '1778577358590_BIO.pdf', '1778577358590_BIO.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '72551', '/uploads/1778577358590_BIO.pdf', '/uploads/1778577358590_BIO.pdf', '"2026-05-12T03:45:58.807Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (10, '1778577584599_BIO.pdf', '1778577584599_BIO.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '72551', '/uploads/1778577584599_BIO.pdf', '/uploads/1778577584599_BIO.pdf', '"2026-05-12T03:49:44.804Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (4, '1777622312296_IIT_job_notification.pdf', '1777622312296_IIT_job_notification.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '553816', '/uploads/1777622312296_IIT_job_notification.pdf', '/uploads/1777622312296_IIT_job_notification.pdf', '"2026-05-01T02:28:28.444Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (3, '1777569291779_IMG-20260430-WA0016.jpg', '1777569291779_IMG-20260430-WA0016.jpg', 'General', 'All', NULL, 'homework', 'image/jpeg', '272848', '/uploads/1777569291779_IMG-20260430-WA0016.jpg', '/uploads/1777569291779_IMG-20260430-WA0016.jpg', '"2026-04-30T11:44:52.175Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (1, '1777528563629_muslim.pdf', '1777528563629_muslim.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '566430', '/uploads/1777528563629_muslim.pdf', '/uploads/1777528563629_muslim.pdf', '"2026-04-30T00:26:00.201Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (2, '1777556260601_IIT_job_notification.pdf', '1777556260601_IIT_job_notification.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '553816', '/uploads/1777556260601_IIT_job_notification.pdf', '/uploads/1777556260601_IIT_job_notification.pdf', '"2026-04-30T08:07:41.022Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (6, '1778575406148_Resume...pdf', '1778575406148_Resume...pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '218517', '/uploads/1778575406148_Resume...pdf', '/uploads/1778575406148_Resume...pdf', '"2026-05-12T03:13:27.286Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (11, '1778578649147_Resume...pdf', '1778578649147_Resume...pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '218517', '/uploads/1778578649147_Resume...pdf', '/uploads/1778578649147_Resume...pdf', '"2026-05-12T04:07:30.159Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (15, '1778755442303_IMG_20260514_095557.jpg', '1778755442303_IMG_20260514_095557.jpg', 'General', 'All', NULL, 'homework', 'image/jpeg', '73270', '/uploads/1778755442303_IMG_20260514_095557.jpg', '/uploads/1778755442303_IMG_20260514_095557.jpg', '"2026-05-14T05:14:02.717Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (16, '1778755481127_IMG_20260514_095557.jpg', '1778755481127_IMG_20260514_095557.jpg', 'General', 'All', NULL, 'homework', 'image/jpeg', '73270', '/uploads/1778755481127_IMG_20260514_095557.jpg', '/uploads/1778755481127_IMG_20260514_095557.jpg', '"2026-05-14T05:14:41.154Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (17, '1778755538155_IMG_20260514_095557.jpg', '1778755538155_IMG_20260514_095557.jpg', 'General', 'All', NULL, 'study_material', 'image/jpeg', '73270', '/uploads/1778755538155_IMG_20260514_095557.jpg', '/uploads/1778755538155_IMG_20260514_095557.jpg', '"2026-05-14T05:15:38.563Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (18, '1778835872416_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '1778835872416_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', 'General', 'All', 106, 'homework', 'image/jpeg', '162535', '/uploads/1778835872416_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '/uploads/1778835872416_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '"2026-05-15T03:34:32.826Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (19, '1778836004294_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '1778836004294_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', 'General', 'All', 106, 'homework', 'image/jpeg', '162535', '/uploads/1778836004294_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '/uploads/1778836004294_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '"2026-05-15T03:36:44.321Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (20, '1778836063815_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '1778836063815_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', 'General', 'All', 106, 'homework', 'image/jpeg', '162535', '/uploads/1778836063815_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '/uploads/1778836063815_Screenshot_2026-05-15-14-29-31-348_com.android.chrome-edit.jpg', '"2026-05-15T03:37:44.229Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (21, '1779177055361_Buc_Converter.pdf', '1779177055361_Buc_Converter.pdf', 'General', 'All', 12, 'homework', 'application/pdf', '116647', '/uploads/1779177055361_Buc_Converter.pdf', '/uploads/1779177055361_Buc_Converter.pdf', '"2026-05-19T02:20:56.866Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (22, '1779177132948_Test.pdf', '1779177132948_Test.pdf', 'General', 'All', 110, 'homework', 'application/pdf', '116647', '/uploads/1779177132948_Test.pdf', '/uploads/1779177132948_Test.pdf', '"2026-05-19T02:22:13.832Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (23, 'homework/general/all/homework_General_All_1779189601769.pdf', 'Test.pdf', 'General', 'All', 110, 'homework', 'application/pdf', '116647', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779189601769.pdf', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779189601769.pdf', '"2026-05-19T05:50:13.189Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (25, 'homework/general/all/homework_General_All_1779190593887.pdf', 'Test.pdf', 'General', 'All', 110, 'homework', 'application/pdf', '116647', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779190593887.pdf', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779190593887.pdf', '"2026-05-19T06:06:35.600Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (24, 'homework/general/all/homework_General_All_1779190156613.pdf', 'Test.pdf', 'General', 'All', NULL, 'homework', 'application/pdf', '116647', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779190156613.pdf', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779190156613.pdf', '"2026-05-19T05:59:18.358Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (27, 'profile/general/all/profile_General_All_1779192035478.png', 'Sign_Narzima.png', 'General', 'All', NULL, 'profile', 'image/png', '59527', '/storage/download/profile%2Fgeneral%2Fall%2Fprofile_General_All_1779192035478.png', '/storage/download/profile%2Fgeneral%2Fall%2Fprofile_General_All_1779192035478.png', '"2026-05-19T06:30:37.083Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (26, 'profile_pic/general/all/profile_pic_General_All_1779192035551.png', 'Sign_Narzima.png', 'General', 'All', NULL, 'profile_pic', 'image/png', '59527', '/storage/download/profile_pic%2Fgeneral%2Fall%2Fprofile_pic_General_All_1779192035551.png', '/storage/download/profile_pic%2Fgeneral%2Fall%2Fprofile_pic_General_All_1779192035551.png', '"2026-05-19T06:30:37.082Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (28, 'profile_pic/general/all/profile_pic_General_All_1779192035534.png', 'Sign_Narzima.png', 'General', 'All', NULL, 'profile_pic', 'image/png', '59527', '/storage/download/profile_pic%2Fgeneral%2Fall%2Fprofile_pic_General_All_1779192035534.png', '/storage/download/profile_pic%2Fgeneral%2Fall%2Fprofile_pic_General_All_1779192035534.png', '"2026-05-19T06:30:37.630Z"');
INSERT INTO "app_files" ("id", "drive_file_id", "file_name", "class_level", "section", "uploaded_by", "file_type", "mime_type", "file_size", "web_view_link", "download_link", "created_at") VALUES (29, 'profile/general/all/profile_General_All_1779192716412.png', 'Sign_Narzima.png', 'General', 'All', NULL, 'profile', 'image/png', '59527', '/storage/download/profile%2Fgeneral%2Fall%2Fprofile_General_All_1779192716412.png', '/storage/download/profile%2Fgeneral%2Fall%2Fprofile_General_All_1779192716412.png', '"2026-05-19T06:41:58.071Z"');

INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (73, 62, 12, '10', 'A', '"2026-05-16T18:30:00.000Z"', TRUE, '"2026-05-17T08:10:59.903Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (74, 63, 12, '10', 'A', '"2026-05-16T18:30:00.000Z"', TRUE, '"2026-05-17T08:10:59.970Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (76, 65, 110, '12', 'A', '"2026-05-17T18:30:00.000Z"', TRUE, '"2026-05-18T13:03:18.198Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (78, 62, 104, '10', NULL, '"2026-05-17T18:30:00.000Z"', TRUE, '"2026-05-18T13:04:15.434Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (79, 63, 108, '10', NULL, '"2026-05-17T18:30:00.000Z"', TRUE, '"2026-05-18T13:04:15.434Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (83, 65, 12, '12', 'A', '"2026-05-18T18:30:00.000Z"', TRUE, '"2026-05-19T01:04:54.136Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (88, 69, 12, '10', 'A', '"2026-05-21T18:30:00.000Z"', TRUE, '"2026-05-21T20:53:55.429Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (89, 66, 12, '10', 'A', '"2026-05-21T18:30:00.000Z"', TRUE, '"2026-05-21T20:53:55.508Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (90, 70, 12, '10', 'A', '"2026-05-21T18:30:00.000Z"', TRUE, '"2026-05-21T20:53:55.573Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (91, 63, 12, '10', 'A', '"2026-05-21T18:30:00.000Z"', TRUE, '"2026-05-21T20:53:55.637Z"', 'school-001');
INSERT INTO "attendance" ("id", "student_id", "user_id", "class_level", "section", "date", "is_present", "created_at", "school_id") VALUES (92, 62, 12, '10', 'A', '"2026-05-21T18:30:00.000Z"', FALSE, '"2026-05-21T20:53:55.702Z"', 'school-001');

INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (1, 12, 'UPDATE_CONTENT', 'content_pages', 'contact', '{"message":"Updated \"contact\" page content"}', NULL, '"2026-04-26T10:03:52.414Z"', NULL);
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (2, 12, 'UPDATE_CONTENT', 'content_pages', 'help', '{"message":"Updated \"help\" page content"}', NULL, '"2026-04-26T10:05:02.133Z"', NULL);
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (3, 12, 'UPDATE_CONTENT', 'content_pages', 'contact', '{"message":"Updated \"contact\" page content"}', NULL, '"2026-04-26T10:06:20.014Z"', NULL);
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (4, 12, 'UPDATE_CONTENT', 'content_pages', 'help', '{"message":"Updated \"help\" page content"}', NULL, '"2026-04-26T10:08:19.748Z"', NULL);
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (5, 12, 'UPDATE_CONTENT', 'content_pages', 'documentation', '{"message":"Updated \"documentation\" page content"}', NULL, '"2026-04-26T10:10:16.338Z"', NULL);
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (6, 12, 'CREATE_USER', 'users', '58', '{"message":"Created teacher: Mehbub"}', NULL, '"2026-05-01T07:37:22.757Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (7, 12, 'CREATE_STUDENT', 'students', '29', '{"message":"Enrolled student: Student 6 S"}', NULL, '"2026-05-02T11:45:18.915Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (8, 12, 'UPDATE_USER', 'users', '60', '{"message":"Updated info for John"}', NULL, '"2026-05-03T13:01:22.956Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (9, 12, 'UPDATE_STUDENT_STATUS', 'students', '12', '{"message":"Changed status to inactive"}', NULL, '"2026-05-03T13:21:19.811Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (10, 12, 'UPDATE_STUDENT_STATUS', 'students', '12', '{"message":"Changed status to active"}', NULL, '"2026-05-03T13:21:26.162Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (11, 12, 'UPDATE_STUDENT_STATUS', 'students', '12', '{"message":"Changed status to inactive"}', NULL, '"2026-05-03T13:56:41.596Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (12, 12, 'UPDATE_STUDENT_STATUS', 'students', '12', '{"message":"Changed status to active"}', NULL, '"2026-05-03T13:57:17.541Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (13, 12, 'UPDATE_STUDENT_STATUS', 'students', '12', '{"message":"Changed status to active"}', NULL, '"2026-05-03T13:58:41.760Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (14, 12, 'CREATE_USER', 'users', '65', '{"message":"Created teacher: John D"}', NULL, '"2026-05-03T17:26:32.246Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (15, 12, 'UPDATE_CONTENT', 'content_pages', 'programs', '{"message":"Updated \"programs\" page content"}', NULL, '"2026-05-09T06:03:50.123Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (16, 12, 'UPDATE_CONTENT', 'content_pages', 'programs', '{"message":"Updated \"programs\" page content"}', NULL, '"2026-05-09T06:28:11.012Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (17, 12, 'UPDATE_CONTENT', 'content_pages', 'privacy', '{"message":"Updated \"privacy\" page content"}', NULL, '"2026-05-09T06:32:58.285Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (18, 12, 'CREATE_STUDENT', 'students', '43', '{"message":"Enrolled student: Student9"}', NULL, '"2026-05-09T07:50:09.050Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (19, 12, 'CREATE_USER', 'users', '80', '{"message":"Created teacher: User9"}', NULL, '"2026-05-09T18:22:14.785Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (20, 12, 'UPDATE_STUDENT', 'students', '45', '{"message":"Updated student: Student 11"}', NULL, '"2026-05-11T10:48:59.745Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (21, 12, 'CREATE_STUDENT', 'students', '53', '{"message":"Enrolled student: Mustafa"}', NULL, '"2026-05-12T06:15:50.342Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (22, 12, 'CREATE_USER', 'users', '99', '{"message":"Created teacher: Teacher $"}', NULL, '"2026-05-14T10:01:21.479Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (23, 12, 'CREATE_USER', 'users', '100', '{"message":"Created staff: Staff 9"}', NULL, '"2026-05-14T10:02:09.068Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (24, 12, 'CREATE_STUDENT', 'students', '60', '{"message":"Enrolled student: Hashem Chan"}', NULL, '"2026-05-14T10:03:28.462Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (25, 12, 'UPDATE_USER', 'users', '97', '{"message":"Updated info for Shukur Ali"}', NULL, '"2026-05-14T10:29:55.624Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (26, 12, 'DELETE_USER', 'users', '99', '{"message":"Deleted user ID 99"}', NULL, '"2026-05-14T10:30:12.303Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (27, 12, 'UPDATE_CONTENT', 'content_pages', 'documentation', '{"message":"Updated \"documentation\" page content"}', NULL, '"2026-05-14T10:41:02.054Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (28, 12, 'UPDATE_CONTENT', 'content_pages', 'documentation', '{"message":"Updated \"documentation\" page content"}', NULL, '"2026-05-14T10:41:56.096Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (29, 12, 'DELETE_STUDENT', 'students', '12', '{"userId":25,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:14:28.860Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (30, 12, 'DELETE_STUDENT', 'students', '50', '{"userId":85,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:14:34.602Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (31, 12, 'DELETE_STUDENT', 'students', '60', '{"userId":101,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:14:38.718Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (32, 12, 'DELETE_STUDENT', 'students', '11', '{"userId":22,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:14:44.454Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (33, 12, 'DELETE_STUDENT', 'students', '59', '{"userId":96,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:14:50.896Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (34, 12, 'DELETE_STUDENT', 'students', '53', '{"userId":88,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:14:56.745Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (35, 12, 'DELETE_STUDENT', 'students', '27', '{"userId":45,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:02.074Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (36, 12, 'DELETE_STUDENT', 'students', '18', '{"userId":35,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:13.987Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (37, 12, 'DELETE_STUDENT', 'students', '13', '{"userId":28,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:22.539Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (38, 12, 'DELETE_STUDENT', 'students', '45', '{"userId":77,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:27.476Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (39, 12, 'DELETE_STUDENT', 'students', '29', '{"userId":59,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:35.471Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (40, 12, 'DELETE_STUDENT', 'students', '42', '{"userId":74,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:40.191Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (41, 12, 'DELETE_STUDENT', 'students', '43', '{"userId":75,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-15T08:15:44.969Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (42, 12, 'DELETE_USER', 'users', '100', '{"message":"Deleted user ID 100"}', NULL, '"2026-05-15T08:16:04.886Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (43, 12, 'DELETE_USER', 'users', '98', '{"message":"Deleted user ID 98"}', NULL, '"2026-05-15T08:16:11.995Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (44, 12, 'DELETE_USER', 'users', '97', '{"message":"Deleted user ID 97"}', NULL, '"2026-05-15T08:16:17.088Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (45, 12, 'DELETE_USER', 'users', '95', '{"message":"Deleted user ID 95"}', NULL, '"2026-05-15T08:16:22.034Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (46, 12, 'DELETE_USER', 'users', '90', '{"message":"Deleted user ID 90"}', NULL, '"2026-05-15T08:16:27.393Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (47, 12, 'DELETE_USER', 'users', '80', '{"message":"Deleted user ID 80"}', NULL, '"2026-05-15T08:16:33.131Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (48, 12, 'DELETE_USER', 'users', '79', '{"message":"Deleted user ID 79"}', NULL, '"2026-05-15T08:16:38.137Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (49, 12, 'DELETE_USER', 'users', '78', '{"message":"Deleted user ID 78"}', NULL, '"2026-05-15T08:16:43.438Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (50, 12, 'DELETE_USER', 'users', '65', '{"message":"Deleted user ID 65"}', NULL, '"2026-05-15T08:16:48.440Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (51, 12, 'DELETE_USER', 'users', '60', '{"message":"Deleted user ID 60"}', NULL, '"2026-05-15T08:16:53.141Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (52, 12, 'DELETE_USER', 'users', '58', '{"message":"Deleted user ID 58"}', NULL, '"2026-05-15T08:16:59.958Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (53, 12, 'DELETE_USER', 'users', '38', '{"message":"Deleted user ID 38"}', NULL, '"2026-05-15T08:17:05.997Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (54, 12, 'DELETE_USER', 'users', '32', '{"message":"Deleted user ID 32"}', NULL, '"2026-05-15T08:17:16.312Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (55, 12, 'DELETE_USER', 'users', '29', '{"message":"Deleted user ID 29"}', NULL, '"2026-05-15T08:17:21.404Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (56, 12, 'DELETE_USER', 'users', '26', '{"message":"Deleted user ID 26"}', NULL, '"2026-05-15T08:17:26.842Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (57, 12, 'DELETE_USER', 'users', '24', '{"message":"Deleted user ID 24"}', NULL, '"2026-05-15T08:17:50.443Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (58, 12, 'DELETE_USER', 'users', '103', '{"message":"Deleted user ID 103"}', NULL, '"2026-05-15T08:45:10.354Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (59, 12, 'UPDATE_USER', 'users', '107', '{"message":"Updated info for Bhabajyoti Phukan"}', NULL, '"2026-05-15T08:51:20.101Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (60, 12, 'UPDATE_STUDENT_STATUS', 'students', '64', '{"message":"Changed status to inactive"}', NULL, '"2026-05-17T13:07:47.046Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (61, 12, 'UPDATE_STUDENT_STATUS', 'students', '64', '{"message":"Changed status to active"}', NULL, '"2026-05-18T06:34:10.210Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (62, 12, 'UPDATE_CONTENT', 'content_pages', 'help', '{"message":"Updated \"help\" page content"}', NULL, '"2026-05-19T06:04:41.885Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (63, 12, 'DELETE_STUDENT', 'students', '64', '{"userId":109,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-19T06:29:51.023Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (64, 12, 'DELETE_USER', 'users', '111', '{"message":"Deleted user ID 111"}', NULL, '"2026-05-19T12:45:05.140Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (65, 12, 'CREATE_USER', 'users', '112', '{"message":"Created teacher: Muslim Uddin"}', NULL, '"2026-05-19T12:51:50.490Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (66, 12, 'UPDATE_USER', 'users', '113', '{"message":"Updated info for Hirak Jyoti Bhuyan"}', NULL, '"2026-05-20T09:49:03.490Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (67, 12, 'UPDATE_USER', 'users', '107', '{"message":"Updated info for Bhabajyoti Phukan"}', NULL, '"2026-05-20T09:49:46.957Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (68, 12, 'UPDATE_USER', 'users', '106', '{"message":"Updated info for Tilak Dornal"}', NULL, '"2026-05-20T09:50:06.773Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (69, 12, 'DELETE_USER', 'users', '107', '{"message":"Deleted user ID 107"}', NULL, '"2026-05-20T17:18:08.754Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (70, 12, 'UPDATE_USER', 'users', '114', '{"message":"Updated info for BHABAJYOTI"}', NULL, '"2026-05-20T17:21:56.337Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (71, 12, 'DELETE_STUDENT', 'students', '61', '{"userId":102,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-21T10:39:35.054Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (72, 12, 'DELETE_STUDENT', 'students', '68', '{"userId":117,"message":"Deleted student and shared user account","schoolId":"school-001"}', NULL, '"2026-05-21T10:44:38.336Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (73, 12, 'UPDATE_STUDENT', 'students', '65', '{"message":"Updated student: Muslim Uddin (including password)"}', NULL, '"2026-05-21T15:54:57.983Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (74, 12, 'CREATE_STUDENT', 'students', '77', '{"message":"Enrolled student: Student01"}', NULL, '"2026-05-22T05:58:10.914Z"', 'school-001');
INSERT INTO "audit_logs" ("id", "user_id", "action", "entity", "entity_id", "details", "ip_address", "created_at", "school_id") VALUES (75, 12, 'UPDATE_STUDENT', 'students', '77', '{"message":"Updated student: Student01 (including password)"}', NULL, '"2026-05-22T05:59:56.850Z"', 'school-001');

INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (5, 'contact', '# Contact Us

We’re here to help. If you have any questions, feedback, or need support regarding our platform, feel free to reach out.

## General Support
📧 Email: a2ztuitioncentre@gmail.com

## Business & Partnerships
📧 Email: a2ztuitioncentre@gmail.com

## Technical Issues
If you experience any bugs, login issues, or technical problems, please include:
- Your registered email
- Device/browser details
- Screenshots (if possible)
- A short description of the issue

## Response Time
We usually respond within **24–48 hours** on working days.

## Office Hours
Monday – Saturday  
10:00 AM – 6:00 PM (IST)

---

Thank you for using our platform.', '"2026-04-26T04:36:19.696Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (7, 'learn-more', '<h3>About A2Z Tuition</h3><p>A2Z Tuition is dedicated to providing high-quality education through modern technology and expert faculty. Our mission is to empower students with knowledge and skills for a bright future.</p>', '"2026-04-23T01:52:10.387Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (8, 'terms', '<h3>Terms of Service</h3><p>By using our platform, you agree to comply with our academic guidelines and code of conduct.</p>', '"2026-04-23T01:52:10.609Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (4, 'resources', '<h3>Learning Resources</h3><p><em>Access curated materials to boost your learning.</em></p><ul><li><b>Digital Library:</b> eBooks and reference papers.</li><li><b>Video Lectures:</b> Recorded sessions for revision.</li><li><b>Practice Tests:</b> Weekly assessments and mock exams.</li></ul>', '"2026-04-30T12:16:05.462Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (6, 'privacy', '# Privacy Policy




Last Updated: April 25, 2026




Welcome to our A2Z Tuition App. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.




## Information We Collect

We may collect:

- Name, phone number, email address

- Student and class information

- Attendance, homework, and academic records

- Uploaded files, assignments, and documents

- Basic device and usage information




## How We Use Your Information

We use your information to:

- Provide and manage tuition services

- Track attendance, homework, and student progress

- Enable communication between students, teachers, and parents

- Improve app performance and user experience




## Data Storage &amp; Security

We take reasonable steps to protect your data from unauthorized access, loss, or misuse. However, no online platform can guarantee complete security.




## Sharing of Information

We do not sell your personal information. Data may only be shared:

- With authorized teachers, students, or parents

- When required by law

- With trusted service providers for app functionality




## User Responsibilities

Users are responsible for maintaining the confidentiality of their login credentials and uploaded content.




## Third-Party Services

Our app may use third-party services such as cloud storage, analytics, or authentication providers. Their policies may also apply.




## Children''s Privacy

This app is intended for educational purposes. Parents or guardians may manage student information where required.




## Changes to This Policy

We may update this Privacy Policy from time to time. Continued use of the app means you accept the updated policy.




## Contact Us

If you have any questions regarding this Privacy Policy, please contact us through the app support section.

', '"2026-05-09T01:02:58.213Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (1, 'help', 'Welcome to the Help &amp; Support section. We are committed to providing you with a smooth and reliable experience on our platform.

## Frequently Asked Questions

### 1. How do I reset my password?
Go to the login page and click on **“Forgot Password”** to receive a password reset link.

### 2. How can I update my profile information?
Navigate to your profile settings from the dashboard and edit your details.

### 3. Homework or data not loading?
Try:
- Refreshing the page
- Checking your internet connection
- Logging out and logging back in

If the issue continues, contact support.

### 4. How do I contact support?
You can reach us anytime at:

📧 a2ztuitioncentre@gmail.com

## Technical Support
When reporting an issue, please include:
- Your registered email
- Device/browser information
- Screenshots or error messages
- Steps to reproduce the issue

## Support Availability
Monday – Saturday  
10:00 AM – 6:00 PM (IST)

Average response time: **24–48 hours**

We appreciate your patience and thank you for using our platform.', '"2026-05-19T00:34:41.784Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (3, 'programs', '<p><strong>Programs at A2Z Tuition Centre</strong></p><p><br></p><p><strong>At A2Z Tuition Centre</strong>, we believe that education is not limited to textbooks only. Along with academic excellence, we encourage students to develop creativity, confidence, practical knowledge, and innovative thinking.</p><p><br></p><p><strong>Our Programs:</strong></p><p> Academic Classes (Class 7–10)</p><p>We provide quality coaching for students from Class 7 to Class 10 with proper guidance, regular tests, doubt-clearing sessions, and concept-based learning.</p><p><br></p><p><strong>Subjects Available:</strong></p><ol><li>Mathematics</li><li>Science</li><li>English</li><li>Grammar</li><li>Social Science</li><li>Assamese</li></ol><p><br></p><p> <strong>Science Projects &amp; Innovation</strong></p><p><strong><em>Students are encouraged to create:</em></strong></p><ul><li>Science models</li><li>Innovative ideas</li><li>Working projects</li><li>Educational experiments</li></ul><p><br></p><p><em>These activities help students improve:</em></p><ul><li>Scientific thinking</li><li>Creativity</li><li>Problem-solving skills</li><li>Presentation skills</li></ul><p><br></p><p><strong>Wall Magazine Activities</strong></p><p><br></p><p><em>We motivate students to participate in:</em></p><ul><li>Wall magazine preparation</li><li>Educational article writing</li><li>Drawing &amp; creative design</li><li>Current affairs and knowledge sharing</li></ul><p><br></p><p><em>This develops:</em></p><ul><li>Creativity</li><li>Teamwork</li><li>Writing skills</li><li>Leadership qualities</li><li>Personality Development</li></ul><p><br></p><p><strong>Special activities are conducted for:</strong></p><ul><li>Public speaking</li><li>Confidence building</li><li>Communication skills</li><li>Discipline and motivation</li><li>Competitions &amp; Awards</li></ul><p><br></p><p><em>Students regularly participate in:</em></p><ul><li>Quiz competitions</li><li>Science exhibitions</li><li>Essay writing</li><li>Creative activities</li></ul><p><br></p><blockquote>Outstanding students are appreciated with certificates and rewards.</blockquote><p><br></p><h2><strong>Our Mission</strong></h2><blockquote><em>Our mission is to create responsible, confident, knowledgeable, and creative students who can succeed in academics and real life.</em></blockquote><p><br></p><h1><strong>A2Z Tuition Centre</strong></h1><ul><li><strong> Learn • Create • Innovate </strong></li></ul><p><strong>• Succeed</strong></p>', '"2026-05-09T00:58:10.935Z"');
INSERT INTO "content_pages" ("id", "key", "content", "updated_at") VALUES (2, 'documentation', '# A2Z Tuition App - User Guide

Welcome to the A2Z Tuition ERP! This guide will help **Teachers** and **Students** navigate and use the application efficiently.

---

## l For Teachers

Your dashboard is your central hub for managing your classes, students, and academic responsibilities.

### 1. Timetable &amp; Schedule
- **View Schedule:** Your daily and weekly classes are displayed on the main dashboard.
- **Next Class:** Check the "Ongoing/Upcoming" section for quick access to your immediate schedule.

### 2. Homework &amp; Assignments
- **Create Assignments:** Navigate to the **Homework** tab to assign new homework or Daily Practice Problems (DPP). You can specify the class, section, due date, and attach reference files.
- **Review Submissions:** Go to the submissions section to view student uploads. You can grade them, provide feedback remarks, and mark them as reviewed.

### 3. Attendance
- **Mark Attendance:** Use the **Attendance** module to take daily attendance for your assigned classes.
- **View History:** Check past attendance records and overall monthly statistics for your students.

### 4. Study Materials
- **Upload Resources:** Share notes, presentations, and reference documents via the **Materials** tab. These will be instantly available to students in the selected class and section.

### 5. Exam Results
- **Upload Grades:** Enter and publish exam scores for your classes through the **Results** module.

---

## 👨‍🎓 For Students

Your dashboard provides everything you need to stay on top of your studies.

### 1. Timetable &amp; Classes
- **Daily Schedule:** Your timetable is visible right on the dashboard. It highlights your **Ongoing** and **Upcoming** classes so you always know where to be.

### 2. Homework &amp; Submissions
- **View Tasks:** Check the **Homework/DPP** section for pending assignments.
- **Submit Work:** Click on a pending assignment to upload your answers (PDF or Image formats accepted).
- **View Grades:** Once your teacher reviews your submission, you can see your score and teacher remarks in the completed submissions list.

### 3. Study Materials
- **Download Notes:** Access all study materials, notes, and resources uploaded by your teachers in the **Materials** tab.

### 4. Attendance &amp; Fees
- **Track Attendance:** Monitor your attendance percentage to ensure you are meeting the requirements.
- **Fee Status:** Check the **Fees** section to see any pending dues or payment history.

### 5. Notifications &amp; Support
- **Announcements:** Keep an eye on the **Notifications** panel for important updates from the school administration.
- **Help &amp; Contact:** Use the **Help &amp; Support** or **Contact Us** tabs if you need technical assistance or want to reach out to the admin.

---

### ⚙️ General Tips
- **Profile Management:** Both teachers and students can update their personal information and profile pictures via the **Edit Profile** button.
- **Responsive Design:** The app works seamlessly on both desktop and mobile devices. Use the mobile menu to navigate between modules when on your phone.
', '"2026-05-14T05:11:56.029Z"');

INSERT INTO "exam_results" ("id", "student_id", "student_name", "roll_number", "class_level", "section", "exam_title", "subjects", "total_marks", "obtained_marks", "percentage", "teacher_id", "created_at", "remarks", "school_id") VALUES (5, 65, 'Muslim Uddin', '12A002', '12', 'A', 'class test', '[{"name":"Assamese","grade":"B+","total":100,"obtained":76}]', '100.00', '76.00', '76.00', NULL, '"2026-05-19T00:36:42.686Z"', 'Pass', 'school-001');

INSERT INTO "homework" ("id", "teacher_id", "class_level", "section", "title", "description", "due_date", "subject_id", "subject", "attachment_url", "school_id", "type", "created_at") VALUES (21, NULL, '12', 'A', 'Test', 'Test by dev', '"2026-05-17T18:30:00.000Z"', NULL, 'Assamese', '/uploads/homework/homework-1779177055783-782760506.pdf', 'school-001', 'homework', '"2026-05-19T02:20:58.821Z"');
INSERT INTO "homework" ("id", "teacher_id", "class_level", "section", "title", "description", "due_date", "subject_id", "subject", "attachment_url", "school_id", "type", "created_at") VALUES (22, NULL, '12', 'A', 'test', 'asdfghj', '"2026-05-17T18:30:00.000Z"', NULL, 'Assamese', '/storage/download/homework%2Fgeneral%2Fall%2Fhomework_General_All_1779190156613.pdf', 'school-001', 'homework', '"2026-05-19T05:59:20.471Z"');

INSERT INTO "materials" ("id", "title", "description", "class_level", "section", "subject", "file_url", "uploaded_by", "uploaded_by_id", "school_id", "created_at", "updated_at", "subject_id") VALUES (5, 'study material', 'This is targetted to class 10 A', '10', 'A', NULL, '/uploads/materials/material-1776609125808-695992587.pdf', '7086795477', 12, 'school-001', '"2026-04-19T09:02:01.608Z"', '"2026-04-19T09:02:01.608Z"', NULL);
INSERT INTO "materials" ("id", "title", "description", "class_level", "section", "subject", "file_url", "uploaded_by", "uploaded_by_id", "school_id", "created_at", "updated_at", "subject_id") VALUES (6, 'Study material 2', 'This is targetted to class 10 B', '10', 'B', NULL, '/uploads/materials/material-1776609156555-882277558.pdf', '7086795477', 12, 'school-001', '"2026-04-19T09:02:33.251Z"', '"2026-04-19T09:02:33.251Z"', NULL);

INSERT INTO "organizations" ("id", "name", "logo_url", "contact_email", "address", "settings", "created_at") VALUES (1, 'ABC School', NULL, NULL, NULL, '{}', '"2026-04-23T05:17:19.973Z"');

INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (63, 108, 'Pol Borah', '10', 'A', 'Khageswar Borah', 'Sebika Borah', '8822518964', 'ab1903760@gmail.com', '10A004', '"2026-05-14T18:30:00.000Z"', '"2011-04-25T18:30:00.000Z"', 'active', 'school-001', '"2026-05-15T06:00:04.378Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (67, 116, 'Swapna Dutta', '8', 'A', 'Rupak Dutta', 'Munmi Dutta', '8473053082', NULL, '8A001', '"2026-05-20T18:30:00.000Z"', '"2013-12-11T18:30:00.000Z"', 'active', 'school-001', '"2026-05-20T20:01:41.608Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (66, 115, 'Khushi Lama', '10', 'A', 'Anil lama', 'Karishma lama', '9366103135', NULL, '10A005', '"2026-05-19T18:30:00.000Z"', '"2009-10-24T18:30:00.000Z"', 'active', 'school-001', '"2026-05-20T17:39:07.595Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (65, 110, 'Muslim Uddin', '12', 'A', 'N chan', 'M Khatun', '7086795477', 'uddinemuslim@gmail.com', '12A002', '"2026-05-17T18:30:00.000Z"', '"2002-09-30T18:30:00.000Z"', 'active', 'school-001', '"2026-05-18T09:22:13.123Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (74, 123, 'test student0', '12', 'B', 'father.1', 'mother', '8878976547', 'student9@gmai.com', '12B001', '"2026-05-20T18:30:00.000Z"', '"2026-05-18T18:30:00.000Z"', 'active', 'school-001', '"2026-05-21T10:55:43.190Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (73, 122, 'John Doe', '9', 'A', 'Father Doe', 'Mother Doe', '9876546038', 'john.doe.7453@example.com', '9A001', '"2026-05-20T18:30:00.000Z"', '"2010-05-14T18:30:00.000Z"', 'active', 'school-001', '"2026-05-21T10:43:01.677Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (72, 121, 'Swpna Dutta', '8', 'A', 'Rupak Dutta', 'Munmi Dutta', '9864253806', NULL, '8A002', '"2026-05-20T18:30:00.000Z"', '"2013-12-11T18:30:00.000Z"', 'active', 'school-001', '"2026-05-21T09:55:39.894Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (71, 120, 'Puja Boruah', '9', NULL, 'Dilip Boruah', 'Mina boruah', '8761062225', NULL, '9001', '"2026-05-20T18:30:00.000Z"', '"2026-04-18T18:30:00.000Z"', 'active', 'school-001', '"2026-05-21T08:34:44.438Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (70, 119, 'Muskan Lama', '10', 'A', 'Muskan Lama', 'Muskan Lama', '6002309100', NULL, '10A007', '"2026-05-20T18:30:00.000Z"', '"2010-05-14T18:30:00.000Z"', 'active', 'school-001', '"2026-05-21T07:56:43.417Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (69, 118, 'Anjan Ghimire', '10', 'A', 'Shyam Ghimire', 'Gita Devi', '9365521362', NULL, '10A006', '"2026-05-20T18:30:00.000Z"', '"2010-10-03T18:30:00.000Z"', 'active', 'school-001', '"2026-05-21T06:48:21.261Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (75, 124, 'Dipali Lama', '10', 'A', 'Dilip Lama', 'Bunomai Lama', '6002609100', NULL, '10A008', '"2026-05-21T18:30:00.000Z"', '"2015-04-14T18:30:00.000Z"', 'pending', 'school-001', '"2026-05-21T20:59:01.652Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (76, 125, 'Dipali Lama', '10', 'A', 'Dilip Lama', 'Bunomai Lama', '6002309100', NULL, '10A009', '"2026-05-21T18:30:00.000Z"', '"2015-09-14T18:30:00.000Z"', 'pending', 'school-001', '"2026-05-21T21:04:48.782Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (77, 126, 'Student01', '12', 'B', 'Father', 'Mother', '7086795844', 'student01@gmail.com', '12B002', '"2026-05-21T18:30:00.000Z"', '"1999-12-31T18:30:00.000Z"', 'active', 'school-001', '"2026-05-22T00:28:10.914Z"');
INSERT INTO "students" ("id", "user_id", "name", "class_level", "section", "father_name", "mother_name", "phone", "email", "roll_number", "joining_date", "date_of_birth", "status", "school_id", "created_at") VALUES (62, 104, 'Shilpa Devi', '10', 'A', 'Aaa aa', 'Tukheswari Medhi', '6002396724', NULL, '10A003', '"2026-05-14T18:30:00.000Z"', '"2011-05-14T18:30:00.000Z"', 'active', 'school-001', '"2026-05-15T02:35:18.161Z"');

INSERT INTO "study_materials" ("id", "title", "description", "file_url", "class_id", "section_id", "uploaded_by", "uploader_role", "created_at", "updated_at", "subject_id") VALUES (5, 'study material', 'This is targetted to class 10 A', '/uploads/materials/material-1776609125808-695992587.pdf', 1, 1, 12, 'admin', '"2026-04-19T09:02:01.608Z"', '"2026-04-19T09:02:01.608Z"', NULL);
INSERT INTO "study_materials" ("id", "title", "description", "file_url", "class_id", "section_id", "uploaded_by", "uploader_role", "created_at", "updated_at", "subject_id") VALUES (7, 'Material 3 by Teacher', 'This is a tes material', '/storage/download/1778755538155_IMG_20260514_095557.jpg', 73, 144, 29, 'teacher', '"2026-05-14T05:15:40.947Z"', '"2026-05-14T05:15:40.947Z"', NULL);

INSERT INTO "subject_assignments" ("id", "subject_id", "class_level", "section", "teacher_id", "assigned_by", "created_at") VALUES ('27dbe7b7-1dd4-4fba-b708-592c5a70225f', '72f8a4a2-83a8-447c-af96-5ab88dd7acc4', '10', NULL, NULL, 12, '"2026-04-21T12:58:35.287Z"');
INSERT INTO "subject_assignments" ("id", "subject_id", "class_level", "section", "teacher_id", "assigned_by", "created_at") VALUES ('3a07b156-64c1-4b75-8c85-f67b1aa42f15', 'df1280c4-600f-4f3d-9eff-ecb203c73dca', '12', 'ALL', 112, 12, '"2026-05-19T07:25:12.582Z"');
INSERT INTO "subject_assignments" ("id", "subject_id", "class_level", "section", "teacher_id", "assigned_by", "created_at") VALUES ('5457c02a-2475-4df8-8580-2531274c40fb', '33f614eb-5f9b-45e8-9dd1-0c6c32bc30de', '12', 'A', 112, 12, '"2026-05-19T07:33:18.992Z"');

INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('72f8a4a2-83a8-447c-af96-5ab88dd7acc4', 'Mathematics', 'MAT', '"2026-04-21T12:26:21.745Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('77e49627-3bd3-4565-b9c4-c016477cb410', 'Assamese', 'ASS', '"2026-04-21T12:26:59.121Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('df1280c4-600f-4f3d-9eff-ecb203c73dca', 'English', 'ENG', '"2026-04-21T12:26:36.983Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('06009b64-791e-4253-b137-ade56a30bcab', 'English Grammar', 'EGR', '"2026-05-09T02:10:26.148Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('d5a7605d-ff61-4fb1-9a65-f7eb06d8c03c', 'Science', 'SCI', '"2026-05-09T02:10:26.148Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('33219937-4038-42ec-93ec-4170b5ac1ae3', 'Social Science', 'SSC', '"2026-05-09T02:10:26.148Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('fae6d4bd-58d7-4423-9135-f35e841b3b15', 'Hindi', 'HIN', '"2026-05-09T02:10:26.148Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('8f3508f5-b67d-4022-9517-b01875863eab', 'Computer', 'COM', '"2026-05-09T02:10:26.148Z"');
INSERT INTO "subjects" ("id", "name", "code", "created_at") VALUES ('33f614eb-5f9b-45e8-9dd1-0c6c32bc30de', 'English', 'ENG001', '"2026-05-09T13:25:09.594Z"');

INSERT INTO "submissions" ("id", "homework_id", "student_id", "file_url", "status", "remark_text", "marks", "reviewed_by", "reviewed_at", "submitted_at") VALUES (5, 22, 65, 'undefined', 'submitted', NULL, NULL, NULL, NULL, '"2026-05-19T06:06:45.811Z"');
INSERT INTO "submissions" ("id", "homework_id", "student_id", "file_url", "status", "remark_text", "marks", "reviewed_by", "reviewed_at", "submitted_at") VALUES (3, 21, 65, 'undefined', 'reviewed', NULL, 'feger', NULL, '"2026-05-19T06:08:03.180Z"', '"2026-05-19T02:22:20.960Z"');

INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (47, 105, '7', 'ALL', 'school-001', '"2026-05-15T03:17:37.419Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (48, 105, '8', 'ALL', 'school-001', '"2026-05-15T03:17:37.419Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (49, 105, '9', 'ALL', 'school-001', '"2026-05-15T03:17:37.419Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (50, 105, '10', 'ALL', 'school-001', '"2026-05-15T03:17:37.419Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (59, 113, '7', 'ALL', 'school-001', '"2026-05-20T04:19:03.029Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (60, 113, '8', 'ALL', 'school-001', '"2026-05-20T04:19:03.029Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (61, 113, '9', 'ALL', 'school-001', '"2026-05-20T04:19:03.029Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (62, 113, '10', 'ALL', 'school-001', '"2026-05-20T04:19:03.029Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (67, 106, '7', 'ALL', 'school-001', '"2026-05-20T04:20:06.450Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (68, 106, '8', 'ALL', 'school-001', '"2026-05-20T04:20:06.450Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (69, 114, '7', 'ALL', 'school-001', '"2026-05-20T11:51:55.876Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (70, 114, '8', 'ALL', 'school-001', '"2026-05-20T11:51:55.876Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (71, 114, '9', 'ALL', 'school-001', '"2026-05-20T11:51:55.876Z"');
INSERT INTO "teacher_class_assignment" ("id", "teacher_id", "class_level", "section", "school_id", "created_at") VALUES (72, 114, '10', 'ALL', 'school-001', '"2026-05-20T11:51:55.876Z"');

INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (123, 'test student0', '8878976547', 'student9@gmai.com', '$2a$12$J5IOwZyl3fs/199wWdJxOe/r9PYJIdxPFfOEGjhg34r3qURHbmBpG', 'student', TRUE, 'school-001', '"2026-05-21T10:55:43.190Z"', 'active', NULL, 12, NULL, 'student0', '"2026-05-21T10:56:30.130Z"', NULL, NULL, '"2026-05-21T10:56:49.402Z"', NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (105, 'Anita Subba', '6000636516', 'subba3004@gmail.com', '$2a$12$9Ge093gkBVn.MBrK2XRiOe3ClKqyOEphxyMtrB03CnecTccMjjHVC', 'teacher', TRUE, 'school-001', '"2026-05-15T03:16:20.276Z"', 'active', 'T98620', 12, NULL, 'Anitasubba', '"2026-05-15T03:17:37.419Z"', NULL, NULL, '"2026-05-20T10:43:23.531Z"', NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (108, 'Pol Borah', '8822518964', 'ab1903760@gmail.com', '$2a$12$tm5rsIr5WTfYRcxd5hFb/uAMWRwNjLSA.nLUyBBcORhHzyxZDnE06', 'student', TRUE, 'school-001', '"2026-05-15T06:00:04.378Z"', 'active', NULL, 12, NULL, 'polborah', '"2026-05-15T06:00:26.272Z"', NULL, NULL, '"2026-05-20T11:13:17.249Z"', NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (112, 'Muslim Uddin', '7086795477', 'uddinemuslim@gmail.com', '$2a$12$kj/gJDottgHm6KbqzKDAGuhKEPCJt5ZgB8Ar4abMs/bryT.P16Qfy', 'teacher', TRUE, 'school-001', '"2026-05-19T07:21:50.490Z"', 'active', 'T57018', 12, NULL, 'muslim', '"2026-05-19T07:22:07.500Z"', NULL, NULL, '"2026-05-20T11:21:52.025Z"', NULL, 'generated');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (126, 'Student01', '7086795844', 'student01@gmail.com', '$2a$12$rSxL3Z311FMsnEeAys.6VOAQOAEkrlOD9JDXENGU9b5PDvNE4FBk.', 'student', TRUE, 'school-001', '"2026-05-22T00:28:10.914Z"', 'active', NULL, 12, NULL, 'utudent01', '"2026-05-22T00:28:21.796Z"', NULL, NULL, NULL, NULL, 'generated');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (114, 'BHABAJYOTI', '6001812116', 'Phukan', '$2a$12$OXf88gsZvEgFUImCDD6YleElqg62WC.geqSiIcCH3vXbkeRiO1kVW', 'teacher', TRUE, 'school-001', '"2026-05-20T11:50:06.116Z"', 'active', 'T55298', 12, NULL, 'bhaba', '"2026-05-20T11:50:43.359Z"', NULL, NULL, '"2026-05-20T12:06:47.823Z"', NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (116, 'Swapna Dutta', '8473053082', NULL, '$2a$12$wKJDQeOEF7/uQ3euCXBW3uiUZWUMbFIMsVuQ0mop1bHR7TzekD8MW', 'student', TRUE, 'school-001', '"2026-05-20T20:01:41.608Z"', 'active', NULL, 12, NULL, 'SWPNa', '"2026-05-20T22:51:31.956Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (115, 'Khushi Lama', '9366103135', NULL, '$2a$12$03VK7lq3lgsusimxzZ2zxOSPdHogaiWhXDBv9WKDBYT5qfGTDHc/W', 'student', TRUE, 'school-001', '"2026-05-20T17:39:07.595Z"', 'active', NULL, 12, NULL, 'khusi', '"2026-05-20T22:51:36.794Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (110, 'Muslim Uddin', '7086795477', 'uddinemuslim@gmail.com', '$2a$12$83xlKBVd1hZZCOra1s6WNe4zMuYOmTAmM.qiKSEY2dhc/IhGvyV2i', 'student', TRUE, 'school-001', '"2026-05-18T09:22:13.123Z"', 'active', NULL, 12, NULL, 'student', '"2026-05-18T09:22:35.932Z"', NULL, NULL, '"2026-05-21T10:25:28.049Z"', NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (122, 'John Doe', '9876546038', 'john.doe.7453@example.com', '$2a$12$lF/G7S1penqEe.93APs3rObY7vb7xwxQnF0jomvuKCgmSC91ErK/2', 'student', TRUE, 'school-001', '"2026-05-21T10:43:01.677Z"', 'active', NULL, 12, NULL, 'teststudent_7232', '"2026-05-21T20:49:57.740Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (106, 'Tilak Dornal', '6000732958', 'dornaltilak@gmail.com', '$2a$12$qw9w9dwcAA0xeO2bZck76eJpEuqTkLG2Tg6/kZkipwnjuu163GUNC', 'teacher', TRUE, 'school-001', '"2026-05-15T03:18:10.131Z"', 'active', 'T21794', 12, NULL, 'Tilakdornal', '"2026-05-15T03:19:00.149Z"', NULL, NULL, '"2026-05-20T20:25:31.569Z"', NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (121, 'Swpna Dutta', '9864253806', NULL, '$2a$12$EUoYIlAbdhGNk2/.g0lGVeNdh/hQRc/VdakjHq2zoGsm4gfwPQqja', 'student', TRUE, 'school-001', '"2026-05-21T09:55:39.894Z"', 'active', NULL, 12, NULL, 'Swapna', '"2026-05-21T20:50:02.341Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (120, 'Puja Boruah', '8761062225', NULL, '$2a$12$6ZOamd7wR5UUBbOUunMWKe1Nn9YL4G.U4myLmHN0DZthnQz/Qopv2', 'student', TRUE, 'school-001', '"2026-05-21T08:34:44.438Z"', 'active', NULL, 12, NULL, 'jharna', '"2026-05-21T20:50:06.861Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (119, 'Muskan Lama', '6002309100', NULL, '$2a$12$aL5K6Z.x09RyBUqvq9kOu.w/kspmtehI5HdrLYuyYEdRzPrARQGx6', 'student', TRUE, 'school-001', '"2026-05-21T07:56:43.417Z"', 'active', NULL, 12, NULL, 'dipali', '"2026-05-21T20:50:11.186Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (118, 'Anjan Ghimire', '9365521362', NULL, '$2a$12$q5s.rXJGfrglJO7P4unTjOQSgOV.mF3/Q6W8THNpxbF7glIizhyzG', 'student', TRUE, 'school-001', '"2026-05-21T06:48:21.261Z"', 'active', NULL, 12, NULL, 'Anjan', '"2026-05-21T20:50:14.952Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (124, 'Dipali Lama', '6002609100', NULL, '$2a$12$SS0kwhzhrY5AnGtKIEgSHeR.QPNWjfHXBOs1/Eh3TYUXdQMSIfaGW', 'student', TRUE, 'school-001', '"2026-05-21T20:59:01.652Z"', 'pending', NULL, NULL, NULL, ' 6002309100 ', NULL, NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (12, 'Muslim Uddin', '7086795477', 'admin@a2z.local', '$2a$10$nFze0p8vl8i7na0wNamZPem9EqTtfG0qg1G52V.Mmbpeza.LdYjei', 'admin', TRUE, 'school-001', '"2026-04-12T00:44:11.963Z"', 'active', NULL, NULL, NULL, 'admin', NULL, '', NULL, '"2026-05-22T00:26:06.951Z"', 'Super Admin', 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (125, 'Dipali Lama', '6002309100', NULL, '$2a$12$GkGteGLkBRx0MIgbW0IXOOx98ijZpD6o5iXWsKBL.Vjwj78HYbufq', 'student', TRUE, 'school-001', '"2026-05-21T21:04:48.782Z"', 'pending', NULL, NULL, NULL, '6002309100', NULL, NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (113, 'Hirak Jyoti Bhuyan', '6901436680', 'hirakbhuyan6000@gmail.com', '$2a$12$pe6.2zWIaB53rBw9guU7WuVCYOOWAJ.2Lp35S1Xe/y3w6Ur6Gk4ie', 'teacher', TRUE, 'school-001', '"2026-05-20T02:04:33.427Z"', 'active', 'T47396', 12, NULL, 'Hiraka2z', '"2026-05-20T04:17:56.994Z"', NULL, NULL, NULL, NULL, 'verified');
INSERT INTO "users" ("id", "name", "phone", "email", "password", "role", "is_active", "school_id", "created_at", "status", "teacher_id", "approved_by", "rejection_reason", "username", "status_updated_at", "avatar_url", "avatar_drive_id", "last_login_at", "designation", "password_status") VALUES (104, 'Shilpa Devi', '6002396724', NULL, '$2a$12$F.kNB/kfi0VBsHXQkal9m.KfqHxBwBmO0huq05HOW.FQwhpSARH/G', 'student', TRUE, 'school-001', '"2026-05-15T02:35:18.161Z"', 'active', NULL, 12, NULL, 'Shilpa', '"2026-05-15T02:35:34.980Z"', NULL, NULL, '"2026-05-15T02:36:56.289Z"', NULL, 'verified');

