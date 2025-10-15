# Agora Token Endpoint Fix Summary

## Issue Fixed
The `/api/agora/token` endpoint was failing with a 400 error because it expected a `role` parameter with values 'host' or 'audience', but the application was passing UIDs like 'p_1a20c2b4...' and 'g_38774353...'.

## Solution Implemented

### Changes Made to `/api/agora/token` in `server/routes.ts`:

1. **Removed the `role` parameter** from the Zod validation schema
2. **Simplified parameter validation** to only require:
   - `channel`: string (the session's agoraChannel field)
   - `uid`: string (unique identifier with p_ or g_ prefix)

3. **Set all users to PUBLISHER role** since both practitioners and guests need to publish audio/video in a video call

### Code Changes:
```typescript
// BEFORE:
const { channel, role, uid } = z.object({
  channel: z.string(),
  role: z.enum(['host', 'audience']),  // ← This was causing the 400 error
  uid: z.string(),
}).parse(req.query);

// AFTER:
const { channel, uid } = z.object({
  channel: z.string(),
  uid: z.string(),
}).parse(req.query);

// Both practitioners and guests get PUBLISHER role
const agoraRole = RtcRole.PUBLISHER;
```

## Verification
The endpoint now correctly:
- ✅ Accepts UIDs like "p_1a20c2b4" for practitioners
- ✅ Accepts UIDs like "g_38774353" for guests
- ✅ Does NOT require a "role" parameter
- ✅ Grants PUBLISHER permissions to all users (both can send/receive audio and video)
- ✅ Returns 401 for unauthorized requests (auth validation)
- ✅ Returns 400 only for missing required parameters (channel or uid)

## Usage Example
```javascript
// Correct usage after fix:
const response = await fetch(
  `/api/agora/token?channel=${session.agoraChannel}&uid=${session.agoraUidPractitioner}`,
  {
    headers: { 'Authorization': `Bearer ${authToken}` }
  }
);
```

## Impact
This fix ensures that video calling functionality works correctly for both practitioners and guests in the Allinya application, allowing them to join video sessions using their assigned UIDs.