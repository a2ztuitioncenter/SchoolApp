import path from 'path';
import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';
import { r2StorageService } from '../../utils/r2StorageService.js';
import { removeStoredFile } from './materialsStorage.js';
import {
  canManageMaterial,
  createMaterial,
  deleteMaterial,
  getMaterialById,
  getVisibleMaterials,
  updateMaterial,
} from './materialsService.js';
import { getTeacherAssignments, isTeacherAssignedTo } from './materialsPolicy.js';

// Helper: upload a multer memory-buffer to Cloudflare R2
async function uploadMaterialFileToR2(file, classLevel, section, userId) {
  const ext = path.extname(file.originalname || '');
  const safeName = `MAT_${classLevel}_${section || 'ALL'}_${Date.now()}${ext}`;
  const key = r2StorageService.buildKey('materials', classLevel || 'General', section || 'ALL', safeName);
  
  console.log(`[UPLOAD START] User: ${userId} | Study Material: ${file.originalname} | Size: ${file.size} bytes`);
  const result = await r2StorageService.uploadFile(file.buffer, key, file.mimetype);
  console.log(`[UPLOAD SUCCESS] Key: ${result.key} | Size: ${result.size}`);
  
  return result.downloadLink; // '/storage/download/<encoded-key>'
}

function toApiMaterial(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    fileUrl: row.file_url,
    file_url: row.file_url,
    classId: row.class_id,
    class_id: row.class_id,
    classLevel: row.class_level,
    class_level: row.class_level,
    sectionId: row.section_id,
    section_id: row.section_id,
    section: row.section,
    uploadedBy: row.uploaded_by,
    uploaded_by: row.uploaded_by,
    uploaderRole: row.uploader_role,
    uploader_role: row.uploader_role,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    subjectId: row.subject_id,
    subject_id: row.subject_id,
    subjectName: row.subject_name,
    subject_name: row.subject_name,
  };
}

async function assertTeacherScope(req, classLevel, section) {
  if (req.user.role !== 'teacher') return true;
  const assignments = await getTeacherAssignments(req.db, req.user.userId);
  return isTeacherAssignedTo(assignments, classLevel, section);
}

export const listMaterials = async (req, res) => {
  try {
    const classLevel = sanitizeIdentifier(req.query.classLevel || req.query.class_level || '', 20);
    const section = sanitizeNullableText(req.query.section, 10);
    const rows = await getVisibleMaterials(req.db, req.user, { classLevel, section });
    res.json({ success: true, data: rows.map(toApiMaterial) });
  } catch (error) {
    console.error('listMaterials error:', error);
    import('fs').then(fs => fs.appendFileSync('error.log', new Date().toISOString() + ' ' + error.stack + '\\n'));
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

export const uploadMaterial = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Students are not allowed to upload study materials' });
    }

    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);

    const rawFileUrl = req.file
      ? await uploadMaterialFileToR2(req.file, classLevel, section, req.user?.userId)
      : req.body.fileUrl;
    const fileUrl = rawFileUrl;

    if (!title || !classLevel || !fileUrl) {
      return res.status(422).json({ error: 'title, classLevel, and material file are required' });
    }

    const inScope = await assertTeacherScope(req, classLevel, section);
    if (!inScope) {
      return res.status(403).json({ error: 'Permission denied for this class/section assignment' });
    }

    const material = await createMaterial(req.db, req.user, {
      title,
      description,
      classLevel,
      section,
      subjectId: sanitizeIdentifier(req.body.subjectId || req.body.subject_id, 20),
      fileUrl,
    });
    res.status(201).json({ success: true, data: toApiMaterial(material) });
  } catch (error) {
    console.error('uploadMaterial error:', error);
    res.status(500).json({ error: 'Failed to upload material' });
  }
};

export const editMaterial = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(422).json({ error: 'Invalid material id' });
    if (req.user.role === 'student') return res.status(403).json({ error: 'Students are read-only users' });

    const material = await getMaterialById(req.db, id);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const assignments = req.user.role === 'teacher' ? await getTeacherAssignments(req.db, req.user.userId) : [];
    if (!canManageMaterial(req.user, material, assignments)) {
      return res.status(403).json({ error: 'Permission denied to edit this material' });
    }

    const nextClass = sanitizeIdentifier(req.body.classLevel || req.body.class_level || material.class_level, 20);
    const nextSection = req.body.section === undefined ? material.section : sanitizeNullableText(req.body.section, 10);
    if (!(await assertTeacherScope(req, nextClass, nextSection))) {
      return res.status(403).json({ error: 'Permission denied for target class/section' });
    }

    const newFileUrl = req.file
      ? await uploadMaterialFileToR2(req.file, nextClass, nextSection, req.user?.userId)
      : (req.body.fileUrl || material.file_url);

    const updated = await updateMaterial(req.db, id, {
      title: sanitizeText(req.body.title, 200) || undefined,
      description: sanitizeNullableText(req.body.description, 5000),
      classLevel: nextClass,
      section: nextSection,
      subjectId: sanitizeIdentifier(req.body.subjectId || req.body.subject_id, 20),
      fileUrl: newFileUrl,
    });

    if (req.file && material.file_url && material.file_url !== updated.file_url) {
      removeStoredFile(material.file_url);
    }
    res.json({ success: true, data: toApiMaterial(updated) });
  } catch (error) {
    console.error('editMaterial error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

export const removeMaterial = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(422).json({ error: 'Invalid material id' });
    if (req.user.role === 'student') return res.status(403).json({ error: 'Students are read-only users' });

    const material = await getMaterialById(req.db, id);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const assignments = req.user.role === 'teacher' ? await getTeacherAssignments(req.db, req.user.userId) : [];
    if (!canManageMaterial(req.user, material, assignments)) {
      return res.status(403).json({ error: 'Permission denied to delete this material' });
    }

    const deleted = await deleteMaterial(req.db, id);
    if (deleted?.file_url) {
      removeStoredFile(deleted.file_url);
    }
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('removeMaterial error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};
