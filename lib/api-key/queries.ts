import { db } from '@/lib/db/connection'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { encryptApiKey, decryptApiKey, hashApiKey } from './encryption'

/**
 * Database queries for API key management
 */

export interface ApiKeyInfo {
  source: 'kilogateway' | 'manual' | null
  validatedAt: Date | null
  rotationDate: Date | null
  kgatewayUserId: string | null
}

/**
 * Saves an API key for a user
 */
export async function saveApiKey(
  userId: string,
  apiKey: string,
  source: 'kilogateway' | 'manual',
): Promise<{ success: boolean; error?: string }> {
  try {
    const encryptedKey = encryptApiKey(apiKey)
    const now = new Date()

    await db
      .update(users)
      .set({
        api_key_encrypted: encryptedKey,
        api_key_source: source,
        api_key_validated_at: now,
        api_key_rotation_date: now,
      })
      .where(eq(users.id, userId))

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save API key',
    }
  }
}

/**
 * Retrieves and decrypts a user's API key
 */
export async function getApiKey(userId: string): Promise<string | null> {
  try {
    const user = await db.select({ api_key_encrypted: users.api_key_encrypted }).from(users).where(eq(users.id, userId)).limit(1)

    if (!user.length || !user[0].api_key_encrypted) {
      return null
    }

    return decryptApiKey(user[0].api_key_encrypted)
  } catch (error) {
    console.error('[API Key] Error retrieving API key:', error)
    return null
  }
}

/**
 * Gets API key info without decrypting the key
 */
export async function getApiKeyInfo(userId: string): Promise<ApiKeyInfo | null> {
  try {
    const user = await db
      .select({
        api_key_source: users.api_key_source,
        api_key_validated_at: users.api_key_validated_at,
        api_key_rotation_date: users.api_key_rotation_date,
        kilogateway_user_id: users.kilogateway_user_id,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user.length) {
      return null
    }

    const userData = user[0]
    return {
      source: (userData.api_key_source as 'kilogateway' | 'manual' | null) || null,
      validatedAt: userData.api_key_validated_at || null,
      rotationDate: userData.api_key_rotation_date || null,
      kgatewayUserId: userData.kilogateway_user_id || null,
    }
  } catch (error) {
    console.error('[API Key] Error retrieving API key info:', error)
    return null
  }
}

/**
 * Checks if a user has a valid API key
 */
export async function hasValidApiKey(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({ api_key_encrypted: users.api_key_encrypted, api_key_validated_at: users.api_key_validated_at })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user.length || !user[0].api_key_encrypted) {
      return false
    }

    // Check if key was validated recently (within last 30 days)
    if (user[0].api_key_validated_at) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return user[0].api_key_validated_at > thirtyDaysAgo
    }

    return false
  } catch (error) {
    console.error('[API Key] Error checking valid API key:', error)
    return false
  }
}

/**
 * Updates API key validation timestamp (e.g., after successful API call)
 */
export async function updateApiKeyValidation(userId: string): Promise<void> {
  try {
    await db
      .update(users)
      .set({
        api_key_validated_at: new Date(),
      })
      .where(eq(users.id, userId))
  } catch (error) {
    console.error('[API Key] Error updating validation timestamp:', error)
  }
}

/**
 * Rotates/replaces a user's API key
 */
export async function rotateApiKey(userId: string, newApiKey: string, source: 'kilogateway' | 'manual'): Promise<{ success: boolean; error?: string }> {
  try {
    const encryptedKey = encryptApiKey(newApiKey)
    const now = new Date()

    await db
      .update(users)
      .set({
        api_key_encrypted: encryptedKey,
        api_key_source: source,
        api_key_validated_at: now,
        api_key_rotation_date: now,
      })
      .where(eq(users.id, userId))

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rotate API key',
    }
  }
}

/**
 * Deletes a user's API key
 */
export async function deleteApiKey(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        api_key_encrypted: null,
        api_key_source: null,
        api_key_validated_at: null,
        api_key_rotation_date: null,
      })
      .where(eq(users.id, userId))

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete API key',
    }
  }
}

/**
 * Links a Kilogateway user ID to an account
 */
export async function setKilogatewayUserId(userId: string, kgatewayUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(users).set({ kilogateway_user_id: kgatewayUserId }).where(eq(users.id, userId))

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link Kilogateway user',
    }
  }
}
