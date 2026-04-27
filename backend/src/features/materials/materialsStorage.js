import fs from 'fs';
import path from 'path';

export async function removeStoredFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  if (!fileUrl.startsWith('/uploads/')) return;

  const relativePath = fileUrl.replace(/^\//, '');
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  // Ensure the resolved path is actually within the uploads directory
  if (!absolutePath.startsWith(uploadsDir + path.sep)) {
    return;
  }

  try {
    await fs.promises.unlink(absolutePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete file:', absolutePath, err);
    }
  }

