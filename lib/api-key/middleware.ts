/**
 * Middleware and guards for API key operations
 * Provides authentication, authorization, and error handling
 */

import { auth } from '@/app/(auth)/auth'
import { ApiKeyError } from './errors'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Ensures user is authenticated
 * Call this at the beginning of protected route handlers
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new ApiKeyError('UNAUTHORIZED')
  }

  return session
}

/**
 * Wraps a route handler with error handling
 */
export function withApiKeyErrorHandler(
  handler: (request: NextRequest) => Promise<Response>,
) {
  return async (request: NextRequest) => {
    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof ApiKeyError) {
        return error.toResponse()
      }

      if (error instanceof Error) {
        console.error('[API Key Route Error]', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })

        // Don't expose internal error details to client
        return NextResponse.json(
          {
            error: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred. Please try again.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred.',
        },
        { status: 500 },
      )
    }
  }
}

/**
 * Validates request body has required fields
 */
export function validateRequestBody<T extends Record<string, any>>(
  body: unknown,
  requiredFields: (keyof T)[],
): T {
  if (!body || typeof body !== 'object') {
    throw new ApiKeyError('INVALID_FORMAT', 'Invalid request body')
  }

  const typedBody = body as Record<string, any>

  for (const field of requiredFields) {
    if (!(field in typedBody) || typedBody[field] === undefined) {
      throw new ApiKeyError('INVALID_FORMAT', `Missing required field: ${String(field)}`)
    }
  }

  return typedBody as T
}

/**
 * Safe JSON parsing with error handling
 */
export async function safeJsonParse<T>(
  request: NextRequest,
): Promise<T> {
  try {
    return await request.json()
  } catch (error) {
    throw new ApiKeyError('INVALID_FORMAT', 'Invalid JSON in request body')
  }
}
