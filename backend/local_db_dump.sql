--
-- PostgreSQL database dump
--

\restrict Xbt9OK5kWokmVIWHyWi62fErBfa35qqGQhQfoFZ9GLcs3MWTzJCmfeN9tCYy4an

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_auth_user;
ALTER TABLE ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk;
ALTER TABLE ONLY public.timetable DROP CONSTRAINT "timetable_teacherId_fkey";
ALTER TABLE ONLY public.syllabus DROP CONSTRAINT "syllabus_teacherId_fkey";
ALTER TABLE ONLY public.students DROP CONSTRAINT "students_userId_fkey";
ALTER TABLE ONLY public.notifications DROP CONSTRAINT "notifications_createdBy_fkey";
ALTER TABLE ONLY public.homework DROP CONSTRAINT "homework_teacherId_fkey";
ALTER TABLE ONLY public.fees DROP CONSTRAINT "fees_userId_fkey";
ALTER TABLE ONLY public.fees DROP CONSTRAINT "fees_studentId_fkey";
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_auth_user_id;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id;
ALTER TABLE ONLY public.auth_permission DROP CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
ALTER TABLE ONLY public.attendance DROP CONSTRAINT "attendance_userId_fkey";
ALTER TABLE ONLY public.attendance DROP CONSTRAINT "attendance_studentId_fkey";
DROP INDEX public.token_blacklist_outstandingtoken_user_id_83bc629a;
DROP INDEX public.token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like;
DROP INDEX public.idx_users_schoolid;
DROP INDEX public.idx_users_role;
DROP INDEX public.idx_users_phone;
DROP INDEX public.idx_students_userid;
DROP INDEX public.idx_students_user_id;
DROP INDEX public.idx_students_schoolid;
DROP INDEX public.idx_students_rollnumber;
DROP INDEX public.idx_homework_teacherid;
DROP INDEX public.idx_homework_schoolid;
DROP INDEX public.idx_homework_duedate;
DROP INDEX public.idx_homework_classlevel;
DROP INDEX public.idx_fees_userid;
DROP INDEX public.idx_fees_studentid;
DROP INDEX public.idx_fees_schoolid;
DROP INDEX public.idx_fees_ispaid;
DROP INDEX public.idx_fees_duedate;
DROP INDEX public.idx_attendance_userid;
DROP INDEX public.idx_attendance_studentid;
DROP INDEX public.idx_attendance_schoolid;
DROP INDEX public.idx_attendance_date;
DROP INDEX public.auth_user_username_6821ab7c_like;
DROP INDEX public.auth_user_user_permissions_user_id_a95ead1b;
DROP INDEX public.auth_user_user_permissions_permission_id_1fbb5f2c;
DROP INDEX public.auth_user_groups_user_id_6a12ed8b;
DROP INDEX public.auth_user_groups_group_id_97559544;
DROP INDEX public.auth_permission_content_type_id_2f476e4b;
DROP INDEX public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX public.auth_group_name_a6ea08ec_like;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_phone_key;
ALTER TABLE ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT token_blacklist_outstandingtoken_pkey;
ALTER TABLE ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq;
ALTER TABLE ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT token_blacklist_blacklistedtoken_token_id_key;
ALTER TABLE ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT token_blacklist_blacklistedtoken_pkey;
ALTER TABLE ONLY public.timetable DROP CONSTRAINT timetable_pkey;
ALTER TABLE ONLY public.syllabus DROP CONSTRAINT syllabus_pkey;
ALTER TABLE ONLY public.students DROP CONSTRAINT "students_userId_key";
ALTER TABLE ONLY public.students DROP CONSTRAINT students_pkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_pkey;
ALTER TABLE ONLY public.materials DROP CONSTRAINT materials_pkey;
ALTER TABLE ONLY public.homework DROP CONSTRAINT homework_pkey;
ALTER TABLE ONLY public.fees DROP CONSTRAINT fees_pkey;
ALTER TABLE ONLY public.django_migrations DROP CONSTRAINT django_migrations_pkey;
ALTER TABLE ONLY public.django_content_type DROP CONSTRAINT django_content_type_pkey;
ALTER TABLE ONLY public.django_content_type DROP CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE ONLY public.auth_user DROP CONSTRAINT auth_user_username_key;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq;
ALTER TABLE ONLY public.auth_user_user_permissions DROP CONSTRAINT auth_user_user_permissions_pkey;
ALTER TABLE ONLY public.auth_user DROP CONSTRAINT auth_user_pkey;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq;
ALTER TABLE ONLY public.auth_user_groups DROP CONSTRAINT auth_user_groups_pkey;
ALTER TABLE ONLY public.auth_permission DROP CONSTRAINT auth_permission_pkey;
ALTER TABLE ONLY public.auth_permission DROP CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE ONLY public.auth_group DROP CONSTRAINT auth_group_pkey;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissions_pkey;
ALTER TABLE ONLY public.auth_group_permissions DROP CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE ONLY public.auth_group DROP CONSTRAINT auth_group_name_key;
ALTER TABLE ONLY public.attendance DROP CONSTRAINT attendance_studentid_attendancedate_key;
ALTER TABLE ONLY public.attendance DROP CONSTRAINT attendance_pkey;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.timetable ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.syllabus ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.students ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.materials ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.homework ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fees ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.attendance ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.users_id_seq;
DROP TABLE public.users;
DROP TABLE public.token_blacklist_outstandingtoken;
DROP TABLE public.token_blacklist_blacklistedtoken;
DROP SEQUENCE public.timetable_id_seq;
DROP TABLE public.timetable;
DROP SEQUENCE public.syllabus_id_seq;
DROP TABLE public.syllabus;
DROP SEQUENCE public.students_id_seq;
DROP TABLE public.students;
DROP SEQUENCE public.notifications_id_seq;
DROP TABLE public.notifications;
DROP SEQUENCE public.materials_id_seq;
DROP TABLE public.materials;
DROP SEQUENCE public.homework_id_seq;
DROP TABLE public.homework;
DROP SEQUENCE public.fees_id_seq;
DROP TABLE public.fees;
DROP TABLE public.django_migrations;
DROP TABLE public.django_content_type;
DROP TABLE public.auth_user_user_permissions;
DROP TABLE public.auth_user_groups;
DROP TABLE public.auth_user;
DROP TABLE public.auth_permission;
DROP TABLE public.auth_group_permissions;
DROP TABLE public.auth_group;
DROP SEQUENCE public.attendance_id_seq;
DROP TABLE public.attendance;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    "studentId" integer NOT NULL,
    "userId" integer NOT NULL,
    "attendanceDate" date NOT NULL,
    status character varying(20) NOT NULL,
    remarks text,
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'late'::character varying, 'leave'::character varying])::text[])))
);


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_user (
    id integer NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    username character varying(150) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    email character varying(254) NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL
);


