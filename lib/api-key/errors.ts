/**
 * Error handling utilities for API key operations
 * Provides user-friendly error messages and remediation steps
 */

export type ApiKeyErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_KEY'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ENCRYPTION_ERROR'
  | 'DATABASE_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR'

export interface ApiKeyErrorInfo {
  code: ApiKeyErrorCode
  userMessage: string
  technicalMessage: string
  remediationSteps: string[]
  httpStatus: number
}

const ERROR_CATALOG: Record<ApiKeyErrorCode, ApiKeyErrorInfo> = {
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    userMessage: 'The API key format is invalid. Please check the key and try again.',
    technicalMessage: 'API key does not meet format requirements',
    remediationSteps: [
      'Check that you copied the entire API key from Kilogateway',
      'Ensure there are no extra spaces or line breaks',
      'Generate a new API key if the current one is corrupted',
    ],
    httpStatus: 400,
  },

  INVALID_KEY: {
    code: 'INVALID_KEY',
    userMessage: 'The API key is invalid or expired. Please generate a new one from your Kilogateway account.',
    technicalMessage: 'API key validation failed with 401 Unauthorized',
    remediationSteps: [
      'Log in to your Kilogateway account',
      'Navigate to API Keys section',
      'Generate a new API key',
      'Update the key in your account settings',
    ],
    httpStatus: 401,
  },

  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    userMessage: 'Your API key does not have the required permissions for this operation.',
    technicalMessage: 'API key lacks required permissions (403 Forbidden)',
    remediationSteps: [
      'Check your Kilogateway account permissions',
      'Ensure your API key has access to the required services',
      'Contact Kilogateway support if permissions are missing',
    ],
    httpStatus: 403,
  },

  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    userMessage: 'Too many validation attempts. Please try again in 15 minutes.',
    technicalMessage: 'Rate limit exceeded for API key validation',
    remediationSteps: [
      'Wait 15 minutes before attempting validation again',
      'Check your API key format carefully before retrying',
      'Contact support if you continue to experience issues',
    ],
    httpStatus: 429,
  },

  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    userMessage: 'Kilogateway service is temporarily unavailable. Please try again later.',
    technicalMessage: 'Kilogateway API returned 5xx error',
    remediationSteps: [
      'Check Kilogateway status page for service incidents',
      'Try again in a few minutes',
      'Contact Kilogateway support if the issue persists',
    ],
    httpStatus: 503,
  },

  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    userMessage: 'Network error during validation. Please check your connection and try again.',
    technicalMessage: 'Network request failed during API key validation',
    remediationSteps: [
      'Check your internet connection',
      'Verify firewall/proxy settings are not blocking connections',
      'Try again from a different network if possible',
    ],
    httpStatus: 503,
  },

  TIMEOUT: {
    code: 'TIMEOUT',
    userMessage: 'Validation request timed out. Please check your connection and try again.',
    technicalMessage: 'API key validation request exceeded timeout threshold',
    remediationSteps: [
      'Check your internet connection speed',
      'Verify you can reach kilogateway.ai',
      'Try again in a few moments',
    ],
    httpStatus: 504,
  },

  ENCRYPTION_ERROR: {
    code: 'ENCRYPTION_ERROR',
    userMessage: 'Failed to encrypt your API key. Please try again.',
    technicalMessage: 'Encryption operation failed - missing or invalid encryption secret',
    remediationSteps: [
      'Ensure API_KEY_ENCRYPTION_SECRET environment variable is set',
      'Contact support if the problem persists',
    ],
    httpStatus: 500,
  },

  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    userMessage: 'Failed to save your API key. Please try again.',
    technicalMessage: 'Database operation failed',
    remediationSteps: [
      'Try again in a few moments',
      'Contact support if the problem persists',
    ],
    httpStatus: 500,
  },

  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    userMessage: 'You must be logged in to manage API keys.',
    technicalMessage: 'User is not authenticated',
    remediationSteps: ['Log in to your account', 'Try again after authentication'],
    httpStatus: 401,
  },

  NOT_FOUND: {
    code: 'NOT_FOUND',
    userMessage: 'API key not found.',
    technicalMessage: 'API key does not exist for this user',
    remediationSteps: ['Add an API key in your account settings'],
    httpStatus: 404,
  },

  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: 'Unknown error during API key operation',
    remediationSteps: [
      'Try the operation again',
      'Contact support if the issue persists',
    ],
    httpStatus: 500,
  },
}

/**
 * Gets error information by code
 */
export function getApiKeyError(code: ApiKeyErrorCode): ApiKeyErrorInfo {
  return ERROR_CATALOG[code] || ERROR_CATALOG.UNKNOWN_ERROR
}

/**
 * Creates a user-friendly error response
 */
export function createApiKeyErrorResponse(
  code: ApiKeyErrorCode,
  details?: string,
): { error: string; message: string; details?: string } {
  const errorInfo = getApiKeyError(code)
  return {
    error: code,
    message: errorInfo.userMessage,
    ...(details && { details }),
  }
}

/**
 * Logs error with appropriate level
 */
export function logApiKeyError(
  code: ApiKeyErrorCode,
  context: Record<string, any>,
  error?: Error,
): void {
  const errorInfo = getApiKeyError(code)

  const logData = {
    timestamp: new Date().toISOString(),
    code,
    technicalMessage: errorInfo.technicalMessage,
    context,
    errorStack: error?.stack,
  }

  // Sanitize context to never log actual API keys
  const sanitized = { ...logData.context }
  if ('apiKey' in sanitized) {
    delete sanitized.apiKey
  }
  if ('api_key' in sanitized) {
    delete sanitized.api_key
  }

  console.error('[API Key Error]', sanitized)
}

/**
 * Validates error code is defined
 */
export function isValidApiKeyErrorCode(code: unknown): code is ApiKeyErrorCode {
  return typeof code === 'string' && code in ERROR_CATALOG
}

/**
 * Class for API key-specific errors
 */
export class ApiKeyError extends Error {
  code: ApiKeyErrorCode
  remediationSteps: string[]
  httpStatus: number

  constructor(code: ApiKeyErrorCode, details?: string) {
    const errorInfo = getApiKeyError(code)
    super(details || errorInfo.technicalMessage)
    this.name = 'ApiKeyError'
    this.code = code
    this.remediationSteps = errorInfo.remediationSteps
    this.httpStatus = errorInfo.httpStatus
  }

  toJSON() {
    const errorInfo = getApiKeyError(this.code)
    return {
      error: this.code,
      message: errorInfo.userMessage,
      remediationSteps: this.remediationSteps,
    }
  }

  toResponse() {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.httpStatus,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
