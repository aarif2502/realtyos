import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const iterations = 210000;
const keyLength = 32;
const digest = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationValue, salt, hash] = storedHash.split(":");

  if (algorithm !== "pbkdf2" || !iterationValue || !salt || !hash) {
    return false;
  }

  const actual = pbkdf2Sync(password, salt, Number(iterationValue), keyLength, digest);
  const expected = Buffer.from(hash, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
