import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string
): Promise<boolean> {
  const [algorithm, salt, keyHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(expected, actual);
}
