export function calculateRemainingTime(
  startedAt: string | null,
  durationSeconds: number
): number {
  if (!startedAt) return durationSeconds;
  
  const started = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - started) / 1000);
  
  return Math.max(0, durationSeconds - elapsed);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