--
-- Name: auth_user_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_user_groups (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL
);


--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_user_user_permissions (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fees (
    id integer NOT NULL,
    "studentId" integer NOT NULL,
    "userId" integer,
    amount numeric(10,2) NOT NULL,
    "dueDate" date,
    "paidDate" date,
    "isPaid" boolean DEFAULT false,
    "paymentMethod" character varying(50),
    "receiptNumber" character varying(50),
    month character varying(50),
    "academicYear" character varying(20),
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description character varying(200),
    CONSTRAINT "fees_paymentMethod_check" CHECK ((("paymentMethod")::text = ANY ((ARRAY['cash'::character varying, 'check'::character varying, 'online'::character varying, 'bank_transfer'::character varying])::text[])))
);


--
-- Name: fees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fees_id_seq OWNED BY public.fees.id;


--
-- Name: homework; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homework (
    id integer NOT NULL,
    "teacherId" integer,
    "classLevel" character varying(10) NOT NULL,
    section character varying(5),
    title character varying(255) NOT NULL,
    description text,
    "dueDate" date,
    subject character varying(50),
    "attachmentUrl" character varying(500),
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(50) DEFAULT 'homework'::character varying
);


--
-- Name: homework_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.homework_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: homework_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.homework_id_seq OWNED BY public.homework.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    "classLevel" character varying(50) NOT NULL,
    subject character varying(100) NOT NULL,
    "fileUrl" text NOT NULL,
    "uploadedBy" character varying(100),
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    "attachmentUrl" text,
    "recipientRole" character varying(50),
    "classLevel" character varying(50),
    "createdBy" integer,
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    name character varying(100) NOT NULL,
    "classLevel" character varying(10),
    section character varying(5),
    "fatherName" character varying(100),
    "motherName" character varying(100),
    phone character varying(20),
    email character varying(255),
    "joiningDate" date,
    status character varying(50) DEFAULT 'active'::character varying,
    "rollNumber" character varying(20),
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT students_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'graduated'::character varying])::text[])))
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: syllabus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.syllabus (
    id integer NOT NULL,
    "teacherId" integer,
    "classLevel" character varying(20) NOT NULL,
    section character varying(10),
    subject character varying(100) NOT NULL,
    chapter character varying(200) NOT NULL,
    description text,
    completed boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now()
);


--
-- Name: syllabus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.syllabus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: syllabus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.syllabus_id_seq OWNED BY public.syllabus.id;


