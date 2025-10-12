/**
 * Development Inspector Page
 * Performance profiling and debugging utilities
 * Access at: /dev/inspector
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger, LogLevel, LogCategory } from '@/lib/logger';
import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

function DevInspector() {
  const [logs, setLogs] = useState(logger.getLogs());
  const [logLevel, setLogLevel] = useState(logger.getLevel());
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [supabaseLatency, setSupabaseLatency] = useState<number | null>(null);
  const [timerDriftActive, setTimerDriftActive] = useState(false);
  
  // Subscribe to log updates
  useEffect(() => {
    const unsubscribe = logger.subscribe(() => {
      setLogs(logger.getLogs());
    });
    
    return unsubscribe;
  }, []);
  
  // Collect performance metrics
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      
      setPerformanceMetrics({
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
        firstContentfulPaint: paint?.startTime,
        domInteractive: navigation?.domInteractive,
        transferSize: navigation?.transferSize,
        encodedBodySize: navigation?.encodedBodySize,
      });
    }
  }, []);
  
  // Test Supabase latency
  const testSupabaseLatency = async () => {
    const start = Date.now();
    try {
      await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      setSupabaseLatency(latency);
      logger.info(LogCategory.PERFORMANCE, `Supabase latency: ${latency}ms`);
    } catch (error) {
      logger.error(LogCategory.PERFORMANCE, 'Failed to test Supabase latency', error);
    }
  };
  
  // Toggle timer drift monitoring
  const toggleTimerDrift = () => {
    if (timerDriftActive) {
      logger.stopTimerDriftMonitoring();
      setTimerDriftActive(false);
    } else {
      logger.startTimerDriftMonitoring();
      setTimerDriftActive(true);
    }
  };
  
  // Clear all logs
  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };
  
  // Change log level
  const changeLogLevel = (level: LogLevel) => {
    logger.setLevel(level);
    setLogLevel(level);
  };
  
  // Get React Query cache stats
  const getCacheStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      stalledQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
    };
  };
  
  const cacheStats = getCacheStats();
  
  // Only show in development
  if (config.app.isProd) {
    return null;
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-dev-inspector">
      <h1 className="text-3xl font-bold">Development Inspector</h1>
      
      {/* Environment Info */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Environment</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Badge variant="outline">Environment</Badge>
            <p className="mt-1">{config.app.env}</p>
          </div>
          <div>
            <Badge variant="outline">Base URL</Badge>
            <p className="mt-1">{config.app.baseUrl}</p>
          </div>
          <div>
            <Badge variant="outline">Supabase URL</Badge>
            <p className="mt-1">{config.supabase.url}</p>
          </div>
          <div>
            <Badge variant="outline">Agora App ID</Badge>
            <p className="mt-1">{config.agora.appId ? '✓ Configured' : '✗ Missing'}</p>
          </div>
        </div>
      </Card>
      
      {/* Performance Metrics */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Badge variant="outline">DOM Content Loaded</Badge>
            <p className="mt-1">{performanceMetrics.domContentLoaded?.toFixed(2)}ms</p>
          </div>
          <div>
            <Badge variant="outline">Page Load Complete</Badge>
            <p className="mt-1">{performanceMetrics.loadComplete?.toFixed(2)}ms</p>
          </div>
          <div>
            <Badge variant="outline">First Contentful Paint</Badge>
            <p className="mt-1">{performanceMetrics.firstContentfulPaint?.toFixed(2)}ms</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div>
            <Button onClick={testSupabaseLatency} size="sm" data-testid="button-test-latency">
              Test Supabase Latency
            </Button>
            {supabaseLatency !== null && (
              <Badge className="ml-2" variant={supabaseLatency < 100 ? 'default' : 'destructive'}>
                {supabaseLatency}ms
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={toggleTimerDrift} 
            size="sm"
            variant={timerDriftActive ? 'destructive' : 'default'}
            data-testid="button-toggle-drift"
          >
            {timerDriftActive ? 'Stop' : 'Start'} Timer Drift Monitor
          </Button>
        </div>
      </Card>
      
      {/* React Query Cache */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">React Query Cache</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Badge variant="outline">Total Queries</Badge>
            <p className="mt-1">{cacheStats.totalQueries}</p>
          </div>
          <div>
            <Badge variant="outline">Fetching</Badge>
            <p className="mt-1">{cacheStats.stalledQueries}</p>
          </div>
          <div>
            <Badge variant="outline">Success</Badge>
            <p className="mt-1">{cacheStats.successQueries}</p>
          </div>
          <div>
            <Badge variant="outline">Error</Badge>
            <p className="mt-1">{cacheStats.errorQueries}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => queryClient.invalidateQueries()} 
          size="sm" 
          className="mt-4"
          data-testid="button-invalidate-cache"
        >
          Invalidate All Queries
        </Button>
      </Card>
      
      {/* Logging Controls */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Logging</h2>
        <div className="flex gap-2 mb-4">
          {Object.entries(LogLevel).filter(([key, val]) => typeof val === 'number').map(([key, val]) => (
            <Button
              key={key}
              onClick={() => changeLogLevel(val as LogLevel)}
              size="sm"
              variant={logLevel === val ? 'default' : 'outline'}
              data-testid={`button-log-level-${key.toLowerCase()}`}
            >
              {key}
            </Button>
          ))}
          <Button onClick={clearLogs} size="sm" variant="destructive" data-testid="button-clear-logs">
            Clear Logs
          </Button>
        </div>
        
        {/* Log Display */}
        <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-muted font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index}
                className={`mb-2 ${
                  log.level === LogLevel.ERROR ? 'text-red-500' :
                  log.level === LogLevel.WARN ? 'text-yellow-500' :
                  log.level === LogLevel.INFO ? 'text-blue-500' :
                  'text-gray-500'
                }`}
                data-testid={`log-entry-${index}`}
              >
                <span className="text-xs">{log.timestamp}</span>
                <span className="ml-2 font-semibold">[{LogLevel[log.level]}]</span>
                <span className="ml-2">[{log.category}]</span>
                <span className="ml-2">{log.message}</span>
                {log.data && (
                  <pre className="ml-4 text-xs">{JSON.stringify(log.data, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default DevInspector;