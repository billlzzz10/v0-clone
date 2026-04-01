# API Key System - Quick Reference

## File Structure

```
lib/api-key/
├── encryption.ts      # AES-256-GCM encrypt/decrypt/hash
├── validation.ts      # Kilogateway validation + rate limiting
├── queries.ts         # Database operations
├── errors.ts          # Error catalog and logging
└── middleware.ts      # Auth guards and error wrapping

app/api/keys/
├── validate/route.ts  # POST validate & save key
├── status/route.ts    # GET current key status
├── rotate/route.ts    # POST rotate to new key
└── delete/route.ts    # POST delete key

components/
├── api-key-form.tsx   # Input form with validation
└── api-key-status.tsx # Status display card

app/
└── settings/page.tsx  # Settings page with key management
```

## Core Functions

### Encryption
```typescript
import { encryptApiKey, decryptApiKey, hashApiKey } from '@/lib/api-key/encryption'

const encrypted = encryptApiKey('kilo_sk_...')
const decrypted = decryptApiKey(encrypted)
const hash = hashApiKey('kilo_sk_...')
```

### Validation
```typescript
import { 
  validateApiKeyFormat,
  validateApiKeyWithKilogateway,
  checkValidationRateLimit
} from '@/lib/api-key/validation'

const isFormatValid = validateApiKeyFormat('kilo_sk_...')
const result = await validateApiKeyWithKilogateway('kilo_sk_...')
const rateLimit = checkValidationRateLimit(userId)
```

### Database
```typescript
import {
  saveApiKey,
  getApiKey,
  getApiKeyInfo,
  hasValidApiKey,
  rotateApiKey,
  deleteApiKey
} from '@/lib/api-key/queries'

await saveApiKey(userId, 'kilo_sk_...', 'manual')
const key = await getApiKey(userId) // Returns decrypted key
const info = await getApiKeyInfo(userId) // Returns metadata only
const isValid = await hasValidApiKey(userId)
```

### Error Handling
```typescript
import { ApiKeyError, logApiKeyError } from '@/lib/api-key/errors'

throw new ApiKeyError('INVALID_KEY')
logApiKeyError('UNAUTHORIZED', { userId }, error)
```

## API Endpoints

### Validate Key
```bash
curl -X POST http://localhost:3000/api/keys/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"kilo_sk_..."}'
```

### Get Status
```bash
curl http://localhost:3000/api/keys/status
```

### Rotate Key
```bash
curl -X POST http://localhost:3000/api/keys/rotate \
  -H "Content-Type: application/json" \
  -d '{"newApiKey":"kilo_sk_..."}'
```

### Delete Key
```bash
curl -X POST http://localhost:3000/api/keys/delete
```

## Error Codes

| Code | Status | User Message | Fix |
|------|--------|--------------|-----|
| INVALID_FORMAT | 400 | "API key format invalid" | Copy full key, check spaces |
| INVALID_KEY | 401 | "API key invalid/expired" | Generate new key |
| RATE_LIMITED | 429 | "Too many attempts" | Wait 15 minutes |
| SERVICE_UNAVAILABLE | 503 | "Kilogateway down" | Check status, retry |
| NETWORK_ERROR | 503 | "Network error" | Check internet |
| UNAUTHORIZED | 401 | "Must be logged in" | Sign in |

## Session Data

```typescript
// Access in components
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
console.log(session.user.hasApiKey) // boolean
console.log(session.user.apiKeySource) // 'kilogateway' | 'manual' | null
```

## Common Tasks

### Check if user has valid key
```typescript
const hasKey = await hasValidApiKey(userId)
if (!hasKey) {
  // Show limited mode UI
}
```

### Update after successful API call
```typescript
await updateApiKeyValidation(userId)
```

### Handle validation in API route
```typescript
try {
  const result = await validateApiKeyWithKilogateway(apiKey)
  if (!result.isValid) {
    return NextResponse.json({
      error: result.error,
      message: result.message
    }, { status: 400 })
  }
} catch (error) {
  if (error instanceof ApiKeyError) {
    return error.toResponse()
  }
}
```

### Create encrypted key in database
```typescript
const result = await saveApiKey(userId, apiKey, 'manual')
if (!result.success) {
  console.error(result.error)
}
```

## Debugging

### Check encrypted key
```typescript
// Don't log the key itself, just metadata
console.log('Key exists:', !!encryptedKey)
console.log('Key length:', encryptedKey.length)
```

### Verify rate limit
```typescript
const rateLimit = checkValidationRateLimit(userId)
console.log('Remaining attempts:', rateLimit.remainingAttempts)
```

### Test encryption
```typescript
const secret = process.env.API_KEY_ENCRYPTION_SECRET
console.log('Secret set:', !!secret)
console.log('Secret length:', secret?.length)
```

## Configuration

### Environment Variables
```env
API_KEY_ENCRYPTION_SECRET=your-32-character-key-minimum
```

### Database Schema
```sql
-- Already created by migration
SELECT api_key_encrypted, api_key_source, api_key_validated_at 
FROM users WHERE id = 'user-id'
```

## Rate Limiting

- **Limit**: 5 validation attempts
- **Window**: 15 minutes
- **Storage**: In-memory Map
- **Reset**: On successful validation or after 15 min timeout

## Encryption Details

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2-SHA256 (100,000 iterations)
- **IV Length**: 16 bytes (random)
- **Auth Tag**: 16 bytes (prevents tampering)
- **Salt**: 32 bytes (random per encryption)

## Testing Tips

1. Use invalid format: "short_key"
2. Use invalid key: Any non-Kilogateway format
3. Rate limit: Call 6 times in 15 minutes
4. Network: Test offline mode
5. Encryption: Change secret and try to decrypt

## Links

- [Kilogateway API Docs](https://www.kilo.ai)
- [NextAuth.js Docs](https://authjs.dev)
- [Crypto Node.js Docs](https://nodejs.org/api/crypto.html)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Changes Summary](./CHANGES.md)

---

**Last Updated**: April 2, 2026