--
-- Name: timetable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable (
    id integer NOT NULL,
    "dayOfWeek" character varying(20) NOT NULL,
    "startTime" time without time zone NOT NULL,
    "endTime" time without time zone NOT NULL,
    subject character varying(100) NOT NULL,
    "classLevel" character varying(50) NOT NULL,
    "teacherId" integer,
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: timetable_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_id_seq OWNED BY public.timetable.id;


--
-- Name: token_blacklist_blacklistedtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist_blacklistedtoken (
    id bigint NOT NULL,
    blacklisted_at timestamp with time zone NOT NULL,
    token_id bigint NOT NULL
);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_blacklistedtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_blacklistedtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_blacklist_outstandingtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist_outstandingtoken (
    id bigint NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    user_id integer,
    jti character varying(255) NOT NULL
);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_outstandingtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_outstandingtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    password character varying(255),
    role character varying(50) NOT NULL,
    "schoolId" character varying(50) DEFAULT 'school-001'::character varying NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'parent'::character varying, 'teacher'::character varying, 'staff'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: fees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fees ALTER COLUMN id SET DEFAULT nextval('public.fees_id_seq'::regclass);


--
-- Name: homework id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework ALTER COLUMN id SET DEFAULT nextval('public.homework_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: syllabus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus ALTER COLUMN id SET DEFAULT nextval('public.syllabus_id_seq'::regclass);


--
-- Name: timetable id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable ALTER COLUMN id SET DEFAULT nextval('public.timetable_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, "studentId", "userId", "attendanceDate", status, remarks, "schoolId", "createdAt", "updatedAt") FROM stdin;
17	25	41	2026-03-26	late	\N	school-001	2026-03-26 11:18:09.708573	2026-03-26 11:18:09.708573
19	25	41	2026-03-25	present	\N	school-001	2026-03-26 14:30:10.674244	2026-03-26 14:30:10.674244
20	25	41	2026-03-24	present	\N	school-001	2026-03-26 14:30:20.422753	2026-03-26 14:30:20.422753
21	25	41	2026-03-23	late	\N	school-001	2026-03-26 14:30:29.779366	2026-03-26 14:30:29.779366
22	25	41	2026-03-22	absent	\N	school-001	2026-03-26 14:30:51.896786	2026-03-26 14:30:51.896786
23	11	6	2026-03-26	absent	\N	school-001	2026-03-26 18:50:50.956638	2026-03-26 18:50:50.956638
24	7	2	2026-03-26	present	\N	school-001	2026-03-26 21:04:47.521616	2026-03-26 21:04:47.521616
25	9	4	2026-03-26	late	\N	school-001	2026-03-26 21:04:47.549752	2026-03-26 21:04:47.549752
26	27	42	2026-03-26	absent	\N	school-001	2026-03-26 21:43:40.175759	2026-03-26 21:43:40.175759
2	23	25	2026-03-26	present	\N	school-001	2026-03-26 10:43:26.55083	2026-03-26 10:43:26.55083
3	26	1	2026-03-26	present	\N	school-001	2026-03-26 10:43:26.565563	2026-03-26 10:43:26.565563
4	12	22	2026-03-26	present	\N	school-001	2026-03-26 10:43:26.567316	2026-03-26 10:43:26.567316
5	16	24	2026-03-26	present	\N	school-001	2026-03-26 10:43:26.569049	2026-03-26 10:43:26.569049
6	24	30	2026-03-26	present	\N	school-001	2026-03-26 10:43:26.571485	2026-03-26 10:43:26.571485
44	25	41	2026-03-30	absent	\N	school-001	2026-03-30 18:02:50.596228	2026-03-30 18:02:50.596228
51	10	5	2026-03-30	absent	\N	school-001	2026-03-30 23:09:36.719854	2026-03-30 23:09:36.719854
52	7	2	2026-03-31	absent	\N	school-001	2026-03-31 11:20:53.9974	2026-03-31 11:20:53.9974
53	9	4	2026-03-31	present	\N	school-001	2026-03-31 11:20:54.031356	2026-03-31 11:20:54.031356
58	28	45	2026-04-02	present	\N	school-001	2026-04-02 12:44:25.331735	2026-04-02 12:44:25.331735
59	27	42	2026-04-02	absent	\N	school-001	2026-04-02 12:44:25.359395	2026-04-02 12:44:25.359395
60	23	25	2026-04-02	present	\N	school-001	2026-04-02 12:44:25.360443	2026-04-02 12:44:25.360443
61	26	1	2026-04-02	present	\N	school-001	2026-04-02 12:44:25.361462	2026-04-02 12:44:25.361462
62	12	22	2026-04-02	absent	\N	school-001	2026-04-02 12:44:25.363014	2026-04-02 12:44:25.363014
63	16	24	2026-04-02	present	\N	school-001	2026-04-02 12:44:25.363883	2026-04-02 12:44:25.363883
64	24	30	2026-04-02	present	\N	school-001	2026-04-02 12:44:25.364597	2026-04-02 12:44:25.364597
65	25	41	2026-04-04	absent	\N	school-001	2026-04-04 22:46:00.795087	2026-04-04 22:46:00.795087
66	7	2	2026-04-04	absent	\N	school-001	2026-04-05 00:25:24.865168	2026-04-05 00:25:24.865168
67	9	4	2026-04-04	present	\N	school-001	2026-04-05 00:25:24.898899	2026-04-05 00:25:24.898899
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add content type	1	add_contenttype
2	Can change content type	1	change_contenttype
3	Can delete content type	1	delete_contenttype
4	Can view content type	1	view_contenttype
5	Can add permission	3	add_permission
6	Can change permission	3	change_permission
7	Can delete permission	3	delete_permission
8	Can view permission	3	view_permission
9	Can add group	2	add_group
10	Can change group	2	change_group
11	Can delete group	2	delete_group
12	Can view group	2	view_group
13	Can add user	4	add_user
14	Can change user	4	change_user
15	Can delete user	4	delete_user
16	Can view user	4	view_user
17	Can add Blacklisted Token	5	add_blacklistedtoken
18	Can change Blacklisted Token	5	change_blacklistedtoken
19	Can delete Blacklisted Token	5	delete_blacklistedtoken
20	Can view Blacklisted Token	5	view_blacklistedtoken
21	Can add Outstanding Token	6	add_outstandingtoken
22	Can change Outstanding Token	6	change_outstandingtoken
23	Can delete Outstanding Token	6	delete_outstandingtoken
24	Can view Outstanding Token	6	view_outstandingtoken
25	Can add user	7	add_user
26	Can change user	7	change_user
27	Can delete user	7	delete_user
28	Can view user	7	view_user
29	Can add student	8	add_student
30	Can change student	8	change_student
31	Can delete student	8	delete_student
32	Can view student	8	view_student
33	Can add attendance	9	add_attendance
34	Can change attendance	9	change_attendance
35	Can delete attendance	9	delete_attendance
36	Can view attendance	9	view_attendance
37	Can add fee	10	add_fee
38	Can change fee	10	change_fee
39	Can delete fee	10	delete_fee
40	Can view fee	10	view_fee
41	Can add homework	11	add_homework
42	Can change homework	11	change_homework
43	Can delete homework	11	delete_homework
44	Can view homework	11	view_homework
45	Can add material	12	add_material
46	Can change material	12	change_material
47	Can delete material	12	delete_material
48	Can view material	12	view_material
49	Can add notification	13	add_notification
50	Can change notification	13	change_notification
51	Can delete notification	13	delete_notification
52	Can view notification	13	view_notification
53	Can add result	14	add_result
54	Can change result	14	change_result
55	Can delete result	14	delete_result
56	Can view result	14	view_result
57	Can add timetable	16	add_timetable
58	Can change timetable	16	change_timetable
59	Can delete timetable	16	delete_timetable
60	Can view timetable	16	view_timetable
61	Can add syllabus	15	add_syllabus
62	Can change syllabus	15	change_syllabus
63	Can delete syllabus	15	delete_syllabus
64	Can view syllabus	15	view_syllabus
\.


--
-- Data for Name: auth_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined) FROM stdin;
\.


--
-- Data for Name: auth_user_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: auth_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	contenttypes	contenttype
2	auth	group
3	auth	permission
4	auth	user
5	token_blacklist	blacklistedtoken
6	token_blacklist	outstandingtoken
7	users	user
8	students	student
9	attendance	attendance
10	fees	fee
11	homework	homework
12	materials	material
13	notifications	notification
14	results	result
15	timetable	syllabus
16	timetable	timetable
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-04-04 05:43:26.707359+05:30
2	contenttypes	0002_remove_content_type_name	2026-04-04 05:43:26.73193+05:30
3	auth	0001_initial	2026-04-04 05:43:26.843652+05:30
4	auth	0002_alter_permission_name_max_length	2026-04-04 05:43:26.853036+05:30
5	auth	0003_alter_user_email_max_length	2026-04-04 05:43:26.859541+05:30
6	auth	0004_alter_user_username_opts	2026-04-04 05:43:26.864978+05:30
7	auth	0005_alter_user_last_login_null	2026-04-04 05:43:26.872629+05:30
8	auth	0006_require_contenttypes_0002	2026-04-04 05:43:26.874152+05:30
9	auth	0007_alter_validators_add_error_messages	2026-04-04 05:43:26.879812+05:30
10	auth	0008_alter_user_username_max_length	2026-04-04 05:43:26.894656+05:30
11	auth	0009_alter_user_last_name_max_length	2026-04-04 05:43:26.904535+05:30
12	auth	0010_alter_group_name_max_length	2026-04-04 05:43:26.914746+05:30
13	auth	0011_update_proxy_permissions	2026-04-04 05:43:26.93502+05:30
14	auth	0012_alter_user_first_name_max_length	2026-04-04 05:43:26.943299+05:30
15	token_blacklist	0001_initial	2026-04-04 05:43:26.995043+05:30
16	token_blacklist	0002_outstandingtoken_jti_hex	2026-04-04 05:43:27.005496+05:30
17	token_blacklist	0003_auto_20171017_2007	2026-04-04 05:43:27.024734+05:30
18	token_blacklist	0004_auto_20171017_2013	2026-04-04 05:43:27.039744+05:30
19	token_blacklist	0005_remove_outstandingtoken_jti	2026-04-04 05:43:27.049044+05:30
20	token_blacklist	0006_auto_20171017_2113	2026-04-04 05:43:27.065393+05:30
21	token_blacklist	0007_auto_20171017_2214	2026-04-04 05:43:27.143696+05:30
22	token_blacklist	0008_migrate_to_bigautofield	2026-04-04 05:43:27.197874+05:30
23	token_blacklist	0010_fix_migrate_to_bigautofield	2026-04-04 05:43:27.223542+05:30
24	token_blacklist	0011_linearizes_history	2026-04-04 05:43:27.225602+05:30
25	token_blacklist	0012_alter_outstandingtoken_user	2026-04-04 05:43:27.236344+05:30
26	token_blacklist	0013_alter_blacklistedtoken_options_and_more	2026-04-04 05:43:27.251726+05:30
\.


--
-- Data for Name: fees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fees (id, "studentId", "userId", amount, "dueDate", "paidDate", "isPaid", "paymentMethod", "receiptNumber", month, "academicYear", "schoolId", notes, "createdAt", "updatedAt", description) FROM stdin;
8	11	6	4000.00	2026-04-11	2026-03-26	t	\N	\N	\N	\N	school-001	\N	2026-03-25 20:51:41.646322	2026-03-25 20:51:41.646322	Monthly fee
7	7	2	10000.00	2026-03-28	\N	f	\N	\N	\N	\N	school-001	\N	2026-03-25 20:50:31.251918	2026-03-25 20:50:31.251918	fees
13	7	2	600.00	2026-03-31	2026-03-31	t	\N	\N	\N	\N	school-001	\N	2026-03-31 11:24:38.848818	2026-03-31 11:24:38.848818	monthly tuition fees
10	25	41	15000.00	2026-03-31	\N	f	\N	\N	\N	\N	school-001	\N	2026-03-26 11:19:52.373902	2026-03-26 11:19:52.373902	Admission Fee
11	12	22	10000.00	2026-03-13	\N	f	\N	\N	\N	\N	school-001	\N	2026-03-26 22:02:56.790702	2026-03-26 22:02:56.790702	admission fee
12	25	41	5000.00	2026-03-25	\N	f	\N	\N	\N	\N	school-001	\N	2026-03-26 22:33:49.071875	2026-03-26 22:33:49.071875	monthly fees
9	8	3	15000.00	2026-03-25	\N	f	\N	\N	\N	\N	school-001	\N	2026-03-25 21:09:56.09856	2026-03-25 21:09:56.09856	admission fee
\.


--
-- Data for Name: homework; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.homework (id, "teacherId", "classLevel", section, title, description, "dueDate", subject, "attachmentUrl", "schoolId", "createdAt", "updatedAt", type) FROM stdin;
3	\N	10	\N	ch5 excercise	the first homework	2026-03-27	english	\N	school-001	2026-03-24 23:14:31.530548	2026-03-24 23:14:31.530548	homework
4	\N	10A	\N	loop	this is the second homework about loop in programming	2026-03-31	cs	\N	school-001	2026-03-25 13:39:13.064619	2026-03-25 13:39:13.064619	homework
5	\N	12	\N	cs excercise	this is your first homework	2026-03-28	csc	\N	school-001	2026-03-26 11:15:39.920426	2026-03-26 11:15:39.920426	homework
8	\N	12	\N	ch-3	\N	2026-03-26	maths	/uploads/homework/1774544470187-302844281.pdf	school-001	2026-03-26 22:31:14.455065	2026-03-26 22:31:14.455065	homework
9	\N	12	\N	ch-3	Do the homework properly	2026-03-26	maths	/uploads/homework/1774544501112-264956374.pdf	school-001	2026-03-26 22:31:46.632774	2026-03-26 22:31:46.632774	homework
10	\N	12	\N	ch6 excercise	this is your second homework	2026-03-20	computer	/uploads/homework/1774874464256-848644184.pdf	school-001	2026-03-30 18:11:04.380964	2026-03-30 18:11:04.380964	homework
11	7	12	A	Calulate the Resistance	Calculate the resistance of whiston bridge	\N	Phy	\N	school-001	2026-03-30 21:37:53.813305	2026-03-30 21:37:53.813305	daily_practice
12	7	12	\N	Thermodynamics	Derive the mathematical formulation of zeroth law	2026-03-31	Phy	\N	school-001	2026-03-30 23:06:43.358407	2026-03-30 23:06:43.358407	homework
13	7	12	\N	Thermodynamics	Derive the mathematical formulation of zeroth law	2026-03-31	Phy	/uploads/homework/homework-1774892234946-182333417.png	school-001	2026-03-30 23:07:15.254229	2026-03-30 23:07:15.254229	homework
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials (id, title, description, "classLevel", subject, "fileUrl", "uploadedBy", "createdAt", "updatedAt") FROM stdin;
1	ch_0	This is the first study material being upload for testing purposes	12	Science	/uploads/materials/material-1774518108945-849726852.pdf	Admin	2026-03-26 15:10:34.511804	2026-03-26 15:11:49.090458
2	Study_material 1	This is the second test study Material	12	Science	/uploads/materials/material-1774521602559-695432446.png	Admin	2026-03-26 16:10:02.721211	2026-03-26 16:10:02.721211
3	ch--3	work and energy	9	Science	/uploads/materials/material-1774544866386-935379033.pdf	Admin	2026-03-26 22:37:51.116623	2026-03-26 22:37:51.116623
4	ch--3	work and energy	9	Science	/uploads/materials/material-1774544897196-833727098.png	Admin	2026-03-26 22:38:19.270027	2026-03-26 22:38:19.270027
5	ch--3	work and energy	9	Science	/uploads/materials/material-1774544898556-76658257.pdf	Admin	2026-03-26 22:38:21.273179	2026-03-26 22:38:21.273179
6	Phy Notes	this is the first note provided by the teacher	12	Phy	/uploads/materials/materials-1774880804522-757677493.pdf	8888888888	2026-03-30 19:56:44.600496	2026-03-30 19:56:44.600496
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, title, message, "attachmentUrl", "recipientRole", "classLevel", "createdBy", "schoolId", "createdAt") FROM stdin;
1	1st April Is Holiday	I hereby declare you holiday on 1st April	/uploads/notifications/notice-1774542944098-893058928.png	\N	\N	1	school-001	2026-03-26 22:05:51.665755
2	Holiday Tommorow	I hereby declare holiday on 31 aug	\N	\N	\N	1	school-001	2026-03-31 11:59:12.596594
3	Exam Result	Exam Result	/uploads/notifications/notice-1774938743728-182857661.pdf	student	8	1	school-001	2026-03-31 12:02:23.97963
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, "userId", name, "classLevel", section, "fatherName", "motherName", phone, email, "joiningDate", status, "rollNumber", "schoolId", "createdAt", "updatedAt") FROM stdin;
8	3	Neha Gupta	9th	B	Sanjay Gupta	Anita Gupta	9876543211	neha@example.com	2025-04-05	active	102	school-001	2026-03-22 21:47:28.760501	2026-03-22 21:47:28.760501
9	4	Rohan Patel	10th	A	Vikram Patel	Meena Patel	9876543212	rohan@example.com	2025-04-10	active	103	school-001	2026-03-22 21:47:28.760501	2026-03-22 21:47:28.760501
10	5	Sneha Singh	11th	C	Arun Singh	Kavita Singh	9876543213	sneha@example.com	2025-04-12	active	104	school-001	2026-03-22 21:47:28.760501	2026-03-22 21:47:28.760501
11	6	Kabir Das	12th	D	Amit Das	Sunita Das	9876543214	kabir@example.com	2025-04-15	active	105	school-001	2026-03-22 21:47:28.760501	2026-03-22 21:47:28.760501
12	22	student7 surname7	10	\N	Father_7	\N	\N	\N	2026-03-23	active	\N	school-001	2026-03-23 11:05:49.677708	2026-03-23 11:05:49.677708
16	24	student8 surname8	10	\N	Father_8	\N	\N	\N	2026-03-23	active	\N	school-001	2026-03-23 11:15:00.776864	2026-03-23 11:15:00.776864
23	25	Student (9999999991)	10	\N	\N	\N	9999999991	9999999991@student.local	2026-03-24	active	\N	school-001	2026-03-24 23:14:41.407236	2026-03-24 23:14:41.407236
24	30	student9 surname9	10	A	Father_9	Mom_9	9999999910	student9@gmai.com	2026-03-25	active	7591	school-001	2026-03-25 13:25:47.475781	2026-03-25 13:25:47.475781
25	41	Muslim Uddin	12	\N	\N	\N	1111111111	1111111111@student.local	2026-03-25	active	REG-8971	school-001	2026-03-25 21:17:58.598267	2026-03-25 21:17:58.598267
26	1	Student (9999999999)	10	\N	\N	\N	9999999999	admin@academy.local	2026-03-25	active	\N	school-001	2026-03-25 21:34:05.95588	2026-03-25 21:34:05.95588
27	42	Student	10	\N	\N	\N	2222222222	2222222222@student.local	2026-03-26	active	REG-6028	school-001	2026-03-26 13:10:55.836672	2026-03-26 13:10:55.836672
28	45	Arif	10	\N	\N	\N	3333333333	3333333333@student.local	2026-03-31	active	REG-8762	school-001	2026-03-31 11:37:53.382143	2026-03-31 11:37:53.382143
29	46	moslem	Class 12	\N	\N	\N	4444444444	4444444444@student.local	2026-04-04	active	REG-2719	school-001	2026-04-03 19:16:23.567755	2026-04-03 19:16:23.567755
7	2	Aarav Sharma	10th	A	Rajesh Sharma	Priya Sharma	9876543210	aarav@example.com	2025-04-01	active	101	school-001	2026-03-22 21:47:28.760501	2026-03-22 21:47:28.760501
\.


