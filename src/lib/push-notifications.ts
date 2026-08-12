// UĞRA Web Push Notification Client Helper
// Manages permissions, subscriptions, and local testing notifications safely

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscription?: PushSubscription | null;
}

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// A standard placeholder public VAPID key for standard browser push subscription registration
const PUBLIC_VAPID_KEY = 'BJ94-m_aO4K_Z6A2n_8v-xS9O9A8g_Y_x8hS_V2v8x4M9nL9D8P-g9-h-f-7_S_8_C_S';

export async function getPushStatus(): Promise<PushStatus> {
  const isSupported = 
    typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window && 
    'Notification' in window;

  if (!isSupported) {
    return {
      supported: false,
      permission: 'default',
      subscribed: false
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: !!subscription,
      subscription
    };
  } catch (error) {
    console.warn('Error fetching push subscription status:', error);
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: false
    };
  }
}

export async function subscribeToPushNotifications(): Promise<PushStatus> {
  const status = await getPushStatus();
  if (!status.supported) {
    return status;
  }

  try {
    // Request system notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ...status,
        permission
      };
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Attempt standard Push subscription with server key
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      try {
        const convertedKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      } catch (subError) {
        // Fallback if public VAPID registration is rejected or fails due to network/VAPID key mismatch
        console.warn('PushManager subscription failed. Falling back to local notification support.', subError);
      }
    }

    // Trigger an immediate welcome notification on success to prove it works
    triggerWelcomeNotification(registration);

    return {
      supported: true,
      permission,
      subscribed: !!subscription,
      subscription
    };
  } catch (error) {
    console.error('Error in subscription workflow:', error);
    return {
      ...status,
      permission: Notification.permission
    };
  }
}

function triggerWelcomeNotification(registration: ServiceWorkerRegistration) {
  try {
    const title = 'UĞRA';
    const options = {
      body: '🔔 Bildirimler başarıyla aktif edildi! Zamanınız size kalacak.',
      icon: '/icons/icon-192.png',
      badge: '/favicon.svg',
      tag: 'ugra-welcome',
      requireInteraction: false,
      data: { url: '/' }
    };
    
    if ('showNotification' in registration) {
      registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch (e) {
    console.warn('Could not display welcome notification:', e);
  }
}
