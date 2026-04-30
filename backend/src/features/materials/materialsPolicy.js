export async function getTeacherAssignments(db, teacherId) {
  // Query both new subject_assignments and legacy teacher_class_assignment
  const [subRes, legacyRes] = await Promise.all([
    db.query(
      `SELECT DISTINCT class_level, section FROM subject_assignments WHERE teacher_id = $1`,
      [teacherId]
    ),
    db.query(
      `SELECT DISTINCT class_level, section FROM teacher_class_assignment WHERE teacher_id = $1`,
      [teacherId]
    )
  ]);

  // Merge results and normalize to camelCase
  const assignments = [...subRes.rows, ...legacyRes.rows];
  return assignments.map(r => ({
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