--
-- Data for Name: syllabus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.syllabus (id, "teacherId", "classLevel", section, subject, chapter, description, completed, "createdAt") FROM stdin;
1	7	12	A	Phy	Ray optics	I am taking the ray optics, dear students	t	2026-03-30 20:13:36.45803
2	7	12	A	Physics	Thermodynamics	from ex-1 to 3	t	2026-04-04 23:45:49.022779
\.


--
-- Data for Name: timetable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timetable (id, "dayOfWeek", "startTime", "endTime", subject, "classLevel", "teacherId", "schoolId", "createdAt") FROM stdin;
1	Monday	09:00:00	10:00:00	Mathematics	12	7	school-001	2026-03-30 19:46:56.354263
2	Monday	11:00:00	12:00:00	Physics	12	7	school-001	2026-03-30 19:46:56.375716
3	Tuesday	09:00:00	10:00:00	Mathematics	12	7	school-001	2026-03-30 19:46:56.376955
4	Tuesday	11:00:00	12:00:00	Physics	12	7	school-001	2026-03-30 19:46:56.37764
5	Wednesday	09:00:00	10:00:00	Mathematics	12	7	school-001	2026-03-30 19:46:56.378309
6	Wednesday	11:00:00	12:00:00	Physics	12	7	school-001	2026-03-30 19:46:56.379305
7	Thursday	09:00:00	10:00:00	Mathematics	12	7	school-001	2026-03-30 19:46:56.380556
8	Thursday	11:00:00	12:00:00	Physics	12	7	school-001	2026-03-30 19:46:56.381479
9	Friday	09:00:00	10:00:00	Mathematics	12	7	school-001	2026-03-30 19:46:56.382335
10	Friday	11:00:00	12:00:00	Physics	12	7	school-001	2026-03-30 19:46:56.383037
11	Saturday	09:00:00	10:00:00	Mathematics	12	7	school-001	2026-03-30 19:46:56.383706
12	Saturday	11:00:00	12:00:00	Physics	12	7	school-001	2026-03-30 19:46:56.384187
13	Monday	09:00:00	10:00:00	Physics	12	44	school-001	2026-03-30 20:18:07.801722
14	Monday	07:30:00	08:30:00	maths	10th	44	school-001	2026-03-31 11:33:42.876984
15	Monday	06:30:00	07:30:00	maths	11th	44	school-001	2026-03-31 11:34:18.714204
\.


