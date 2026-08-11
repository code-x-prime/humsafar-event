import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as settings from '../config/settings.service.js';
import { ERROR_CODES } from '../config/constants.js';

function notConfiguredError() {
  const err = new Error('Cloudflare R2 is not configured. Add credentials in Settings → Storage.');
  err.status = 503;
  err.code = ERROR_CODES.NOT_CONFIGURED;
  return err;
}

function getConfig() {
  const cfg = settings.getGroup('STORAGE');
  if (!cfg.accountId || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
    return null;
  }
  return cfg;
}

let client = null;
let cachedAccountId = null;

function getClient() {
  const cfg = getConfig();
  if (!cfg) throw notConfiguredError();

  if (!client || cachedAccountId !== cfg.accountId) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
    cachedAccountId = cfg.accountId;
  }

  return { client, bucket: cfg.bucket, publicUrl: cfg.publicUrl };
}

export async function testConnection() {
  // TODO: implement real put→get→delete of a tiny object once media upload flow exists.
  getClient();
  return { ok: true };
}

// Returns a presigned PUT URL the browser can upload directly to, plus the
// public URL the object will be reachable at once uploaded.
export async function getPresignedUploadUrl({ key, contentType }) {
  const { client, bucket, publicUrl } = getClient();

  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  const base = publicUrl ? publicUrl.replace(/\/$/, '') : null;
  if (!base) throw notConfiguredError();

  return { uploadUrl, publicUrl: `${base}/${key}` };
}

export async function deleteObject(key) {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// Server-proxy upload: the admin UI sends the file to us (multer, in-memory)
// and we PUT it to R2 ourselves. Used instead of the presigned-direct-upload
// flow above because R2 buckets need an explicit CORS policy for browser-direct
// PUTs, which isn't configured on this bucket — proxying avoids that entirely.
export async function uploadObject({ key, contentType, body }) {
  const { client, bucket, publicUrl } = getClient();

  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, Body: body }));

  const base = publicUrl ? publicUrl.replace(/\/$/, '') : null;
  if (!base) throw notConfiguredError();

  return { publicUrl: `${base}/${key}` };
}

export { getClient as getR2Client };
