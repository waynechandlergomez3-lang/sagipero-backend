import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';
const AWS_KEY = process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// If S3 credentials are present and a bucket is configured, use S3. Otherwise fall back to local disk storage.
const useS3 = Boolean(BUCKET_NAME && AWS_KEY && AWS_SECRET);

let s3Client: S3Client | null = null;
if (useS3) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_KEY,
      secretAccessKey: AWS_SECRET
    }
  });
}

/**
 * Uploads a file to S3 (if configured) or writes to local uploads/ for development.
 * Returns a public URL (or local server URL) that can be used to preview the file.
 */
export const upload = async (file: UploadedFile): Promise<string> => {
  try {
    const fileExtension = path.extname(file.originalname) || '';
    const fileName = `${crypto.randomUUID()}${fileExtension}`;

    if (useS3 && s3Client) {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'private'
        }
      });

      await upload.done();
      return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
    }

    // Local disk fallback
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const destPath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(destPath, file.buffer);

    // Use environment variable or fallback to localhost for development
    const base = process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' 
      ? `https://your-app-name.onrender.com` 
      : `http://localhost:${process.env.PORT || '8080'}`);
    return `${base}/uploads/${fileName}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};