--
-- Data for Name: token_blacklist_blacklistedtoken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.token_blacklist_blacklistedtoken (id, blacklisted_at, token_id) FROM stdin;
\.


--
-- Data for Name: token_blacklist_outstandingtoken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.token_blacklist_outstandingtoken (id, token, created_at, expires_at, user_id, jti) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, phone, email, password, role, "schoolId", "isActive", "createdAt", "updatedAt") FROM stdin;
7	8888888888	teacher@a2z.local	$2b$12$H2FvWBWDc1VU1Tcas/whLeVN3RLLxNdxa2ejvJP8Iu0ubhlP4Vwka	teacher	school-001	t	2026-03-22 21:54:35.915652	2026-03-22 21:54:35.915652
2	9876543210	aarav@example.com	password123	student	school-001	t	2026-03-22 21:47:04.346131	2026-03-22 21:47:04.346131
3	9876543211	neha@example.com	password123	student	school-001	t	2026-03-22 21:47:04.346131	2026-03-22 21:47:04.346131
4	9876543212	rohan@example.com	password123	student	school-001	t	2026-03-22 21:47:04.346131	2026-03-22 21:47:04.346131
5	9876543213	sneha@example.com	password123	student	school-001	t	2026-03-22 21:47:04.346131	2026-03-22 21:47:04.346131
6	9876543214	kabir@example.com	password123	student	school-001	t	2026-03-22 21:47:04.346131	2026-03-22 21:47:04.346131
21	9999999996	student6@gmai.com	student123	student	school-001	t	2026-03-23 10:31:56.488703	2026-03-23 10:31:56.488703
22	9999999997	student7@gmai.com	student123	student	school-001	t	2026-03-23 11:05:49.674168	2026-03-23 11:05:49.674168
24	9999999998	student8@gmai.com	student123	student	school-001	t	2026-03-23 11:15:00.767051	2026-03-23 11:15:00.767051
25	9999999991	9999999991@student.local	\N	student	school-001	t	2026-03-23 11:15:41.785431	2026-03-23 11:15:41.785431
30	9999999910	student9@gmai.com	student123	student	school-001	t	2026-03-25 13:25:47.457792	2026-03-25 13:25:47.457792
35	2222222220	staff0@gmail.com	password123	staff	school-001	t	2026-03-25 13:52:50.372101	2026-03-25 13:52:50.372101
33	1111111112	abadef@gmail.com	password123	staff	school-001	t	2026-03-25 13:37:20.754469	2026-03-25 13:37:20.754469
41	1111111111	1111111111@student.local	muslimuddin	student	school-001	t	2026-03-25 21:17:58.579916	2026-03-25 21:17:58.579916
42	2222222222	2222222222@student.local	22222	student	school-001	t	2026-03-26 13:10:55.828661	2026-03-26 13:10:55.828661
36	1234567890	staff@a2z.local	password123	staff	school-001	t	2026-03-25 18:20:34.27494	2026-03-25 18:20:34.27494
44	8888855555	bhabap@gmail.com	password123	teacher	school-001	t	2026-03-26 22:24:26.025797	2026-03-26 22:24:26.025797
45	3333333333	3333333333@student.local	3	student	school-001	t	2026-03-31 11:37:53.361042	2026-03-31 11:37:53.361042
23	8888888882	teacher2@gmail.com	password123	teacher	school-001	t	2026-03-23 11:11:04.599951	2026-03-23 11:11:04.599951
20	8888888881	teacher1@gmail.com	password123	teacher	school-001	t	2026-03-23 10:30:29.94753	2026-03-23 10:30:29.94753
46	4444444444	4444444444@student.local	$2b$12$j5aSNCr.0IUiHegIAZek.eaX.sckiAOFPr5DLXXICQ1rXaJWJ.Wmi	student	school-001	t	2026-04-03 19:16:23.556703	2026-04-03 19:16:23.556703
1	9999999999	admin@academy.local	$2b$12$tW12X4JX8GHgOwJiAvr0ROCOSSQeIIsec1cqDYlvvZVrRMQPDjVOC	admin	school-001	f	2026-03-22 17:34:07.681015	2026-03-22 17:34:07.681015
\.


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 67, true);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 64, true);


