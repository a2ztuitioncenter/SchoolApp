import fs from 'fs';
import path from 'path';
import { r2StorageService } from '../../utils/r2StorageService.js';

export async function removeStoredFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return;

  // 1. Check if the URL is a Cloudflare R2 proxy or public URL
  const r2Key = r2StorageService.extractKeyFromUrl(fileUrl);
  if (r2Key) {
    try {
      console.log(`[STORAGE DELETE] Deleting orphaned R2 file key: ${r2Key}`);
      await r2StorageService.deleteFile(r2Key);
      return;
    } catch (err) {
      console.error('[STORAGE DELETE ERROR] Failed to delete file from R2:', r2Key, err.message);
      return;
    }
  }

  // 2. Legacy fallback: Local files in uploads/
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
}
