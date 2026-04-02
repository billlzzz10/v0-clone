# Dual API Authentication System - Architecture & Data Flow

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
├─────────────────────────────────────────────────────────────────┤
│  /settings Page (Settings/Components)                           │
│  ├─ ApiKeyForm (Input/Validate)                                │
│  ├─ ApiKeyStatus (Display Status)                              │
│  └─ UserNav (Navigation)                                        │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──────────────────────────────────────────────────┐
             │                                                  │
             ▼                                                  ▼
    ┌──────────────────┐                              ┌──────────────────┐
    │  POST /api/keys  │                              │  POST /api/chat  │
    │  /validate       │                              │                  │
    │  /rotate         │                              └──────────────────┘
    │  /delete         │                                       │
    └────────┬─────────┘                                       │
             │                                                  │
             ├─────────────────────────────────────────────────┤
             │                                                  │
             ▼                                                  ▼
    ┌─────────────────────────────────────────────────────────────┐
    │             Authentication Layer (NextAuth)                 │
    │  ├─ Session Validation                                      │
    │  ├─ JWT Token Verification                                  │
    │  └─ API Key Metadata Injection                              │
    └──────────┬──────────────────────────────────────────────────┘
               │
               ├─────────────────────────────────────────────────┐
               │                                                 │
               ▼                                                 ▼
    ┌──────────────────────┐                      ┌──────────────────────┐
    │ Encryption Service   │                      │  Validation Service  │
    │ ├─ encryptApiKey()   │                      │ ├─ validateFormat()  │
    │ ├─ decryptApiKey()   │                      │ ├─ validateKilo()    │
    │ └─ hashApiKey()      │                      │ └─ checkRateLimit()  │
    └──────────┬───────────┘                      └──────────┬───────────┘
               │                                             │
               ├─────────────────────────────────────────────┤
               │                                             │
               ▼                                             ▼
    ┌─────────────────────────────────────────────────────────────┐
    │           Database Queries Layer (lib/api-key)              │
    │  ├─ saveApiKey()                                            │
    │  ├─ getApiKey()                                             │
    │  ├─ getApiKeyInfo()                                         │
    │  ├─ hasValidApiKey()                                        │
    │  ├─ rotateApiKey()                                          │
    │  └─ deleteApiKey()                                          │
    └──────────┬──────────────────────────────────────────────────┘
               │
               ├─────────────────────────────────────────────────┐
               │                                                 │
               ▼                                                 ▼
    ┌──────────────────────┐                      ┌──────────────────────┐
    │  PostgreSQL Database │                      │   Kilogateway API    │
    │                      │                      │                      │
    │  users table:        │                      │  /api/gateway/models │
    │  ├─ id               │                      │  (validation test)   │
    │  ├─ email            │                      └──────────────────────┘
    │  ├─ password         │
    │  ├─ api_key_encrypted│ (AES-256-GCM)
    │  ├─ api_key_source   │ ('manual'/'kilo')
    │  ├─ validated_at     │
    │  ├─ rotation_date    │
    │  └─ kgateway_user_id │
    └──────────────────────┘
```

## Data Flow: Adding API Key

```
User Input (Settings Page)
    │
    ▼
┌─────────────────────────────┐
│  ApiKeyForm Component       │
│  - Take user input          │
│  - Show/hide password       │
│  - Validate format locally  │
└─────────┬───────────────────┘
          │
          ▼
┌──────────────────────────────┐
│ POST /api/keys/validate      │
├──────────────────────────────┤
│ 1. Require authentication    │
│    ├─ Check session valid    │
│    └─ Get user ID            │
│                              │
│ 2. Get request body          │
│    └─ Parse JSON safely      │
│                              │
│ 3. Rate limit check          │
│    ├─ Check 5 attempts/15min │
│    └─ Return 429 if over     │
│                              │
│ 4. Validate with Kilogateway │
│    ├─ Make test request      │
│    ├─ Check 401/403/500      │
│    └─ Return specific error  │
│                              │
│ 5. Encrypt & save key        │
│    ├─ encryptApiKey()        │
│    ├─ saveApiKey()           │
│    └─ Update timestamps      │
│                              │
│ 6. Reset rate limit          │
│    └─ Remove from tracker    │
│                              │
│ 7. Return success            │
│    └─ Include new key info   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Database: INSERT/UPDATE      │
├──────────────────────────────┤
│ UPDATE users                 │
│ SET                          │
│   api_key_encrypted = '...'  │
│   api_key_source = 'manual'  │
│   api_key_validated_at = NOW │
│   api_key_rotation_date = NOW│
│ WHERE id = 'user-id'         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Response to Client           │
├──────────────────────────────┤
│ {                            │
│   "success": true,           │
│   "message": "...",          │
│   "keyInfo": {               │
│     "source": "manual",      │
│     "validatedAt": "...",    │
│     "rotationDate": "..."    │
│   }                          │
│ }                            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ UI Update                    │
├──────────────────────────────┤
│ ✓ Clear input field          │
│ ✓ Show success message       │
│ ✓ Refresh status card        │
│ ✓ Update session data        │
└──────────────────────────────┘
```

## Data Flow: Using API Key in Chat

```
User Sends Chat Message
    │
    ▼