--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_user_groups_id_seq', 1, false);


--
-- Name: auth_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_user_id_seq', 1, false);


--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_user_user_permissions_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 16, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 26, true);


--
-- Name: fees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fees_id_seq', 13, true);


--
-- Name: homework_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.homework_id_seq', 13, true);


--
-- Name: materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materials_id_seq', 6, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.students_id_seq', 29, true);


--
-- Name: syllabus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.syllabus_id_seq', 2, true);


--
-- Name: timetable_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timetable_id_seq', 15, true);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.token_blacklist_blacklistedtoken_id_seq', 1, false);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.token_blacklist_outstandingtoken_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 46, true);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_studentid_attendancedate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_studentid_attendancedate_key UNIQUE ("studentId", "attendanceDate");


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq UNIQUE (user_id, group_id);


--
-- Name: auth_user auth_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq UNIQUE (user_id, permission_id);


--
-- Name: auth_user auth_user_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_username_key UNIQUE (username);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: fees fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fees
    ADD CONSTRAINT fees_pkey PRIMARY KEY (id);


--
-- Name: homework homework_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "students_userId_key" UNIQUE ("userId");


--
-- Name: syllabus syllabus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus
    ADD CONSTRAINT syllabus_pkey PRIMARY KEY (id);


--
-- Name: timetable timetable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable
    ADD CONSTRAINT timetable_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_key UNIQUE (token_id);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq UNIQUE (jti);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: auth_user_groups_group_id_97559544; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_user_groups_group_id_97559544 ON public.auth_user_groups USING btree (group_id);


