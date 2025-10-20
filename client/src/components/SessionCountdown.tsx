import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SessionCountdownProps {
  sessionCreatedAt: string;
  onExpired?: () => void;
}

// 3 minutes 45 seconds in milliseconds
const SESSION_TIMEOUT_MS = 3 * 60 * 1000 + 45 * 1000;

export function SessionCountdown({ sessionCreatedAt, onExpired }: SessionCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const createdTime = new Date(sessionCreatedAt).getTime();
      const now = Date.now();
      const elapsed = now - createdTime;
      const remaining = SESSION_TIMEOUT_MS - elapsed;
      
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(0);
        if (onExpired) onExpired();
        return 0;
      }
      
      return remaining;
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionCreatedAt, onExpired]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getUrgencyLevel = () => {
    if (isExpired) return 'expired';
    if (timeRemaining < 30000) return 'critical'; // Less than 30 seconds
    if (timeRemaining < 60000) return 'warning'; // Less than 1 minute
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  return (
    <div className="flex items-center gap-2">
      {urgency === 'expired' ? (
        <Badge variant="destructive" className="animate-pulse">
          <AlertCircle className="h-3 w-3 mr-1" />
          Session Expired
        </Badge>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">Time to accept:</span>
          <Badge 
            variant={urgency === 'critical' ? 'destructive' : urgency === 'warning' ? 'secondary' : 'outline'}
            className={urgency === 'critical' ? 'animate-pulse' : ''}
          >
            {formatTime(timeRemaining)}
          </Badge>
          {urgency === 'critical' && (
            <AlertCircle className="h-4 w-4 text-destructive animate-pulse" />
          )}
        </>
      )}
    </div>
  );
}