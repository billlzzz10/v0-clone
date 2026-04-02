import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getApiKeyInfo, hasValidApiKey } from '@/lib/api-key/queries'
import { ApiKeyError, logApiKeyError } from '@/lib/api-key/errors'

/**
 * GET /api/keys/status
 * Returns the current API key status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new ApiKeyError('UNAUTHORIZED')
    }

    const keyInfo = await getApiKeyInfo(session.user.id)
    const hasValid = await hasValidApiKey(session.user.id)

    if (!keyInfo) {
      throw new ApiKeyError('NOT_FOUND')
    }
    }

    return NextResponse.json({
      hasKey: !!keyInfo.source,
      isValid: hasValid,
      source: keyInfo.source,
      validatedAt: keyInfo.validatedAt,
      rotationDate: keyInfo.rotationDate,
      kgatewayUserId: keyInfo.kgatewayUserId,
    })
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return error.toResponse()
    }

    logApiKeyError('UNKNOWN_ERROR', { endpoint: '/api/keys/status' }, error as Error)

    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      },
      { status: 500 },
    )
  }
}
