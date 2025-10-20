import { lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load the VideoRoom component which contains Agora SDK
const VideoRoom = lazy(() => import('./VideoRoom'));

interface VideoRoomLazyProps {
  sessionId: string;
  channelName: string;
  uid: string;
  currentUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  otherUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  remainingTime: number;
  onLeave: () => void;
}

export default function VideoRoomLazy(props: VideoRoomLazyProps) {
  return (
    <Suspense 
      fallback={
        <Card className="flex items-center justify-center min-h-[600px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading video room...</p>
          </div>
        </Card>
      }
    >
      <VideoRoom {...props} />
    </Suspense>
  );
}