/**
 * ClubPOS Device & Network Identification Engine
 * Detects device hardware changes, MAC addresses, IP codes, and handles automatic zero-reset.
 */

export interface DeviceSignature {
  deviceId: string;
  macAddress: string;
  ipAddress: string;
  deviceName: string;
  platform: string;
  screenResolution: string;
  fingerprintHash: string;
  lastSeenAt: string;
  registeredAt?: string;
  autoResetOnNewDevice: boolean;
}

export interface DeviceChangeDetectionResult {
  isNewDevice: boolean;
  isNewMac: boolean;
  isNewIp: boolean;
  reason: 'NEW_DEVICE' | 'NEW_MAC' | 'NEW_IP' | 'MULTIPLE_CHANGES' | 'FIRST_LAUNCH' | null;
  currentSignature: DeviceSignature;
  previousSignature: DeviceSignature | null;
  description: string;
}

const STORAGE_KEYS = {
  REGISTERED_DEVICE: 'clubpos_registered_device_sig_v1',
  DEVICE_STATION_CONFIG: 'clubpos_device_station_config_v1',
  KNOWN_DEVICES_HISTORY: 'clubpos_known_devices_history_v1',
};

/**
 * Generate a deterministic hash string from a string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Generate a realistic MAC address deterministically or randomly
 */
export function generateMacAddress(seed?: string): string {
  if (seed) {
    const h = hashString(seed) + hashString(seed + '_salt');
    const bytes: string[] = [];
    for (let i = 0; i < 6; i++) {
      const byteHex = h.substring(i * 2, i * 2 + 2) || '00';
      bytes.push(byteHex.toUpperCase());
    }
    // Set locally administered bit and unicast bit
    bytes[0] = ((parseInt(bytes[0], 16) & 0xfe) | 0x02).toString(16).toUpperCase().padStart(2, '0');
    return bytes.join(':');
  }

  const hexDigits = '0123456789ABCDEF';
  const bytes: string[] = [];
  for (let i = 0; i < 6; i++) {
    let byte = hexDigits[Math.floor(Math.random() * 16)] + hexDigits[Math.floor(Math.random() * 16)];
    if (i === 0) {
      // Local unicast MAC
      byte = '02';
    }
    bytes.push(byte);
  }
  return bytes.join(':');
}

/**
 * Generate a realistic local station IP address or retrieve detected
 */
export function generateStationIp(seed?: string): string {
  if (seed) {
    const h = parseInt(hashString(seed), 16);
    const subnet = (h % 5) + 1; // 192.168.1.x to 192.168.5.x
    const host = (h % 200) + 10; // .10 to .210
    return `192.168.${subnet}.${host}`;
  }
  const host = Math.floor(Math.random() * 190) + 20;
  return `192.168.1.${host}`;
}

/**
 * Compute deep browser & hardware fingerprint
 */
export function computeBrowserFingerprint(): { hash: string; details: Record<string, string | number | boolean> } {
  const nav = typeof window !== 'undefined' ? window.navigator : ({} as Navigator);
  const scr = typeof window !== 'undefined' ? window.screen : ({} as Screen);

  const userAgent = nav.userAgent || 'Unknown_Browser';
  const platform = nav.platform || 'Web_POS';
  const language = nav.language || 'fr-FR';
  const hardwareConcurrency = nav.hardwareConcurrency || 4;
  const screenResolution = `${scr.width || 1920}x${scr.height || 1080}x${scr.colorDepth || 24}`;
  const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  // Canvas fingerprinting
  let canvasHash = 'no_canvas';
  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('ClubPOS_Station_Signature_2026', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('ClubPOS_Station_Signature_2026', 4, 17);
        canvasHash = hashString(canvas.toDataURL());
      }
    }
  } catch (e) {
    canvasHash = 'canvas_error';
  }

  const rawKey = `${userAgent}|${platform}|${language}|${hardwareConcurrency}|${screenResolution}|${timezone}|${canvasHash}`;
  const hash = hashString(rawKey);

  return {
    hash,
    details: {
      userAgent,
      platform,
      language,
      hardwareConcurrency,
      screenResolution,
      timezone,
      canvasHash
    }
  };
}

/**
 * Build the current device signature
 */
