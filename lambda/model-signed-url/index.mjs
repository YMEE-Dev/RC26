import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-north-1" });

const BUCKET_NAME = process.env.BUCKET_NAME;
const API_KEY = process.env.API_KEY;
const URL_EXPIRY_SECONDS = 30 * 60; // 30 minutes

// Comma-separated list of allowed origins.
// Supports ALLOWED_ORIGINS (preferred) or ALLOWED_ORIGIN (legacy single-value env var).
// A bare origin without a port (e.g. "http://localhost") also matches any port variant
// (e.g. "http://localhost:9292"), which enables local theme development.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGIN ?? "https://robertocoin.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return false;
  const lower = origin.toLowerCase();
  return ALLOWED_ORIGINS.some(
    (allowed) => lower === allowed || lower.startsWith(allowed + ":")
  );
}

function getCorsHeaders(origin) {
  // Echo back the requesting origin so browsers accept non-wildcard CORS responses.
  // Fall back to the first entry in the list for responses where origin may be absent.
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}

export const handler = async (event) => {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? "";

  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers: getCorsHeaders(origin), body: "" };
  }

  // Validate origin
  if (!isOriginAllowed(origin)) {
    return respond(403, { error: "Forbidden" }, origin);
  }

  // Validate API key
  const apiKey = event.headers?.["x-api-key"] ?? event.headers?.["X-Api-Key"] ?? "";
  if (!API_KEY || apiKey !== API_KEY) {
    return respond(401, { error: "Unauthorized" }, origin);
  }

  // Parse request body
  let modelId;
  try {
    const body = JSON.parse(event.body ?? "{}");
    modelId = body.model_id;
  } catch {
    return respond(400, { error: "Invalid request body" }, origin);
  }

  if (!modelId) {
    return respond(400, { error: "model_id is required" }, origin);
  }

  // Sanitize: only allow alphanumeric, hyphens (Shopify media ID format)
  const sanitized = String(modelId).replace(/[^a-z0-9-]/g, "");
  if (!sanitized || sanitized !== String(modelId)) {
    return respond(400, { error: "Invalid model_id" }, origin);
  }

  const s3Key = `models/${sanitized}.glb`;

  try {
    // Verify the file exists before generating a signed URL
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));

    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });

    return respond(200, { url: signedUrl }, origin);
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return respond(404, { error: "Model not found for this variant" }, origin);
    }
    console.error("Error generating signed URL:", error);
    return respond(500, { error: "Internal server error" }, origin);
  }
};

function respond(statusCode, body, origin) {
  return {
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify(body),
  };
}
