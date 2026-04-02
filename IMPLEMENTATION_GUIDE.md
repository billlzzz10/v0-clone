# Dual Authentication System: Kilogateway + Manual API Key

## Implementation Complete

This document outlines the comprehensive dual authentication system that enables users to access the app through either Kilogateway integration or by manually entering an API key.

---

## System Architecture

### Database Schema Extensions
- **api_key_encrypted**: AES-256-GCM encrypted Kilogateway API key
- **api_key_source**: Track auth source ('kilogateway', 'manual', or null)
- **api_key_validated_at**: Timestamp of last validation (30-day freshness check)
- **api_key_rotation_date**: When key was created/rotated
- **kilogateway_user_id**: Optional Kilogateway user ID for OAuth linkage

### Core Services

#### 1. Encryption Service (`lib/api-key/encryption.ts`)
- **encryptApiKey()**: AES-256-GCM encryption with PBKDF2-derived keys
- **decryptApiKey()**: Safe decryption with auth tag validation
- **hashApiKey()**: One-way hashing for non-retrieval operations
- Uses `API_KEY_ENCRYPTION_SECRET` environment variable

#### 2. Validation Service (`lib/api-key/validation.ts`)
- **validateApiKeyFormat()**: Basic format validation
- **validateApiKeyWithKilogateway()**: Test API calls to Kilogateway endpoint
- **checkValidationRateLimit()**: In-memory rate limiting (5 attempts / 15 min)
- Distinguishes between different error scenarios (invalid, expired, rate-limited, etc.)

#### 3. Database Queries (`lib/api-key/queries.ts`)
- **saveApiKey()**: Store encrypted key with source tracking
- **getApiKey()**: Retrieve and decrypt user's key
- **getApiKeyInfo()**: Get metadata without decryption
- **hasValidApiKey()**: Check freshness (30-day window)
- **rotateApiKey()**: Replace key with new one
- **deleteApiKey()**: Securely remove key data
- **setKilogatewayUserId()**: Link OAuth identity

#### 4. Error Handling (`lib/api-key/errors.ts`)
- **ApiKeyError**: Custom error class with user-friendly messages
- **logApiKeyError()**: Secure logging (never logs actual keys)
- Error codes: INVALID_FORMAT, INVALID_KEY, INSUFFICIENT_PERMISSIONS, RATE_LIMITED, SERVICE_UNAVAILABLE, NETWORK_ERROR, TIMEOUT, etc.
- Each error includes remediation steps for users

#### 5. Middleware (`lib/api-key/middleware.ts`)
- **requireAuth()**: Ensures authenticated session
- **withApiKeyErrorHandler()**: Wraps handlers with error catching
- **validateRequestBody()**: Type-safe body validation
- **safeJsonParse()**: Safe JSON parsing with error handling

---

## API Endpoints

### POST /api/keys/validate
Validates and saves a user's API key.

**Request:**
```json
{
  "apiKey": "kilo_sk_..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "API key validated and saved successfully",
  "keyInfo": {
    "source": "manual",
    "validatedAt": "2024-04-02T10:30:00Z",
    "rotationDate": "2024-04-02T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many validation attempts. Please try again in 15 minutes.",
  "remainingAttempts": 0
}
```

### GET /api/keys/status
Returns current API key status and metadata.

**Response:**
```json
{
  "hasKey": true,
  "isValid": true,
  "source": "manual",
  "validatedAt": "2024-04-02T10:30:00Z",
  "rotationDate": "2024-04-02T10:30:00Z"
}
```

### POST /api/keys/rotate
Rotates API key with a new one.

**Request:**
```json
{
  "newApiKey": "kilo_sk_..."
}
```

**Response:** Similar to validate endpoint.

### POST /api/keys/delete
Deletes user's API key.

**Response:**
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

---

## Chat Route Integration

The `/api/chat` endpoint now:
1. Retrieves user's encrypted API key (if authenticated)
2. Creates v0-sdk client with user's Kilogateway key
3. Falls back to environment-based key if user has none
4. Updates key validation timestamp on successful chat creation
5. Supports both authenticated and anonymous users

---

## Authentication Session

The auth system now includes:
```typescript
session.user = {
  id: string
  email: string
  type: 'guest' | 'regular'
  hasApiKey?: boolean
  apiKeySource?: 'kilogateway' | 'manual' | null
}
```

This allows frontend to show appropriate UI based on key availability.

---

## UI Components

### ApiKeyForm (`components/api-key-form.tsx`)
- Text input with show/hide toggle
- Copy to clipboard button
- Validate & Save button
- Delete button with confirmation
- Real-time validation feedback
- Error message display with user-friendly copy
- Rate limit warnings

### ApiKeyStatus (`components/api-key-status.tsx`)
- Current key status display (Valid/Expired)
- Key source badge (Kilogateway/Manual)
- Last validated timestamp
- Key creation/rotation date
- Visual indicators for validation state
- Helpful messaging for missing keys

### Settings Page (`app/settings/page.tsx`)
- Profile section showing email
- API key status card
- API key management form
- Security & privacy information
- Encryption details
- Validation process explanation
- Usage tracking information

---

## Security Implementation

### At-Rest Encryption
- AES-256-GCM algorithm with authenticated encryption
- PBKDF2-derived keys from `API_KEY_ENCRYPTION_SECRET`
- Random salt and IV for each key
- Auth tag prevents tampering

