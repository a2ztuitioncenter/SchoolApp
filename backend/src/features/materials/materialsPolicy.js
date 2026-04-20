export async function getTeacherAssignments(db, teacherId) {
  const result = await db.query(
    `SELECT "classLevel", section
     FROM teacher_class_assignment
     WHERE "teacherId" = $1`,
    [teacherId]
  );
  return result.rows;
}

export function isTeacherAssignedTo(assignments, className, sectionName = null) {
  return assignments.some((entry) => {
    const classMatch = String(entry.classLevel) === String(className);
    if (!classMatch) return false;
    if (!sectionName) return true;
    return !entry.section || entry.section === 'ALL' || String(entry.section) === String(sectionName);
  });
}

export async function getStudentScope(db, userId) {
  const result = await db.query(
    `SELECT "classLevel", section
     FROM students
     WHERE "userId" = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

