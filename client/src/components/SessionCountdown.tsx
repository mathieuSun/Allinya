import { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SessionCountdownProps {
  sessionStartedAt: string;
  sessionDurationSeconds: number;
  onExpired?: () => void;
  label?: string;
}

export function SessionCountdown({ 
  sessionStartedAt, 
  sessionDurationSeconds, 
  onExpired, 
  label = "Room timer" 
}: SessionCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const startTime = new Date(sessionStartedAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const sessionDurationMs = sessionDurationSeconds * 1000;
      const remaining = sessionDurationMs - elapsed;
      
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
  }, [sessionStartedAt, sessionDurationSeconds, onExpired]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getUrgencyLevel = () => {
    if (isExpired) return 'expired';
    const percentRemaining = (timeRemaining / (sessionDurationSeconds * 1000)) * 100;
    if (percentRemaining < 10) return 'critical'; // Less than 10% time remaining
    if (percentRemaining < 25) return 'warning'; // Less than 25% time remaining
    return 'normal';
  };

  const urgency = getUrgencyLevel();

  return (
    <div className="flex items-center gap-2">
      {isExpired ? (
        <Badge variant="destructive" className="animate-pulse">
          <AlertCircle className="h-3 w-3 mr-1" />
          {label} Expired
        </Badge>
      ) : (
        <>
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}:</span>
          <Badge 
            variant={urgency === 'critical' ? 'destructive' : urgency === 'warning' ? 'secondary' : 'outline'}
            className={urgency === 'critical' ? 'animate-pulse' : ''}
          >
            {formatTime(timeRemaining)}
          </Badge>
        </>
      )}
    </div>
  );
}