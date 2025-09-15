import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
});

export async function putBuffer(bucket: string, key: string, buf: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buf,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

export async function presign(bucket: string, key: string, seconds = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: seconds });
}
