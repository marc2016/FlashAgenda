export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export const getNotificationPermissionState = (): NotificationPermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return Notification.permission as NotificationPermissionState;
  }
};

export const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const defaultOptions: NotificationOptions = {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options,
    };
    new Notification(title, defaultOptions);
  } catch (err) {
    console.error('Failed to show browser notification:', err);
  }
};

export const notifyNewItem = (itemTitle: string, authorName?: string) => {
  sendBrowserNotification('FlashAgenda: Neuer Agendapunkt ⚡', {
    body: authorName ? `"${itemTitle}" von ${authorName}` : `"${itemTitle}" wurde hinzugefügt.`,
    tag: `new-item-${Date.now()}`
  });
};
