import test from 'node:test';
import assert from 'node:assert/strict';

import { canManageMaterial } from '../src/features/materials/materialsService.js';
import { isTeacherAssignedTo } from '../src/features/materials/materialsPolicy.js';
import { uploadMaterial } from '../src/features/materials/materialsController.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('teacher assignment check allows own section and ALL', () => {
  const assignments = [
    { class_level: '10', section: 'A' },
    { class_level: '9', section: 'ALL' },
  ];
  assert.equal(isTeacherAssignedTo(assignments, '10', 'A'), true);
  assert.equal(isTeacherAssignedTo(assignments, '9', 'B'), true);
  assert.equal(isTeacherAssignedTo(assignments, '11', 'A'), false);
});

test('teacher can manage own and in-scope admin materials only', () => {
  const teacher = { userId: 22, role: 'teacher' };
  const assignments = [{ class_level: '10', section: 'ALL' }];

  const ownMaterial = { uploaded_by: 22, uploader_role: 'teacher', class_level: '10', section: 'A' };
  const adminMaterial = { uploaded_by: 1, uploader_role: 'admin', class_level: '10', section: 'B' };
  const outOfScope = { uploaded_by: 1, uploader_role: 'admin', class_level: '8', section: 'A' };

  assert.equal(canManageMaterial(teacher, ownMaterial, assignments), true);
  assert.equal(canManageMaterial(teacher, adminMaterial, assignments), true);
  assert.equal(canManageMaterial(teacher, outOfScope, assignments), false);
});

test('student upload is blocked with 403', async () => {
  const req = {
    user: { userId: 44, role: 'student' },
    body: {},
    file: null,
    db: {},
  };
  const res = createMockRes();
  await uploadMaterial(req, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /Students/);
});