┌─────────────────────────────┐
│ POST /api/chat              │
├─────────────────────────────┤
│ 1. Get session              │
│    ├─ Check authentication  │
│    └─ Get user ID           │
│                              │
│ 2. Check rate limits        │
│    ├─ By user/IP            │
│    └─ Return 429 if over    │
│                              │
│ 3. Retrieve API key         │
│    ├─ getApiKey(userId)     │
│    ├─ Decrypt from DB       │
│    └─ Never log key         │
│                              │
│ 4. Create v0-sdk client     │
│    ├─ If user has key:      │
│    │  └─ Use user's key     │
│    └─ Else:                 │
│       └─ Use env-based key  │
│                              │
│ 5. Send chat request        │
│    ├─ v0.chats.create()     │
│    └─ Include message       │
│                              │
│ 6. Update validation        │
│    ├─ If user key used:     │
│    │  └─ updateKeyValidation│
│    └─ Update timestamp      │
│                              │
│ 7. Create ownership record  │
│    └─ Link chat to user     │
│                              │
│ 8. Return response          │
│    └─ Chat data/stream      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Kilogateway API Request      │
├──────────────────────────────┤
│ Authorization: Bearer KEY    │
│ POST /api/gateway/...        │
│ (Uses user's API key)        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Response to Client           │
├──────────────────────────────┤
│ Chat response stream or JSON │
└──────────────────────────────┘
```

## Data Flow: Error Handling

```
Any API Request Error
    │
    ▼
┌─────────────────────────────┐
│ Catch & Categorize Error    │
├─────────────────────────────┤
│ throw new ApiKeyError(...)  │
│ or                          │
│ catch (err) {...}           │
└─────────┬───────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Error Handling (errors.ts)       │
├──────────────────────────────────┤
│ 1. Identify error code           │
│    ├─ INVALID_FORMAT             │
│    ├─ INVALID_KEY                │
│    ├─ RATE_LIMITED               │
│    └─ ... (12 total codes)       │
│                                  │
│ 2. Get user-friendly message     │
│    └─ ERROR_CATALOG[code]        │
│                                  │
│ 3. Get remediation steps         │
│    └─ How to fix it              │
│                                  │
│ 4. Log securely                  │
│    ├─ Never log actual key       │
│    ├─ Include context            │
│    └─ Include timestamp          │
│                                  │
│ 5. Prepare response              │
│    ├─ User-friendly message      │
│    ├─ Error code                 │
│    └─ HTTP status code           │
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│ Send HTTP Response           │
├──────────────────────────────┤
│ {                            │
│   "error": "INVALID_KEY",    │
│   "message": "API key...",   │
│   "remainingAttempts": 2,    │
│   "remediationSteps": [...]  │
│ }                            │
│                              │
│ HTTP Status: 401/400/429/... │
└─────────┬────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│ Client Error Handling        │
├──────────────────────────────┤
│ ✓ Display user-friendly msg  │
│ ✓ Show remediation steps     │
│ ✓ Enable retry if applicable │
│ ✓ Clear sensitive fields     │
└──────────────────────────────┘
```

## Encryption & Decryption Flow

```
Raw API Key (e.g., "kilo_sk_...")
    │
    ▼
┌─────────────────────────────────────┐
│ encryptApiKey() Function            │
├─────────────────────────────────────┤
│ 1. Get master secret                │
│    └─ API_KEY_ENCRYPTION_SECRET     │
│                                     │
│ 2. Generate random salt (32 bytes)  │
│    └─ crypto.randomBytes(32)        │
│                                     │
│ 3. Derive key via PBKDF2            │
│    ├─ master_secret + salt          │
│    ├─ 100,000 iterations            │
│    └─ SHA256 hash function          │
│                                     │
│ 4. Generate random IV (16 bytes)    │
│    └─ crypto.randomBytes(16)        │
│                                     │
│ 5. Encrypt via AES-256-GCM          │
│    ├─ derived_key + IV              │
│    ├─ plaintext API key             │
│    └─ ciphertext output             │
│                                     │
│ 6. Get authentication tag (16 bytes)│
│    └─ Prevents tampering            │
│                                     │
│ 7. Combine components               │
│    ├─ salt (32 bytes)               │
│    ├─ IV (16 bytes)                 │
│    ├─ ciphertext (variable)         │
│    └─ auth_tag (16 bytes)           │
│                                     │
│ 8. Encode as Base64                 │
│    └─ For database storage          │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Database Storage            │
├─────────────────────────────┤
│ api_key_encrypted =         │
│ "base64(salt+IV+cipher..."  │
│                             │
│ Never plaintext!            │
└─────────┬───────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ decryptApiKey() Function         │
├──────────────────────────────────┤
│ 1. Decode from Base64            │
│    └─ Get bytes from storage     │
│                                  │
│ 2. Extract components            │
│    ├─ salt: first 32 bytes       │
│    ├─ IV: next 16 bytes          │
│    ├─ ciphertext: middle bytes   │
│    └─ auth_tag: last 16 bytes    │
│                                  │
│ 3. Get master secret             │
│    └─ API_KEY_ENCRYPTION_SECRET  │
│                                  │
│ 4. Derive key (same process)     │
│    ├─ master_secret + salt       │
│    ├─ 100,000 iterations         │
│    └─ SHA256 hash function       │
│                                  │
│ 5. Decrypt via AES-256-GCM       │
│    ├─ derived_key + IV           │
│    ├─ ciphertext                 │
│    ├─ auth_tag (verify)          │
│    └─ plaintext output           │
│                                  │
│ 6. Return original API key       │
│    └─ "kilo_sk_..."              │
└──────────┬─────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Use Decrypted Key            │
├──────────────────────────────┤
│ ✓ Pass to Kilogateway        │
│ ✓ Never log or expose        │
│ ✓ Use only in auth header    │
└──────────────────────────────┘
```

## Database Schema

```
┌──────────────────────────────────────────────────────────┐
│                    users table                           │
├──────────────────────────────────────────────────────────┤
│ Column Name              │ Type         │ Notes           │
├──────────────────────────────────────────────────────────┤
│ id                       │ UUID         │ Primary Key     │
│ email                    │ VARCHAR(64)  │ Unique          │
│ password                 │ VARCHAR(64)  │ Hashed          │
├──────────────────────────────────────────────────────────┤
│ api_key_encrypted        │ VARCHAR(512) │ AES-256-GCM     │
│ api_key_source           │ VARCHAR(32)  │ 'manual'/'kilo' │
│ api_key_validated_at     │ TIMESTAMP    │ Last validation │
│ api_key_rotation_date    │ TIMESTAMP    │ Created/updated │
│ kilogateway_user_id      │ VARCHAR(255) │ OAuth ID        │
├──────────────────────────────────────────────────────────┤
│ created_at               │ TIMESTAMP    │ Account created │
└──────────────────────────────────────────────────────────┘

Indexes:
  - idx_users_api_key_source (for filtering by source)
  - idx_users_kilogateway_user_id (for OAuth lookup)
  - idx_users_api_key_validated_at (for freshness checks)
```

## Session Data Structure

```
┌────────────────────────────────────────────────────────┐
│              NextAuth Session Object                   │
├────────────────────────────────────────────────────────┤
│ session {                                              │
│   user {                                               │
│     id: "user-uuid",                                   │
│     email: "user@example.com",                         │
│     type: "regular" | "guest",                         │
│     hasApiKey: true | false,                           │
│     apiKeySource: "manual" | "kilogateway" | null      │
│   },                                                   │
│   expires: "2024-04-09T10:30:00Z"                     │
│ }                                                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Token (JWT) {                                          │
│   sub: "user-uuid",                                    │
│   id: "user-uuid",                                     │
│   type: "regular" | "guest",                           │
│   hasApiKey: true | false,                             │
│   apiKeySource: "manual" | "kilogateway" | null,       │
│   iat: 1712146200,                                     │
│   exp: 1712232600                                      │
│ }                                                      │
└────────────────────────────────────────────────────────┘
```

## Rate Limiting State

```
┌────────────────────────────────────────────────────────┐
│     In-Memory Rate Limiter (Map Structure)            │
├────────────────────────────────────────────────────────┤
│                                                        │
│ validationAttempts: Map<string, {                      │
│   count: number,        // Current attempt count      │
│   resetTime: number     // When to reset (millis)     │
│ }>                                                     │
│                                                        │
│ Example:                                               │
│ {                                                      │
│   "user-id-123": {                                     │
│     count: 3,                                          │
│     resetTime: 1712149800000  // 15 min from init     │
│   },                                                   │
│   "user-id-456": {                                     │
│     count: 1,                                          │
│     resetTime: 1712149900000                           │
│   }                                                    │
│ }                                                      │
│                                                        │
│ Limits:                                                │
│ - 5 attempts per 15 minutes per user                  │
│ - Reset when window expires or explicit reset         │
│ - In-memory (resets on server restart)                │
└────────────────────────────────────────────────────────┘
```

---

**Architecture Version**: 1.0
**Last Updated**: April 2, 2026
