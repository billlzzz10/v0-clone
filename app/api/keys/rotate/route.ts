import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { validateApiKeyWithKilogateway, checkValidationRateLimit, resetValidationRateLimit } from '@/lib/api-key/validation'
import { rotateApiKey, getApiKeyInfo } from '@/lib/api-key/queries'
import { ApiKeyError, logApiKeyError } from '@/lib/api-key/errors'

/**
 * POST /api/keys/rotate
 * Rotates the user's API key by replacing it with a new one
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new ApiKeyError('UNAUTHORIZED')
    }

    const body = await request.json()
    const newApiKey =
      typeof body === 'object' && body !== null
        ? (body as { newApiKey?: unknown }).newApiKey
        : undefined

    if (!newApiKey || typeof newApiKey !== 'string' || newApiKey.trim().length === 0) {
      throw new ApiKeyError('INVALID_FORMAT', 'New API key is required')
    }

    const normalizedApiKey = newApiKey.trim()

    // Check rate limiting
    const rateLimit = checkValidationRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      throw new ApiKeyError('RATE_LIMITED')
    }

    // Validate the new API key
    const validationResult = await validateApiKeyWithKilogateway(normalizedApiKey)

    if (!validationResult.isValid) {
      logApiKeyError(validationResult.error as any, { userId: session.user.id })
      
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          message: validationResult.message,
        },
        { status: 400 },
      )
    }

    // Rotate the key
    const rotateResult = await rotateApiKey(session.user.id, newApiKey, 'manual')

    if (!rotateResult.success) {
      throw new ApiKeyError('DATABASE_ERROR', rotateResult.error)
    }

    // Reset rate limit on successful validation
    resetValidationRateLimit(session.user.id)

    // Get updated key info
    const keyInfo = await getApiKeyInfo(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'API key rotated successfully',
      keyInfo,
    })
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return error.toResponse()
    }

    logApiKeyError('UNKNOWN_ERROR', { endpoint: '/api/keys/rotate' }, error as Error)

    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      },
      { status: 500 },
    )
  }
}
