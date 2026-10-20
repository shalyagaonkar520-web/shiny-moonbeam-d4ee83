import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Gets the existing unique anonymous device ID or generates a new one.
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('mintoo_device_id');
  if (!deviceId) {
    // Generate a unique anonymous ID using random string segments
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('mintoo_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Normalizes the user-agent and OS metadata, then writes the PWA installation
 * record to Firestore. Caches locally to prevent redundant write requests.
 */
export async function trackPWAInstallation(): Promise<void> {
  try {
    const isAlreadyLogged = localStorage.getItem('mintoo_pwa_installed_logged');
    if (isAlreadyLogged === 'true') {
      console.log('PWA installation already logged to Firestore.');
      return;
    }

    const deviceId = getOrCreateDeviceId();
    
    // Parse browser name from User Agent string
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    if (userAgent.indexOf("Firefox") > -1) {
      browser = "Firefox";
    } else if (userAgent.indexOf("SamsungBrowser") > -1) {
      browser = "Samsung Browser";
    } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
      browser = "Opera";
    } else if (userAgent.indexOf("Trident") > -1) {
      browser = "Internet Explorer";
    } else if (userAgent.indexOf("Edge") > -1 || userAgent.indexOf("Edg") > -1) {
      browser = "Edge";
    } else if (userAgent.indexOf("Chrome") > -1) {
      browser = "Chrome";
    } else if (userAgent.indexOf("Safari") > -1) {
      browser = "Safari";
    }

    // Parse platform/operating system
    let platform = 'Unknown';
    if (navigator.platform) {
      platform = navigator.platform;
    } else if ((navigator as any).userAgentData?.platform) {
      platform = (navigator as any).userAgentData.platform;
    }

    const appVersion = '1.3.0';

    // Persist to Firestore: using deviceId as the key guarantees duplicate prevention
    const installDocRef = doc(db, 'pwaInstalls', deviceId);
    await setDoc(installDocRef, {
      deviceId,
      installedAt: new Date().toISOString(),
      appVersion,
      browser,
      platform
    }, { merge: true });

    // Cache locally to bypass future checks
    localStorage.setItem('mintoo_pwa_installed_logged', 'true');
    console.log('PWA installation successfully tracked in Firestore!');
  } catch (error) {
    console.error('Error tracking PWA installation in Firestore:', error);
  }
}