--
-- Name: auth_user_groups_user_id_6a12ed8b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_user_groups_user_id_6a12ed8b ON public.auth_user_groups USING btree (user_id);


--
-- Name: auth_user_user_permissions_permission_id_1fbb5f2c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_user_user_permissions_permission_id_1fbb5f2c ON public.auth_user_user_permissions USING btree (permission_id);


--
-- Name: auth_user_user_permissions_user_id_a95ead1b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_user_user_permissions_user_id_a95ead1b ON public.auth_user_user_permissions USING btree (user_id);


--
-- Name: auth_user_username_6821ab7c_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_user_username_6821ab7c_like ON public.auth_user USING btree (username varchar_pattern_ops);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree ("attendanceDate");


--
-- Name: idx_attendance_schoolid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_schoolid ON public.attendance USING btree ("schoolId");


--
-- Name: idx_attendance_studentid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_studentid ON public.attendance USING btree ("studentId");


--
-- Name: idx_attendance_userid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_userid ON public.attendance USING btree ("userId");


--
-- Name: idx_fees_duedate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fees_duedate ON public.fees USING btree ("dueDate");


--
-- Name: idx_fees_ispaid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fees_ispaid ON public.fees USING btree ("isPaid");


--
-- Name: idx_fees_schoolid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fees_schoolid ON public.fees USING btree ("schoolId");


