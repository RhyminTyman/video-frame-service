import { Readable } from 'node:stream';

export function bufferToStream(buf: Buffer) {
  return Readable.from(buf);
}

export async function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as NodeJS.ReadableStream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export function timestamps(durationSec: number, stepSec: number) {
  const arr: number[] = [];
  for (let t = 0; t <= durationSec + 1e-6; t += stepSec) arr.push(Math.floor(t));
  return arr;
}

export function mimeFor(ext: string) {
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
}
