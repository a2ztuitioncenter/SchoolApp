/**
 * r2StorageService.js
 *
 * Cloudflare R2 storage service using the S3-compatible API.
 * Replaces Google Drive for all file storage operations.
 *
 * Environment variables required:
 *   R2_ACCOUNT_ID        — Cloudflare account ID
 *   R2_ACCESS_KEY_ID     — R2 API token (access key)
 *   R2_SECRET_ACCESS_KEY — R2 API token (secret)
 *   R2_BUCKET_NAME       — R2 bucket name
 *   R2_PUBLIC_URL        — Public base URL for files (e.g. https://pub-xxx.r2.dev or custom domain)
 *                          Leave empty to use proxy-based downloads instead.
 */

import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

class R2StorageService {
    constructor() {
        this.client = null;
        this.bucket = null;
    }

    _getClient() {
        if (this.client) return this.client;

        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucket = process.env.R2_BUCKET_NAME;

        if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
            throw new Error(
                'R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
                'R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your .env file.'
            );
        }

        this.bucket = bucket;
        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            // Required for Cloudflare R2 compatibility with AWS SDK v3:
            // The newer SDK adds CRC32 checksum headers by default which
            // R2's signature calculation does not include, causing mismatch.
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
        });

        return this.client;
    }

    /**
     * Build an organized R2 object key.
     * Structure: <type>/<classLevel>/<section>/<sanitizedFilename>
     * Example:   homework/class-12/section-a/HW_12_A_1716123456.pdf
     */
    buildKey(type, classLevel, section, fileName) {
        const sanitized = this.sanitizeFileName(fileName);
        const cls = String(classLevel || 'general').toLowerCase().replace(/\s+/g, '-');
        const sec = String(section || 'all').toLowerCase().replace(/\s+/g, '-');
        return `${type}/${cls}/${sec}/${sanitized}`;
    }

    sanitizeFileName(fileName) {
        const base = path.basename(fileName || 'file');
        // Keep alphanumeric, dots, dashes and underscores; replace everything else
        return base.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    }

    /**
     * Upload a file buffer to R2.
     *
     * @param {Buffer}  buffer    - File data
     * @param {string}  key       - Full R2 object key (path inside the bucket)
     * @param {string}  mimeType  - MIME type of the file
     * @returns {{ key, url, downloadLink, size }}
     */
    async uploadFile(buffer, key, mimeType) {
        const client = this._getClient();

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ContentLength: buffer.length,
        });

        await client.send(command);

        const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
        const url = publicBase
            ? `${publicBase}/${key}`
            : `/storage/download/${encodeURIComponent(key)}`;

        return {
            key,
            url,
            downloadLink: `/storage/download/${encodeURIComponent(key)}`,
            size: buffer.length,
            mimeType,
        };
    }

    /**
     * Delete a file from R2 by its object key.
     * Silently succeeds if the file does not exist.
     */
    async deleteFile(key) {
        if (!key) return;
        const client = this._getClient();
        try {
            await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        } catch (err) {
            if (err.name === 'NoSuchKey') return;
            console.warn(`[R2] Could not delete key "${key}":`, err.message);
        }
    }

    /**
     * Get file metadata (content-type, size) without downloading the body.
     */
    async getFileMetadata(key) {
        const client = this._getClient();
        const response = await client.send(
            new HeadObjectCommand({ Bucket: this.bucket, Key: key })
        );
        const name = path.basename(decodeURIComponent(key));
        return {
            key,
            name,
            mimeType: response.ContentType || 'application/octet-stream',
            size: response.ContentLength,
        };
    }

    /**
     * Stream a file from R2 for proxy-based download.
     * Returns the readable stream from the S3 GetObject response.
     */
    async getFileStream(key) {
        const client = this._getClient();
        const response = await client.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: key })
        );
        // response.Body is a readable stream (Node.js stream)
        return response.Body;
    }

    /**
     * Generate a time-limited signed URL for private bucket access.
     * Useful for direct client downloads without exposing the object key.
     *
     * @param {string} key        - R2 object key
     * @param {number} expiresIn  - URL expiry in seconds (default 3600 = 1 hour)
     */
    async getSignedUrl(key, expiresIn = 3600) {
        const client = this._getClient();
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        return getSignedUrl(client, command, { expiresIn });
    }

    /**
     * Extract the R2 object key from a download URL stored in the database.
     * Supports both:
     *   /storage/download/<encoded-key>
     *   https://<public-domain>/<key>
     */
    extractKeyFromUrl(url) {
        if (!url) return null;
        try {
            // Proxy download URL: /storage/download/<encoded-key>
            const proxyMatch = url.match(/\/storage\/download\/(.+)$/);
            if (proxyMatch) return decodeURIComponent(proxyMatch[1]);

            // Public R2 URL: https://<domain>/<key>
            const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
            if (publicBase && url.startsWith(publicBase)) {
                return url.slice(publicBase.length + 1);
            }

            return null;
        } catch {
            return null;
        }
    }
}

export const r2StorageService = new R2StorageService();
