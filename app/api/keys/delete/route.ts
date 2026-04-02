import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { deleteApiKey } from '@/lib/api-key/queries'
import { ApiKeyError, logApiKeyError } from '@/lib/api-key/errors'

/**
 * POST /api/keys/delete
 * Deletes the user's API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new ApiKeyError('UNAUTHORIZED')
    }

    const deleteResult = await deleteApiKey(session.user.id)

    if (!deleteResult.success) {
      throw new ApiKeyError('DATABASE_ERROR', deleteResult.error)
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    })
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return error.toResponse()
    }

    logApiKeyError('UNKNOWN_ERROR', { endpoint: '/api/keys/delete' }, error as Error)

    return NextResponse.json(
      {
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      },
      { status: 500 },
    )
  }
}
