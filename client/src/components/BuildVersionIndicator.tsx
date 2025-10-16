import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export function BuildVersionIndicator() {
  const [buildInfo, setBuildInfo] = useState<{
    timestamp: string;
    version: string;
    isIOS: boolean;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    // Get build info from window or detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Try to get build info from window global
    const info = (window as any).__BUILD_INFO__ || {
      timestamp: localStorage.getItem('allinya_build_version') || 'unknown',
      version: '1.0.0',
      isIOS
    };
    
    setBuildInfo(info);

    // Check version periodically on iOS
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version?_t=' + Date.now(), {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.warn('Version check returned non-OK status:', response.status);
          return;
        }
        
        const serverVersion = await response.json();
        const currentTimestamp = (window as any).__BUILD_INFO__?.timestamp || 
                                 localStorage.getItem('allinya_build_version');
        
        if (currentTimestamp && serverVersion.timestamp !== currentTimestamp) {
          setOutdated(true);
          toast({
            title: "Update Available",
            description: "A new version is available. Click the refresh button to update.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    // Check version every 60 seconds on iOS
    if (isIOS) {
      checkVersion();
      const interval = setInterval(checkVersion, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleCacheBust = async () => {
    setChecking(true);
    try {
      // Call cache bust endpoint
      const response = await fetch('/api/cache-bust?_t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage except auth
      const authToken = localStorage.getItem('supabase.auth.token');
      const accessToken = localStorage.getItem('access_token');
      localStorage.clear();
      if (authToken) localStorage.setItem('supabase.auth.token', authToken);
      if (accessToken) localStorage.setItem('access_token', accessToken);
      
      // Update service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.update()));
      }
      
      toast({
        title: "Cache Cleared",
        description: "Reloading with fresh content...",
        variant: "default"
      });
      
      // Force hard reload with timestamp
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('_cb', Date.now().toString());
        window.location.href = url.toString();
      }, 500);
    } catch (error) {
      console.error('Cache bust failed:', error);
      toast({
        title: "Cache Clear Failed",
        description: "Please try refreshing the page manually.",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  if (!buildInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {/* Build version badge */}
      <Badge 
        variant={outdated ? "destructive" : "secondary"} 
        className="text-xs font-mono flex items-center gap-1"
      >
        {outdated ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        )}
        v{buildInfo.version}
        {buildInfo.isIOS && " • iOS"}
      </Badge>
      
      {/* Cache bust button for iOS or when outdated */}
      {(buildInfo.isIOS || outdated) && (
        <Button
          size="icon"
          variant={outdated ? "destructive" : "ghost"}
          onClick={handleCacheBust}
          disabled={checking}
          className="h-7 w-7"
          title="Clear cache and reload"
          data-testid="button-cache-bust"
        >
          <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}