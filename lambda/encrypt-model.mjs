/**
 * Encrypts a .glb file using the same AES-GCM logic as webgi-loader.js.
 *
 * Usage:
 *   node lambda/encrypt-model.mjs <password> <input.glb> [output.glb]
 *
 * The password must match the `encrypted_password` value in the
 * ijewel3d_settings shop metafield.
 *
 * Output format: 12-byte random IV || AES-GCM ciphertext (with 128-bit auth tag)
 * This matches the decryption in decryptAesGcmPayload() in webgi-loader.js.
 */

import { webcrypto } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const { subtle, getRandomValues } = webcrypto;

const [, , password, inputPath, outputPath] = process.argv;

if (!password || !inputPath) {
  console.error("Usage: node encrypt-model.mjs <password> <input.glb> [output.glb]");
  process.exit(1);
}

// Mirrors getAesKeyBytes() in webgi-loader.js exactly:
// 1. Try base64 decode — if result is 16/24/32 bytes use it directly as AES key
// 2. Try UTF-8 encode  — if result is 16/24/32 bytes use it directly as AES key
// 3. Fall back to SHA-256 of the UTF-8 encoded password → 32-byte key
async function getAesKeyBytes(value) {
  // Step 1: try base64
  try {
    const rawKey = Buffer.from(value, "base64");
    if (rawKey.length === 16 || rawKey.length === 24 || rawKey.length === 32) {
      return new Uint8Array(rawKey);
    }
  } catch {}

  // Step 2: try raw UTF-8
  const textBytes = new TextEncoder().encode(value);
  if (textBytes.length === 16 || textBytes.length === 24 || textBytes.length === 32) {
    return textBytes;
  }

  // Step 3: SHA-256 hash
  const digest = await subtle.digest("SHA-256", textBytes);
  return new Uint8Array(digest);
}

async function encryptGlb(password, inputPath, outputPath) {
  const plaintext = readFileSync(resolve(inputPath));
  console.log(`Input:  ${inputPath} (${plaintext.length} bytes)`);

  const keyBytes = await getAesKeyBytes(password);
  const cryptoKey = await subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);

  const iv = getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, cryptoKey, plaintext);

  // Output: 12-byte IV prepended to ciphertext (matches webgi-loader.js decryption)
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);

  const out = outputPath ?? inputPath;
  writeFileSync(resolve(out), result);
  console.log(`Output: ${out} (${result.length} bytes)`);
  console.log("Done. Upload the output file to S3 at the same key path.");
}

encryptGlb(password, inputPath, outputPath).catch((err) => {
  console.error("Encryption failed:", err);
  process.exit(1);
});
