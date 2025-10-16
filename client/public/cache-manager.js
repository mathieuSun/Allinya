// Cache Manager for iOS WebKit - Aggressive cache busting
// This runs before any other scripts to ensure cache is cleared

(function() {
  'use strict';
  
  const BUILD_TIMESTAMP = '1760625660849';
  const VERSION_KEY = 'allinya_build_version';
  
  // Check if we're on iOS/iPadOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Get stored version
  const storedVersion = localStorage.getItem(VERSION_KEY);
  
  console.log('[Cache Manager] Current build:', BUILD_TIMESTAMP);
  console.log('[Cache Manager] Stored version:', storedVersion);
  console.log('[Cache Manager] Is iOS device:', isIOS);
  
  // If version changed or first visit, clear everything
  if (storedVersion !== BUILD_TIMESTAMP) {
    console.log('[Cache Manager] Version mismatch, clearing all caches...');
    
    // Clear localStorage except auth tokens
    const authKeys = ['supabase.auth.token', 'access_token'];
    const savedAuth = {};
    authKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) savedAuth[key] = value;
    });
    
    localStorage.clear();
    
    // Restore auth
    Object.entries(savedAuth).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    // Store new version
    localStorage.setItem(VERSION_KEY, BUILD_TIMESTAMP);
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('[Cache Manager] Deleting cache:', name);
          caches.delete(name);
        });
      });
    }
    
    // For iOS, just log that cache was cleared - NO automatic reload
    if (isIOS) {
      console.log('[Cache Manager] iOS detected, cache cleared. User can manually refresh when ready.');
      // NO automatic reload - let user control when to refresh
    }
  }
  
  // Add cache-busting to all dynamic imports for iOS
  if (isIOS) {
    const originalImport = window.__import || ((id) => import(id));
    window.__import = function(id) {
      // Add timestamp to module imports
      const bustId = id.includes('?') ? 
        id + '&_t=' + BUILD_TIMESTAMP : 
        id + '?_t=' + BUILD_TIMESTAMP;
      return originalImport(bustId);
    };
  }
  
  // Listen for service worker updates but don't auto-reload
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        console.log('[Cache Manager] Service worker updated caches. User can manually refresh when ready.');
        // NO automatic reload - let user control when to refresh
      }
    });
  }
  
  // Expose build info globally
  window.__BUILD_INFO__ = {
    timestamp: BUILD_TIMESTAMP,
    version: '1.0.0',
    isIOS: isIOS
  };
})();