import { Router } from 'express';
import multer from 'multer';
import Archiver from 'archiver';
import { ffmpeg } from '../lib/ffmpeg.js';
import { bufferToStream, collectStream, timestamps, mimeFor } from '../lib/utils.js';
import { putBuffer, presign } from '../lib/s3.js';

const router = Router();

const maxUpload = Number(process.env.MAX_UPLOAD_BYTES ?? 209715200); // 200MB default
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUpload },
  fileFilter: (_req, file, cb) => {
    // Allow only video/* mimetypes
    if (file.mimetype && file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Unsupported file type. Please upload a video.'));
  }
});

const BUCKET = process.env.S3_BUCKET!;
const PREFIX = process.env.S3_PREFIX ?? 'frames';

router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: 'S3_BUCKET not configured' });
    if (!req.file) return res.status(400).json({ error: 'Upload a video using field "video"' });

    const q = req.query as Record<string, string | undefined>;
    const intervalSeconds = Math.max(1, Number(q.intervalSeconds ?? '2'));
    const format = (q.format ?? 'jpg').toLowerCase(); // jpg|png|webp
    const quality = Math.min(31, Math.max(1, Number(q.quality ?? (format === 'jpg' ? 2 : 2))));
    const wantZip = q.zip === '1';

    // Probe duration
    const durationSec = await new Promise<number>((resolve, reject) => {
      ffmpeg().input(bufferToStream(req.file!.buffer)).ffprobe((err: any, data: any) => {
        if (err) return reject(err);
        const dur = data.format.duration ?? 0;
        resolve(Math.floor(dur));
      });
    });

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';
    const contentType = mimeFor(ext);

    const points = timestamps(durationSec, intervalSeconds);
    if (points.length === 0) points.push(0);

    if (wantZip) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${jobId}-frames.zip"`);
      const archive = Archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (e: any) => res.status(500).end(`zip error: ${e.message}`));
      archive.pipe(res);

      for (let i = 0; i < points.length; i++) {
        const t = points[i];
        const fileName = `frame-${String(i + 1).padStart(6, '0')}.${ext}`;
        const key = `${PREFIX}/${jobId}/${fileName}`;
        const frameBuf = await extractFrameBuffer(req.file!.buffer, t, ext as any, quality);
        await putBuffer(BUCKET, key, frameBuf, contentType);
        archive.append(frameBuf, { name: fileName });
      }
      archive.finalize();
      return;
    }

    // Normal mode: upload and presign
    const urls: string[] = [];
    for (let i = 0; i < points.length; i++) {
      const t = points[i];
      const fileName = `frame-${String(i + 1).padStart(6, '0')}.${ext}`;
      const key = `${PREFIX}/${jobId}/${fileName}`;
      const frameBuf = await extractFrameBuffer(req.file!.buffer, t, ext as any, quality);
      await putBuffer(BUCKET, key, frameBuf, contentType);
      const url = await presign(BUCKET, key, 3600);
      urls.push(url);
    }

    res.json({ jobId, frames: urls, count: urls.length });
  } catch (err: any) {
    if (String(err?.message || '').includes('File too large')) {
      return res.status(413).json({ error: `File too large. Max ${maxUpload} bytes.` });
    }
    console.error(err);
    res.status(500).json({ error: err?.message ?? 'Failed to process video' });
  }
});

export default router;

async function extractFrameBuffer(videoBuf: Buffer, atSec: number, ext: 'jpg'|'png'|'webp', quality: number) {
  const fmt = 'image2pipe';
  const codec = ext === 'png' ? 'png' : (ext === 'webp' ? 'webp' : 'mjpeg');

  return new Promise<Buffer>((resolve, reject) => {
    const cmd = ffmpeg(bufferToStream(videoBuf))
      .inputOptions(['-hide_banner', '-ss', String(atSec)])
      .outputOptions(['-frames:v', '1'])
      .outputOptions(ext === 'jpg' ? ['-qscale:v', String(quality)] : [])
      .videoCodec(codec)
      .format(fmt)
      .on('error', reject);

    const stream = cmd.pipe();
    collectStream(stream as any).then(resolve).catch(reject);
  });
}
