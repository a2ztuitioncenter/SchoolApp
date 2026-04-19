import fs from 'fs';
import path from 'path';

export function removeStoredFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  if (!fileUrl.startsWith('/uploads/')) return;

  const relativePath = fileUrl.replace(/^\//, '');
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

