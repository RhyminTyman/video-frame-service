# Video Frame Service (Secure, No-Disk)

A hardened Express + TypeScript web service that accepts a mobile video upload and returns image frames every N seconds,
**without writing to local disk**. Frames are generated in memory by FFmpeg and uploaded to **Amazon S3**. The API supports
**API key** auth (constant-time compare), optional **HMAC** request signatures to prevent replay, **rate limiting**, **CORS**,
and **security headers** via Helmet.

## Features

- Memory-only processing (no local file persistence)
- Extract frames at interval: `?intervalSeconds=2&format=jpg|png|webp&quality=2`
- Upload each frame to S3, return **pre-signed URLs** or an optional **ZIP** stream
- API key auth (`x-api-key`), optional HMAC (`x-key-id`, `x-timestamp`, `x-signature`)
- Helmet, CORS, morgan logs, rate limit, strict multer limits & MIME filtering
- Ready for Docker / container runtime

## Quick Start

```bash
# 1) Install deps
pnpm install

# 2) Copy and edit environment
cp .env.example .env
# set AWS creds, S3_BUCKET, API_KEYS, etc.

# 3) Run in dev (hot reload)
pnpm dev

# or build & run
pnpm build
pnpm start
```

Service runs at `http://localhost:${PORT:-3001}`.

### Test with curl (API key only)

```bash
curl -F "video=@/path/to/clip.mp4"   -H "x-api-key: dev_key_123"   "http://localhost:3001/api/frames?intervalSeconds=2&format=jpg"
```

### Test with ZIP response

```bash
curl -L -o frames.zip -F "video=@/path/to/clip.mp4"   -H "x-api-key: dev_key_123"   "http://localhost:3001/api/frames?intervalSeconds=2&format=jpg&zip=1"
```

## HMAC Signing (Optional but Stronger)

Add a signing key to `.env`:

```
SIGNING_KEYS=keyid1:supersecret1
```

Client must send:
- `x-key-id: keyid1`
- `x-timestamp: <seconds since epoch>`
- `x-signature: <base64 HMAC-SHA256 over canonical string>`

Canonical string:
```
METHOD + "\n" + PATH_WITH_QUERY + "\n" + TIMESTAMP + "\n" + CONTENT_LENGTH
```

**Example generation (Node):**
```ts
import crypto from "crypto";
const keyId = "keyid1";
const secret = "supersecret1";
const method = "POST";
const pathWithQuery = "/api/frames?intervalSeconds=2&format=jpg";
const timestamp = Math.floor(Date.now()/1000).toString();
const contentLength = "<bytes>"; // total body size in bytes

const canonical = [method, pathWithQuery, timestamp, contentLength].join("\n");
const signature = crypto.createHmac("sha256", secret).update(canonical).digest("base64");

// headers:
{
  "x-api-key": "dev_key_123",
  "x-key-id": keyId,
  "x-timestamp": timestamp,
  "x-signature": signature
}
```

> Browser clients might not know `Content-Length` in advance for multipart. In that case, consider issuing a short-lived
> server-generated **upload ticket** containing a `nonce` and `expires`. Change the canonical to include that nonce instead
> of `Content-Length`, then validate the nonce server-side (not included here to keep the sample concise).

## Environment

See `.env.example`. Required:
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `API_KEYS`
- Optional: `SIGNING_KEYS` + `SIGNING_MAX_SKEW`

## Docker

```bash
docker build -t video-frame-service-secure .
docker run --rm -p 3001:3001 --env-file .env video-frame-service-secure
```

## Endpoints

- `POST /api/frames?intervalSeconds=&format=&quality=&zip=`
  - multipart form-data field: **`video`**
  - returns `{ jobId, frames: string[], count }` or a ZIP stream
- `GET /health`

## Hardening Notes

- The server enforces:
  - API key auth (required)
  - Optional HMAC signatures
  - Rate limiting (per-IP)
  - Strict CORS (set `CORS_ORIGIN` in prod)
  - Helmet headers
  - Multer upload **size limit** & **video/* MIME filter**
- Rotate API and signing keys periodically.
- Consider IP allowlisting if only your Next.js app will call this.
- For heavy workloads, scale horizontally and use a shared S3 bucket or queueing system.
