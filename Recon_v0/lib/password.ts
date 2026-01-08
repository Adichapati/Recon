// Password hashing utilities (no external deps).
// Uses Node.js built-in `crypto` with scrypt.

import crypto from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(crypto.scrypt)

export type PasswordRecord = {
  algo: "scrypt"
  params: { N: number; r: number; p: number; keyLen: number }
  saltB64: string
  hashB64: string
}

const DEFAULT_PARAMS: PasswordRecord["params"] = {
  // Reasonable baseline for server-side hashing; keep stable for verification.
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = crypto.randomBytes(16)
  const { N, r, p, keyLen } = DEFAULT_PARAMS

  const derived = (await scryptAsync(password, salt, keyLen, { N, r, p })) as Buffer

  return {
    algo: "scrypt",
    params: { N, r, p, keyLen },
    saltB64: salt.toString("base64"),
    hashB64: derived.toString("base64"),
  }
}

export async function verifyPassword(password: string, record: PasswordRecord): Promise<boolean> {
  if (!record || record.algo !== "scrypt") return false

  const salt = Buffer.from(record.saltB64, "base64")
  const expected = Buffer.from(record.hashB64, "base64")
  const { N, r, p, keyLen } = record.params

  const derived = (await scryptAsync(password, salt, keyLen, { N, r, p })) as Buffer

  // Constant-time compare to reduce timing leaks.
  if (derived.length !== expected.length) return false
  return crypto.timingSafeEqual(derived, expected)
}