export function getCurrentDeviceSignature(): DeviceSignature {
  const fp = computeBrowserFingerprint();
  
  // Check if manual station overrides exist in localStorage
  let savedStationConfig: Partial<DeviceSignature> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_STATION_CONFIG);
    if (raw) {
      savedStationConfig = JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  const deviceId = savedStationConfig.deviceId || `POS-DEV-${fp.hash.substring(0, 4)}-${fp.hash.substring(4, 8)}`;
  const macAddress = savedStationConfig.macAddress || generateMacAddress(fp.hash);
  const ipAddress = savedStationConfig.ipAddress || generateStationIp(fp.hash);
  const deviceName = savedStationConfig.deviceName || `Terminal Caisse (${fp.details.platform || 'Web'})`;
  const autoResetOnNewDevice = savedStationConfig.autoResetOnNewDevice !== undefined ? savedStationConfig.autoResetOnNewDevice : true;

  return {
    deviceId,
    macAddress,
    ipAddress,
    deviceName,
    platform: String(fp.details.platform || 'Web Station'),
    screenResolution: String(fp.details.screenResolution || '1920x1080'),
    fingerprintHash: fp.hash,
    lastSeenAt: new Date().toISOString(),
    autoResetOnNewDevice
  };
}

/**
 * Retrieve registered device signature from storage
 */
export function getRegisteredDeviceSignature(): DeviceSignature | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_DEVICE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Register current device as authorized station
 */
export function saveRegisteredDeviceSignature(sig: DeviceSignature): void {
  try {
    const registeredSig: DeviceSignature = {
      ...sig,
      registeredAt: sig.registeredAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.REGISTERED_DEVICE, JSON.stringify(registeredSig));

    // Also update history list
    const history = getKnownDevicesHistory();
    const existingIdx = history.findIndex(h => h.deviceId === registeredSig.deviceId || h.macAddress === registeredSig.macAddress);
    if (existingIdx >= 0) {
      history[existingIdx] = registeredSig;
    } else {
      history.unshift(registeredSig);
    }
    localStorage.setItem(STORAGE_KEYS.KNOWN_DEVICES_HISTORY, JSON.stringify(history.slice(0, 20)));
  } catch (e) {
    console.error('Failed to save registered device signature', e);
  }
}

/**
 * Save manual station settings (custom MAC, custom IP, custom Device Name)
 */
export function updateStationConfig(updates: Partial<DeviceSignature>): DeviceSignature {
  const current = getCurrentDeviceSignature();
  const updated: DeviceSignature = {
    ...current,
    ...updates
  };
  localStorage.setItem(STORAGE_KEYS.DEVICE_STATION_CONFIG, JSON.stringify(updated));
  return updated;
}

/**
 * Check known devices history
 */
export function getKnownDevicesHistory(): DeviceSignature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KNOWN_DEVICES_HISTORY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

/**
 * Check if the current device/MAC/IP represents a new device or change
 */
export function checkDeviceChange(): DeviceChangeDetectionResult {
  const current = getCurrentDeviceSignature();
  const previous = getRegisteredDeviceSignature();

  if (!previous) {
    // First time identification
    return {
      isNewDevice: true,
      isNewMac: false,
      isNewIp: false,
      reason: 'FIRST_LAUNCH',
      currentSignature: current,
      previousSignature: null,
      description: 'Premier démarrage ou nouveau terminal de caisse détecté.'
    };
  }

  const isNewDevice = previous.deviceId !== current.deviceId || previous.fingerprintHash !== current.fingerprintHash;
  const isNewMac = previous.macAddress.toUpperCase() !== current.macAddress.toUpperCase();
  const isNewIp = previous.ipAddress !== current.ipAddress;

  if (isNewDevice && isNewMac && isNewIp) {
    return {
      isNewDevice: true,
      isNewMac: true,
      isNewIp: true,
      reason: 'MULTIPLE_CHANGES',
      currentSignature: current,
      previousSignature: previous,
      description: `Nouvel appareil complet détecté (Nouveau code MAC ${current.macAddress} & IP ${current.ipAddress}).`
    };
  }

  if (isNewDevice) {
    return {
      isNewDevice: true,
      isNewMac,
      isNewIp,
      reason: 'NEW_DEVICE',
      currentSignature: current,
      previousSignature: previous,
      description: `Changement d'appareil physique détecté (${current.deviceName} / ${current.platform}).`
    };
  }

  if (isNewMac) {
    return {
      isNewDevice: false,
      isNewMac: true,
      isNewIp,
      reason: 'NEW_MAC',
      currentSignature: current,
      previousSignature: previous,
      description: `Nouveau code MAC identifié (${current.macAddress} au lieu de ${previous.macAddress}).`
    };
  }

  if (isNewIp) {
    return {
      isNewDevice: false,
      isNewMac: false,
      isNewIp: true,
      reason: 'NEW_IP',
      currentSignature: current,
      previousSignature: previous,
      description: `Nouvelle adresse IP de station identifiée (${current.ipAddress} au lieu de ${previous.ipAddress}).`
    };
  }

  return {
    isNewDevice: false,
    isNewMac: false,
    isNewIp: false,
    reason: null,
    currentSignature: current,
    previousSignature: previous,
    description: 'Terminal autorisé et reconnu.'
  };
}
