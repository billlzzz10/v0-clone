import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { validateApiKeyWithKilogateway, checkValidationRateLimit, resetValidationRateLimit } from '@/lib/api-key/validation'
import { saveApiKey, getApiKeyInfo } from '@/lib/api-key/queries'
import { ApiKeyError, logApiKeyError } from '@/lib/api-key/errors'

/**
 * POST /api/keys/validate
 * Validates an API key against Kilogateway and saves it if valid
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new ApiKeyError('UNAUTHORIZED')
    }

    const { apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== 'string') {
      throw new ApiKeyError('INVALID_FORMAT', 'API key is required')
    }

    // Check rate limiting
    const rateLimit = checkValidationRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      throw new ApiKeyError('RATE_LIMITED')
    }

    // Validate the API key
    const validationResult = await validateApiKeyWithKilogateway(apiKey)

    if (!validationResult.isValid) {
      logApiKeyError(validationResult.error as any, { userId: session.user.id })
      
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error,
          message: validationResult.message,
          remainingAttempts: rateLimit.remainingAttempts,
        },
        { status: 400 },
      )
    }

    // Save the API key
    const saveResult = await saveApiKey(session.user.id, apiKey, 'manual')

    if (!saveResult.success) {
      throw new ApiKeyError('DATABASE_ERROR', saveResult.error)
    }

    // Reset rate limit on successful validation
    resetValidationRateLimit(session.user.id)

    // Get updated key info
    const keyInfo = await getApiKeyInfo(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'API key validated and saved successfully',
      keyInfo,
    })
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return error.toResponse()
    }

    logApiKeyError('UNKNOWN_ERROR', { endpoint: '/api/keys/validate' }, error as Error)
    
    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 },
    )
  }
}
