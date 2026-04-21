export async function getTeacherAssignments(db, teacherId) {
  const result = await db.query(
    `SELECT class_level, section
     FROM teacher_class_assignment
     WHERE teacher_id = $1`,
    [teacherId]
  );
  // Map snake_case to camelCase for the internal policy checks if needed
  return result.rows.map(r => ({
      classLevel: r.class_level,
      section: r.section
  }));
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
    `SELECT class_level, section
     FROM students
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  if (!result.rows[0]) return null;
  return {
      classLevel: result.rows[0].class_level,
      section: result.rows[0].section
  };
}
