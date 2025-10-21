/**
 * Utility functions for practitioner-related operations
 */

/**
 * Get the display status text for a practitioner based on their online and in-service state
 * @param isOnline - Whether the practitioner is online
 * @param inService - Whether the practitioner is currently in service
 * @returns One of three strings: "Offline", "Online", or "In Service"
 */
export function getPractitionerStatusText(isOnline: boolean, inService: boolean): string {
  if (!isOnline) {
    return 'Offline';
  }
  if (inService) {
    return 'In Service';
  }
  return 'Online';
}

/**
 * Get the styling information for a practitioner status
 * @param isOnline - Whether the practitioner is online
 * @param inService - Whether the practitioner is currently in service
 * @returns Object with color scheme information for the status
 */
export function getPractitionerStatusStyle(isOnline: boolean, inService: boolean) {
  if (!isOnline) {
    return {
      badgeVariant: 'secondary' as const,
      badgeClass: 'bg-gray-500 text-white',
      dotColor: 'bg-gray-400',
      textColor: 'text-gray-500',
    };
  }
  if (inService) {
    return {
      badgeVariant: 'default' as const,
      badgeClass: 'bg-blue-500 text-white',
      dotColor: 'bg-blue-500',
      textColor: 'text-blue-500',
    };
  }
  return {
    badgeVariant: 'default' as const,
    badgeClass: 'bg-green-500 text-white',
    dotColor: 'bg-green-500',
    textColor: 'text-green-500',
  };
}

/**
 * Check if a practitioner is available to start a new session
 * @param isOnline - Whether the practitioner is online
 * @param inService - Whether the practitioner is currently in service
 * @returns True if the practitioner can accept new sessions (Online but not In Service)
 */
export function isPractitionerAvailable(isOnline: boolean, inService: boolean): boolean {
  return isOnline && !inService;
}