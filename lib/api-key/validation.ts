/**
 * API Key validation service for testing against Kilogateway
 * Validates that an API key is properly formatted and works with the Kilo AI Gateway
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
  message?: string
  validatedAt?: Date
}

const KILOGATEWAY_BASE_URL = 'https://api.kilo.ai/api/gateway'
const VALIDATION_TIMEOUT = 10000 // 10 seconds

/**
 * Validates an API key format (basic checks)
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // Kilogateway keys typically start with 'kilo_' or similar prefix
  // At minimum, check that it's a non-empty string
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return false
  }

  // Check minimum length (adjust based on actual Kilogateway key format)
  if (apiKey.trim().length < 20) {
    return false
  }

  return true
}

/**
 * Tests an API key against Kilogateway by making a lightweight API call
 * This validates that the key is actually working before storing it
 */
export async function validateApiKeyWithKilogateway(apiKey: string): Promise<ValidationResult> {
  // First, validate format
  if (!validateApiKeyFormat(apiKey)) {
    return {
      isValid: false,
      error: 'INVALID_FORMAT',
      message: 'API key format is invalid. Please check your key and try again.',
    }
  }

  try {
    // Make a simple request to Kilogateway to test the key
    // Using /models endpoint which is lightweight and doesn't consume credits
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT)

    const response = await fetch(`${KILOGATEWAY_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return {
        isValid: true,
        message: 'API key validated successfully',
        validatedAt: new Date(),
      }
    }

    // Handle different error scenarios
    if (response.status === 401) {
      return {
        isValid: false,
        error: 'INVALID_KEY',
        message: 'The API key is invalid or expired. Please generate a new key from your Kilogateway account.',
      }
    }

    if (response.status === 403) {
      return {
        isValid: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Your API key does not have the required permissions.',
      }
    }

    if (response.status === 429) {
      return {
        isValid: false,
        error: 'RATE_LIMITED',
        message: 'Too many validation attempts. Please try again later.',
      }
    }

    if (response.status >= 500) {
      return {
        isValid: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Kilogateway service is temporarily unavailable. Please try again later.',
      }
    }

    return {
      isValid: false,
      error: 'VALIDATION_FAILED',
      message: `Validation failed with status ${response.status}. Please check your API key.`,
    }
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isValid: false,
          error: 'TIMEOUT',
          message: 'Validation request timed out. Please check your network connection and try again.',
        }
      }

      if (error.message.includes('fetch')) {
        return {
          isValid: false,
          error: 'NETWORK_ERROR',
          message: 'Network error during validation. Please check your connection and try again.',
        }
      }
    }

    return {
      isValid: false,
      error: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred during validation. Please try again.',
    }
  }
}

/**
 * Rate limiter for API key validation attempts
 * Prevents brute-force attacks by limiting validation attempts per IP/user
 */
const validationAttempts = new Map<string, { count: number; resetTime: number }>()
const MAX_ATTEMPTS = 5
const RESET_WINDOW = 15 * 60 * 1000 // 15 minutes

export function checkValidationRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now()
  const attempt = validationAttempts.get(identifier)

  if (!attempt || now > attempt.resetTime) {
    // Reset or first attempt
    validationAttempts.set(identifier, { count: 1, resetTime: now + RESET_WINDOW })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 }
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0 }
  }

  attempt.count++
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempt.count }
}

/**
 * Resets validation rate limit for a user (e.g., after successful validation)
 */
export function resetValidationRateLimit(identifier: string): void {
  validationAttempts.delete(identifier)
}
