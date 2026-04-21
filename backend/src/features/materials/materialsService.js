import { getStudentScope, getTeacherAssignments, isTeacherAssignedTo } from './materialsPolicy.js';

function normalizeSection(section) {
  const value = typeof section === 'string' ? section.trim() : '';
  return value || null;
}

async function ensureClassAndSection(db, className, sectionName) {
  const classResult = await db.query(
    `INSERT INTO academic_classes (class_name)
     VALUES ($1)
     ON CONFLICT (class_name) DO UPDATE SET class_name = EXCLUDED.class_name
     RETURNING id, class_name`,
    [className]
  );

  const classRow = classResult.rows[0];
  if (!sectionName) return { classId: classRow.id, sectionId: null };

  const sectionResult = await db.query(
    `INSERT INTO academic_sections (class_id, section_name)
     VALUES ($1, $2)
     ON CONFLICT (class_id, section_name) DO UPDATE SET section_name = EXCLUDED.section_name
     RETURNING id`,
    [classRow.id, sectionName]
  );

  return { classId: classRow.id, sectionId: sectionResult.rows[0].id };
}

export async function createMaterial(db, user, payload) {
  const sectionName = normalizeSection(payload.section);
  const { classId, sectionId } = await ensureClassAndSection(db, payload.classLevel, sectionName);
  const uploaderRole = user.role === 'teacher' ? 'teacher' : 'admin';

  const result = await db.query(
    `INSERT INTO study_materials
      (title, description, file_url, class_id, section_id, uploaded_by, uploader_role, subject_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [payload.title, payload.description || null, payload.fileUrl, classId, sectionId, user.userId, uploaderRole, payload.subjectId || null]
  );

  return getMaterialById(db, result.rows[0].id);
}

export async function getMaterialById(db, materialId) {
  const result = await db.query(
    `SELECT
      sm.id,
      sm.title,
      sm.description,
      sm.file_url,
      sm.uploaded_by,
      sm.uploader_role,
      sm.created_at,
      sm.updated_at,
      sm.subject_id,
      sb.name AS subject_name,
      ac.id AS class_id,
      ac.class_name AS class_level,
      s.id AS section_id,
      s.section_name AS section
     FROM study_materials sm
     JOIN academic_classes ac ON ac.id = sm.class_id
     LEFT JOIN academic_sections s ON s.id = sm.section_id
     LEFT JOIN subjects sb ON sb.id = sm.subject_id
     WHERE sm.id = $1`,
    [materialId]
  );
  return result.rows[0] || null;
}

export function canManageMaterial(user, material, teacherAssignments) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;

  const inAssignedScope = isTeacherAssignedTo(teacherAssignments, material.class_level, material.section);
  if (!inAssignedScope) return false;
  return material.uploaded_by === user.userId || material.uploader_role === 'admin';
}

export async function getVisibleMaterials(db, user, filters = {}) {
  const clauses = [];
  const params = [];

  if (user.role === 'student') {
    const scope = await getStudentScope(db, user.userId);
    if (!scope) return [];
    params.push(scope.classLevel);
    clauses.push(`ac.class_name = $${params.length}`);
    if (scope.section) {
      params.push(scope.section);
      clauses.push(`(s.section_name = $${params.length} OR s.id IS NULL)`);
    }
  } else if (user.role === 'teacher') {
    const assignments = await getTeacherAssignments(db, user.userId);
    if (!assignments.length) return [];
    const assignmentPredicates = assignments.map((a) => {
      params.push(a.classLevel);
      const classParam = `$${params.length}`;
      if (!a.section || a.section === 'ALL') {
        return `(ac.class_name = ${classParam})`;
      }
      params.push(a.section);
      const sectionParam = `$${params.length}`;
      return `(ac.class_name = ${classParam} AND (s.section_name = ${sectionParam} OR s.id IS NULL))`;
    });
    clauses.push(`(${assignmentPredicates.join(' OR ')})`);
  }

  if (filters.classLevel && user.role === 'admin') {
    params.push(filters.classLevel);
    clauses.push(`ac.class_name = $${params.length}`);
  }
  if (filters.section && user.role === 'admin') {
    params.push(filters.section);
    clauses.push(`s.section_name = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT
      sm.id,
      sm.title,
      sm.description,
      sm.file_url,
      sm.uploaded_by,
      sm.uploader_role,
      sm.created_at,
      sm.updated_at,
      sm.subject_id,
      sb.name AS subject_name,
      ac.id AS class_id,
      ac.class_name AS class_level,
      s.id AS section_id,
      s.section_name AS section
     FROM study_materials sm
     JOIN academic_classes ac ON ac.id = sm.class_id
     LEFT JOIN academic_sections s ON s.id = sm.section_id
     LEFT JOIN subjects sb ON sb.id = sm.subject_id
     ${whereClause}
     ORDER BY sm.created_at DESC`,
    params
  );
  return result.rows;
}

export async function updateMaterial(db, materialId, payload) {
  const current = await getMaterialById(db, materialId);
  if (!current) return null;

  const classLevel = payload.classLevel || current.class_level;
  const sectionName = payload.section === undefined ? current.section : normalizeSection(payload.section);
  const { classId, sectionId } = await ensureClassAndSection(db, classLevel, sectionName);

  await db.query(
    `UPDATE study_materials
     SET title = $1,
         description = $2,
         file_url = $3,
         class_id = $4,
         section_id = $5,
         subject_id = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [
      payload.title || current.title,
      payload.description ?? current.description,
      payload.fileUrl || current.file_url,
      classId,
      sectionId,
      payload.subjectId || current.subject_id,
      materialId,
    ]
  );

  return getMaterialById(db, materialId);
}

export async function deleteMaterial(db, materialId) {
  const row = await getMaterialById(db, materialId);
  if (!row) return null;
  await db.query('DELETE FROM study_materials WHERE id = $1', [materialId]);
  return row;
}