--
-- Name: idx_fees_studentid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fees_studentid ON public.fees USING btree ("studentId");


--
-- Name: idx_fees_userid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fees_userid ON public.fees USING btree ("userId");


--
-- Name: idx_homework_classlevel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_classlevel ON public.homework USING btree ("classLevel");


--
-- Name: idx_homework_duedate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_duedate ON public.homework USING btree ("dueDate");


--
-- Name: idx_homework_schoolid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_schoolid ON public.homework USING btree ("schoolId");


--
-- Name: idx_homework_teacherid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_teacherid ON public.homework USING btree ("teacherId");


--
-- Name: idx_students_rollnumber; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_rollnumber ON public.students USING btree ("rollNumber");


--
-- Name: idx_students_schoolid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_schoolid ON public.students USING btree ("schoolId");


--
-- Name: idx_students_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_user_id ON public.students USING btree ("userId");


--
-- Name: idx_students_userid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_userid ON public.students USING btree ("userId");


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_schoolid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_schoolid ON public.users USING btree ("schoolId");


--
-- Name: token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like ON public.token_blacklist_outstandingtoken USING btree (jti varchar_pattern_ops);


--
-- Name: token_blacklist_outstandingtoken_user_id_83bc629a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_blacklist_outstandingtoken_user_id_83bc629a ON public.token_blacklist_outstandingtoken USING btree (user_id);


--
-- Name: attendance attendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fees fees_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fees
    ADD CONSTRAINT "fees_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fees fees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fees
    ADD CONSTRAINT "fees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: homework homework_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT "homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id);


--
-- Name: students students_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: syllabus syllabus_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus
    ADD CONSTRAINT "syllabus_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: timetable timetable_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable
    ADD CONSTRAINT "timetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.users(id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk FOREIGN KEY (token_id) REFERENCES public.token_blacklist_outstandingtoken(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outs_user_id_83bc629a_fk_auth_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_auth_user FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

\unrestrict Xbt9OK5kWokmVIWHyWi62fErBfa35qqGQhQfoFZ9GLcs3MWTzJCmfeN9tCYy4an

