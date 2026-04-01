# Dual API Authentication System - Setup Checklist

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Generate a strong `API_KEY_ENCRYPTION_SECRET` (32+ characters)
  ```bash
  # Generate a secure random string
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Set `API_KEY_ENCRYPTION_SECRET` in `.env.development.local`
- [ ] Verify all required env vars are set:
  - [ ] `POSTGRES_URL`
  - [ ] `AUTH_SECRET`
  - [ ] `V0_API_KEY`
  - [ ] `API_KEY_ENCRYPTION_SECRET`

### 2. Database Setup
- [ ] Run migration to add API key columns
  ```sql
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS api_key_encrypted VARCHAR(512),
  ADD COLUMN IF NOT EXISTS api_key_source VARCHAR(32),
  ADD COLUMN IF NOT EXISTS api_key_validated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS api_key_rotation_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kilogateway_user_id VARCHAR(255);
  
  CREATE INDEX idx_users_api_key_source ON users(api_key_source);
  CREATE INDEX idx_users_kilogateway_user_id ON users(kilogateway_user_id);
  CREATE INDEX idx_users_api_key_validated_at ON users(api_key_validated_at);
  ```
- [ ] Verify migration completed successfully
- [ ] Check that columns exist: `SELECT api_key_encrypted FROM users LIMIT 1`

### 3. Code Verification
- [ ] All 12 new files are present:
  - [ ] `lib/api-key/encryption.ts`
  - [ ] `lib/api-key/validation.ts`
  - [ ] `lib/api-key/queries.ts`
  - [ ] `lib/api-key/errors.ts`
  - [ ] `lib/api-key/middleware.ts`
  - [ ] `app/api/keys/validate/route.ts`
  - [ ] `app/api/keys/status/route.ts`
  - [ ] `app/api/keys/rotate/route.ts`
  - [ ] `app/api/keys/delete/route.ts`
  - [ ] `components/api-key-form.tsx`
  - [ ] `components/api-key-status.tsx`
  - [ ] `app/settings/page.tsx`
- [ ] Files modified correctly:
  - [ ] `app/(auth)/auth.ts` - includes API key session data
  - [ ] `app/api/chat/route.ts` - uses user's API key
  - [ ] `components/user-nav.tsx` - has Settings link
  - [ ] `lib/db/schema.ts` - has new columns
  - [ ] `lib/env-check.ts` - includes encryption secret check

### 4. Local Testing
- [ ] Start dev server: `npm run dev`
- [ ] Verify no build errors
- [ ] Check console for env var warnings
- [ ] Test homepage loads without errors
- [ ] Sign up and create account
- [ ] Navigate to `/settings` page
- [ ] Verify Settings page loads
- [ ] Verify API Key Management form displays

### 5. API Endpoint Testing
- [ ] Test `/api/keys/status` (should return no key)
  ```bash
  curl http://localhost:3000/api/keys/status
  # Expected: { "hasKey": false, "isValid": false }
  ```
- [ ] Test invalid key format
  ```bash
  curl -X POST http://localhost:3000/api/keys/validate \
    -H "Content-Type: application/json" \
    -d '{"apiKey":"short"}'
  # Expected: INVALID_FORMAT error
  ```
- [ ] Test with real Kilogateway API key
  ```bash
  curl -X POST http://localhost:3000/api/keys/validate \
    -H "Content-Type: application/json" \
    -d '{"apiKey":"kilo_sk_your_real_key"}'
  # Expected: Success if key is valid
  ```

### 6. Encryption Verification
- [ ] Verify key is encrypted in database
  ```sql
  SELECT api_key_encrypted FROM users WHERE id = 'your-user-id';
  -- Should show encrypted base64 string, not plaintext key
  ```
- [ ] Test with wrong encryption secret
  - [ ] Change `API_KEY_ENCRYPTION_SECRET` to something different
  - [ ] Try to retrieve key
  - [ ] Verify it fails (decryption error)
  - [ ] Change secret back

### 7. Session Data Testing
- [ ] Log in and check session in browser
  ```javascript
  // In browser console after login
  fetch('/api/auth/session').then(r => r.json()).then(console.log)
  // Should show session with hasApiKey and apiKeySource
  ```
- [ ] Add API key and verify session updates
- [ ] Sign out and log back in
- [ ] Verify API key metadata persists

### 8. UI/UX Testing
- [ ] Test API key form:
  - [ ] Input field works
  - [ ] Show/hide toggle works
  - [ ] Copy button works
  - [ ] Validate button submits
  - [ ] Delete button shows confirmation
- [ ] Test status card:
  - [ ] Shows correct status
  - [ ] Shows timestamps correctly
  - [ ] Updates after key changes
- [ ] Test settings page:
  - [ ] All sections load
  - [ ] Navigation works
  - [ ] Form submissions work

### 9. Error Handling Testing
- [ ] Test rate limiting:
  - [ ] Call validate 5 times
  - [ ] 6th call should fail with RATE_LIMITED
  - [ ] Wait 15 minutes or restart dev server to reset
- [ ] Test network errors:
  - [ ] Disconnect internet
  - [ ] Try to validate key
  - [ ] Verify NETWORK_ERROR message
- [ ] Test invalid key:
  - [ ] Use random string as key
  - [ ] Verify INVALID_KEY error
  - [ ] Check error message is user-friendly

### 10. Chat Integration Testing
- [ ] Test chat without API key:
  - [ ] Create chat message
  - [ ] Verify it works with env-based key
- [ ] Add API key in settings:
  - [ ] Add valid Kilogateway key
  - [ ] Verify key is saved
- [ ] Test chat with API key:
  - [ ] Create new chat message
  - [ ] Verify it uses user's key
  - [ ] Check key validation timestamp updates

### 11. Security Testing
- [ ] Check logs for API key exposure:
  ```bash
  # Search logs for plaintext key
  grep -r "kilo_sk_" /path/to/logs/ || echo "No keys in logs"
  ```
- [ ] Verify error messages don't expose keys
  - [ ] Try invalid operations
  - [ ] Check error responses
  - [ ] No actual keys in error text
- [ ] Test unauthorized access:
  - [ ] Try `/api/keys/*` without authentication
  - [ ] Verify 401 responses
- [ ] Test HTTPS requirement:
  - [ ] Verify HTTP redirects to HTTPS in production
  - [ ] Verify secure cookies are set

### 12. Documentation Review
- [ ] Read `IMPLEMENTATION_GUIDE.md` for full details
- [ ] Read `API_KEY_QUICK_REFERENCE.md` for quick lookup
- [ ] Review `CHANGES.md` for summary of changes
- [ ] Bookmark these docs for future reference

### 13. Production Deployment
- [ ] Generate new `API_KEY_ENCRYPTION_SECRET` for production
- [ ] Set all env vars in production:
  ```
  POSTGRES_URL=...
  AUTH_SECRET=...
  V0_API_KEY=...
  API_KEY_ENCRYPTION_SECRET=...
  ```
- [ ] Run database migration in production
- [ ] Deploy code to production
- [ ] Smoke test endpoints in production
- [ ] Monitor logs for errors
- [ ] Test with real Kilogateway API key
- [ ] Verify no sensitive data in logs

### 14. Monitoring & Alerts
- [ ] Set up logging for API key errors
- [ ] Create alerts for:
  - [ ] Rate limit abuse (>100 attempts/hour from single user)
  - [ ] Decryption failures (likely secret mismatch)
  - [ ] Validation service unavailability
- [ ] Monitor error rates in first 24 hours
- [ ] Check user feedback for issues

### 15. Backup & Recovery
- [ ] Document backup procedure for `API_KEY_ENCRYPTION_SECRET`
  - [ ] Store in secure location
  - [ ] Never commit to git
  - [ ] Rotate if compromised
- [ ] Plan for encryption secret rotation:
  - [ ] How to re-encrypt all keys
  - [ ] How to notify users
  - [ ] Testing procedure
- [ ] Document recovery if keys are lost

## Known Limitations & Future Work

### Current Limitations
- In-memory rate limiting (resets on server restart)
- No OAuth with Kilogateway yet (manual entry only)
- Single API key per user (no multi-key support)
- No key sharing with team members

### Future Enhancements
1. **Kilogateway OAuth Integration**
   - Direct OAuth flow for key provisioning
   - Automatic key refresh

2. **Enhanced Rate Limiting**
   - Persistent rate limit tracking in Redis
   - Per-endpoint rate limiting
   - Different limits for different user types

3. **Key Management**
   - Multiple keys per user
   - Key labeling/naming
   - Key-specific permissions

4. **Monitoring & Analytics**
   - Key usage tracking
   - Rate limit insights
   - Usage reports per user

5. **Team Features**
   - Shared API keys
   - Organization-level management
   - Fine-grained access control

## Support & Troubleshooting

### Issue: "API_KEY_ENCRYPTION_SECRET not set"
- **Cause**: Environment variable missing
- **Fix**: Generate and set the variable (see step 1.1)

### Issue: "Failed to decrypt API key"
- **Cause**: Wrong encryption secret
- **Fix**: Verify `API_KEY_ENCRYPTION_SECRET` matches what was used to encrypt
- **Recovery**: May need to re-encrypt all keys with new secret

### Issue: "Too many validation attempts"
- **Cause**: Rate limiting in effect (5 attempts per 15 minutes)
- **Fix**: Wait 15 minutes or restart dev server
- **Production**: Check for automated attempts/scraping

### Issue: "Kilogateway validation failed"
- **Cause**: Invalid key or Kilogateway service down
- **Fix**: Verify key format, check Kilogateway status
- **Debug**: Test manually: `curl -H "Authorization: Bearer KEY" https://api.kilo.ai/api/gateway/models`

### Issue: "Keys missing after restart"
- **Cause**: In-memory rate limit cache cleared
- **Fix**: Rate limit resets are expected behavior
- **Production**: Consider Redis for persistent tracking

### Issue: "Session not updated with API key"
- **Cause**: Session cache not invalidated
- **Fix**: Sign out and back in
- **Debug**: Check JWT token includes key metadata

## Rollback Procedure

If issues occur and you need to rollback:

1. **Stop deployment** - Don't proceed further
2. **Keep database** - Don't drop the new columns
3. **Revert code** - Deploy previous version
4. **Monitor** - Watch for any issues
5. **Communicate** - Notify users if needed
6. **Plan fix** - Address issues before re-deploying

## Success Criteria

You'll know the implementation is successful when:

- ✅ All API endpoints return correct responses
- ✅ Settings page loads and is functional
- ✅ API keys are properly encrypted in database
- ✅ Users can validate and save keys
- ✅ Chat uses user's API key when available
- ✅ Rate limiting works as expected
- ✅ Error messages are user-friendly
- ✅ No API keys appear in logs
- ✅ All tests pass
- ✅ No security vulnerabilities found

---

**Setup Date**: April 2, 2026
**Status**: Implementation Complete - Ready for Testing
**Support**: See IMPLEMENTATION_GUIDE.md or API_KEY_QUICK_REFERENCE.md
