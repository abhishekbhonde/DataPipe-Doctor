import { randomBytes, createHash } from "node:crypto";

const PREFIX = "pdk_";

export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${PREFIX}${secret}`;
  return {
    plaintext,
    hashed: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(0, PREFIX.length + 6),
  };
}

export function hashApiKey(plaintext: string) {
  return createHash("sha256").update(plaintext).digest("hex");
}