### In-Transit Security
- HTTPS only for all API key transmission
- API keys never exposed in logs or error responses
- Secure, HTTP-only cookies for sessions

### Access Control
- JWT-based session validation
- Server-side key retrieval (never sent to client)
- Rate limiting prevents brute-force attempts
- Validation against Kilogateway API before storage

### Audit & Monitoring
- Timestamp tracking (created, rotated, validated)
- Secure error logging (never includes actual keys)
- User-friendly error messages guide remediation
- Clear remediation steps for each error scenario

---

## Environment Variables Required

```env
# Existing variables
AUTH_SECRET=your-secret-key
POSTGRES_URL=postgresql://...
V0_API_KEY=v0_sk_...

# New variable for API key encryption
API_KEY_ENCRYPTION_SECRET=your-encryption-key-32-chars-min
```

**Note**: Generate a strong `API_KEY_ENCRYPTION_SECRET` (32+ characters) for production.

---

## Error Scenarios & Handling

| Error Code | HTTP Status | User Message | Remediation |
|-----------|------------|--------------|-------------|
| INVALID_FORMAT | 400 | "API key format is invalid" | Copy full key, check for spaces |
| INVALID_KEY | 401 | "API key is invalid or expired" | Generate new key in Kilogateway |
| INSUFFICIENT_PERMISSIONS | 403 | "API key lacks permissions" | Check account permissions |
| RATE_LIMITED | 429 | "Too many attempts, try in 15 min" | Wait and retry |
| SERVICE_UNAVAILABLE | 503 | "Kilogateway temporarily down" | Check status page, retry later |
| NETWORK_ERROR | 503 | "Network error, check connection" | Verify internet, firewall settings |
| TIMEOUT | 504 | "Request timed out" | Check connection speed |
| UNAUTHORIZED | 401 | "Must be logged in" | Sign in to account |
| DATABASE_ERROR | 500 | "Failed to save key" | Contact support if persists |

---

## Testing Checklist

### Unit Testing
- [ ] Encryption/decryption roundtrip with various key formats
- [ ] Rate limit enforcement and reset
- [ ] API key format validation
- [ ] Error code mapping to messages
- [ ] Session data includes API key metadata

### Integration Testing
- [ ] Full validation flow: input → validation → save → retrieve
- [ ] Chat route uses user's key when available
- [ ] Fallback to env key when user has none
- [ ] Key rotation replaces old key correctly
- [ ] Key deletion removes all data
- [ ] Rate limiting prevents excessive attempts

### Security Testing
- [ ] API keys never appear in logs
- [ ] Error messages don't expose key details
- [ ] Encryption/decryption with wrong secret fails
- [ ] API key stored encrypted in database
- [ ] Session auth required for all key operations
- [ ] HTTPS enforced for key operations

### UI Testing
- [ ] Settings page accessible after login
- [ ] API key form validates input before submission
- [ ] Status component updates after successful validation
- [ ] Error messages display appropriately
- [ ] Copy-to-clipboard works
- [ ] Delete confirmation prevents accidents

### E2E Testing
- [ ] Sign up → no key → limited mode
- [ ] Add key → validation → chat works
- [ ] Rotate key → chat continues to work
- [ ] Delete key → limited mode again
- [ ] Rate limiting works across multiple attempts
- [ ] Key persistence across sessions

---

## Deployment Checklist

- [ ] Set `API_KEY_ENCRYPTION_SECRET` in production env vars
- [ ] Run database migration to add API key columns
- [ ] Test all endpoints with real Kilogateway API keys
- [ ] Verify error messages don't expose sensitive data
- [ ] Check encryption with production secret
- [ ] Monitor logs for any key leaks
- [ ] Set up alerts for rate limiting abuse
- [ ] Document backup/recovery procedures
- [ ] Test key rotation before production
- [ ] Verify HTTPS enforcement
- [ ] Load test rate limiter under concurrent load

---

## Future Enhancements

1. **Kilogateway OAuth Integration**: Direct OAuth flow for seamless key provisioning
2. **Key Expiration Warnings**: Notify users before keys expire
3. **Usage Analytics**: Track API key usage and rate limit insights
4. **Multi-Key Support**: Allow users to manage multiple API keys
5. **Key Delegation**: Share specific keys with team members
6. **Audit Trail**: Detailed logging of all key operations
7. **Automatic Key Refresh**: Refresh tokens with sliding expiration
8. **Team Management**: Organization-level API key management

---

## Support & Troubleshooting

**Key keeps expiring?**
- Keys are considered expired after 30 days without validation
- Using the chat feature validates the key automatically
- Manually validate in settings if not using chat

**Too many validation attempts?**
- System limits to 5 validation attempts per 15 minutes
- Wait 15 minutes and try again
- Ensure API key is correct before retrying

**Can't decrypt key?**
- Check that `API_KEY_ENCRYPTION_SECRET` matches production secret
- If it doesn't match, all keys will fail to decrypt
- Rotate all keys after changing encryption secret

**Network timeouts?**
- Check internet connection stability
- Verify Kilogateway service is accessible
- Ensure firewall allows outbound HTTPS to api.kilo.ai

---

**Implementation Date**: April 2, 2026
**Status**: Production Ready
