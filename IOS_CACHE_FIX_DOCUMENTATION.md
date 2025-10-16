# iOS WebKit Cache-Busting Solution

## Problem
The iPad/Replit mobile app uses WKWebView which aggressively caches JavaScript modules, causing old code to persist even after server restarts. This resulted in users seeing outdated bugs (NaN timer, error messages) that had already been fixed.

## Solution Implemented
A comprehensive multi-layer cache-busting strategy specifically designed for iOS WebKit's aggressive caching behavior.

## Components

### 1. Build Versioning System (`client/public/version.json`)
- Stores build timestamp, version, and unique build ID
- Updated by `build-timestamp.js` script before deployment
- Current timestamp: `1760625660849`

### 2. Service Worker (`client/public/sw.js`)
- Aggressive cache management for iOS WebKit
- Intercepts all JavaScript, CSS, and module requests
- Adds cache-busting query parameters to all resources
- Forces `no-cache, no-store, must-revalidate` headers
- Auto-updates every 30 seconds on iOS devices
- Immediately clears all caches on activation

### 3. Cache Manager (`client/public/cache-manager.js`)
- Runs before any other scripts load
- Detects version changes and forces reload
- Clears localStorage (except auth tokens)
- iOS-specific hard reload with timestamp parameter
- Patches dynamic imports to include cache-bust parameters

### 4. Enhanced HTML (`client/index.html`)
- Aggressive cache prevention meta tags:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
  - `Clear-Site-Data: cache, storage`
- Service worker registration with auto-update
- Fetch interception for Vite modules on iOS
- Cache-busting parameters on all script imports

### 5. Server-Side Headers (`server/routes.ts`)
- Middleware adds aggressive no-cache headers to all API responses
- iOS-specific headers when WebKit user agent detected
- Build version headers (`X-Build-Timestamp`, `X-Build-Version`)
- Cache-bust endpoint (`/api/cache-bust`) for manual clearing
- Version check endpoint (`/api/version`) for detecting updates

### 6. Visual Build Indicator (`client/src/components/BuildVersionIndicator.tsx`)
- Shows current build version in bottom-right corner
- Displays special iOS indicator on iPad devices
- Refresh button for manual cache clearing
- Auto-detects version changes every 60 seconds on iOS
- Shows update notification when new version available
- One-click cache clear and reload functionality

### 7. Build Script (`build-timestamp.js`)
- Executable Node.js script to update all timestamps
- Replaces `__BUILD_TIMESTAMP__` placeholders
- Generates unique build IDs
- Updates all cache-busting files in one command

## How It Works

### On Page Load (iOS):
1. `cache-manager.js` runs first, checks stored version
2. If version mismatch, clears all caches and forces reload
3. Service worker registers and clears old caches
4. All module requests get cache-bust parameters
5. Server responds with no-cache headers

### During Runtime (iOS):
1. Build version indicator checks server version every 60 seconds
2. Service worker updates every 30 seconds
3. All fetch requests include cache-bust timestamps
4. Users can manually clear cache with refresh button

### On Deployment:
1. Run `node build-timestamp.js` to update timestamps
2. Deploy application
3. iOS devices detect version change and auto-reload
4. All caches cleared, fresh code loaded

## User Experience

### For iOS Users:
- **Automatic Updates**: App detects new versions and prompts to update
- **Manual Control**: Refresh button always visible for manual cache clear
- **Visual Feedback**: Version badge shows current build and iOS status
- **No Data Loss**: Auth tokens preserved during cache clear

### Cache Clear Process:
1. User taps refresh button (or auto-detected)
2. Toast notification shows "Cache Cleared"
3. All caches and storage cleared (except auth)
4. Service worker updated
5. Page reloads with fresh content

## Testing on iOS

The solution has been tested and verified to work on:
- iPad with Replit mobile app
- iOS WebKit/WKWebView
- Safari on iOS devices

### Key iOS-Specific Features:
- Detects iOS via user agent and touch points
- Extra cache headers for WebKit browsers
- Forced reload with timestamp parameters
- Aggressive service worker updates
- Persistent version checking

## Deployment Instructions

1. **Before Each Deployment:**
   ```bash
   node build-timestamp.js
   ```
   This updates all timestamps to force cache refresh.

2. **After Deployment:**
   - iOS users will see update notification
   - Can tap refresh button to update immediately
   - Or wait for auto-reload (checks every 60 seconds)

## Troubleshooting

### If Cache Still Persists:
1. Check browser console for cache manager logs
2. Verify service worker is registered
3. Use refresh button in app
4. Check `/api/cache-bust` endpoint manually

### Debug Information:
- Current version visible in bottom-right badge
- Console logs show cache operations
- Network tab shows cache-bust parameters
- Server headers include build timestamp

## Technical Details

### Cache-Bust Parameters Added:
- `?v=__BUILD_TIMESTAMP__` on main scripts
- `?_t=timestamp` on version checks
- `?_cb=timestamp` on module imports
- `?_t=BUILD_TIMESTAMP` on service worker

### Headers Set:
```
Cache-Control: no-cache, no-store, must-revalidate, private, max-age=0
Pragma: no-cache
Expires: 0
X-Build-Timestamp: [timestamp]
X-Build-Version: 1.0.0
Clear-Site-Data: "cache" (iOS only)
```

## Success Metrics

✅ Old JavaScript code no longer persists after deployment
✅ NaN timer bug fixed and stays fixed
✅ Error messages cleared after fixes deployed
✅ iOS users can manually force refresh
✅ Automatic version detection works
✅ No impact on non-iOS users
✅ Auth tokens preserved during cache clear

## Conclusion

This comprehensive solution addresses iOS WebKit's aggressive caching through multiple redundant mechanisms, ensuring users always receive the latest code updates. The visual indicator and manual refresh option provide users with control, while automatic detection ensures updates are never missed.