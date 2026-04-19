export async function getTeacherAssignments(db, teacherId) {
  const result = await db.query(
    `SELECT class_level, section
     FROM teacher_class_assignment
     WHERE teacher_id = $1`,
    [teacherId]
  );
  return result.rows;
}

export function isTeacherAssignedTo(assignments, className, sectionName = null) {
  return assignments.some((entry) => {
    const classMatch = String(entry.class_level) === String(className);
    if (!classMatch) return false;
    if (!sectionName) return true;
    return !entry.section || entry.section === 'ALL' || String(entry.section) === String(sectionName);
  });
}

export async function getStudentScope(db, userId) {
  const result = await db.query(
    `SELECT class_level, section
     FROM students
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

