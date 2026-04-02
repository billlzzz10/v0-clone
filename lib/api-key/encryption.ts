import crypto from 'crypto'

/**
 * Encryption service for storing API keys securely at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const AUTH_TAG_LENGTH = 16
const IV_LENGTH = 16
const SALT_LENGTH = 32

/**
 * Derives an encryption key from the master secret using PBKDF2
 */
function deriveKey(masterSecret: string, salt: Buffer): Buffer {
function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  if (masterSecret.length < 32) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be at least 32 characters')
  }

  return crypto.pbkdf2Sync(masterSecret, salt, 100_000, 32, 'sha256')
}

/**
 * Encrypts an API key using AES-256-GCM
 * Returns a base64-encoded string combining salt, IV, ciphertext, and auth tag
 */
export function encryptApiKey(apiKey: string): string {
  const masterSecret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!masterSecret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable not set')
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // Derive key from master secret
  const key = deriveKey(masterSecret, salt)

  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  // Combine salt + IV + ciphertext + auth tag, encode as base64
  const combined = Buffer.concat([salt, iv, Buffer.from(encrypted, 'hex'), authTag])
  return combined.toString('base64')
}

/**
 * Decrypts an API key encrypted with encryptApiKey()
 */
export function decryptApiKey(encryptedKey: string): string {
  const masterSecret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!masterSecret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable not set')
  }

  try {
    const combined = Buffer.from(encryptedKey, 'base64')

    // Extract salt, IV, ciphertext, and auth tag
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH, combined.length - AUTH_TAG_LENGTH)
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)

    // Derive key from master secret
    const key = deriveKey(masterSecret, salt)

    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Hashes an API key for comparison purposes (e.g., finding by key hash)
 * This is a one-way hash, not for retrieving the original key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}
