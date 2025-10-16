// Notification utilities for playing sounds and showing notifications

/**
 * Play a notification sound using the Web Audio API
 * This creates a simple beep sound without needing an external audio file
 */
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure the sound
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    // Volume envelope (fade in and out)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);

    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);

    // Clean up
    setTimeout(() => {
      oscillator.disconnect();
      gainNode.disconnect();
    }, 300);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  }
}

/**
 * Show a browser notification if permissions are granted
 */
export function showBrowserNotification(title: string, body: string, icon?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'allinya-notification',
        requireInteraction: false,
      });

      // Auto-close after 4 seconds
      setTimeout(() => {
        notification.close();
      }, 4000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }
}