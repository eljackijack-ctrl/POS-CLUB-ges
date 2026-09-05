/**
 * Offline Sync & PWA Service Worker Manager
 * Provides offline detection, cache inspection, and PWA installation prompt
 */

export interface OfflineStatusState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  isInstallable: boolean;
  lastSyncTime: string;
  cacheStorageSizeKB: number;
  localStorageSizeKB: number;
  syncQueueCount: number;
}

type StatusListener = (status: OfflineStatusState) => void;

class OfflineSyncManager {
  private listeners: Set<StatusListener> = new Set();
  private deferredPrompt: any = null;
  private state: OfflineStatusState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isServiceWorkerReady: false,
    isInstallable: false,
    lastSyncTime: new Date().toISOString(),
    cacheStorageSizeKB: 0,
    localStorageSizeKB: 0,
    syncQueueCount: 0
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Listen for PWA installation prompt
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        this.deferredPrompt = e;
        this.updateState({ isInstallable: true });
      });

      // App installed event
      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.updateState({ isInstallable: false });
        console.log('[PWA] ClubPOS a été installé avec succès sur cet appareil.');
      });

      // Calculate initial sizes
      this.calculateStorageSizes();
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    this.updateState({ 
      isOnline,
      lastSyncTime: new Date().toISOString()
    });
  }

  private updateState(partial: Partial<OfflineStatusState>) {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn(this.state));
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public getState(): OfflineStatusState {
    return this.state;
  }

  public async registerServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    // In development mode or iframe preview, unregister to avoid serving stale bundled React instances
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[Service Worker] Enregistré avec succès :', registration.scope);
      this.updateState({ isServiceWorkerReady: true });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Service Worker] Nouvelle version disponible en cache.');
            }
          });
        }
      });

      await this.calculateStorageSizes();
      return true;
    } catch (error) {
      console.warn('[Service Worker] Erreur d\'enregistrement (mode développement ou iframe) :', error);
      return false;
    }
  }

  public async promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.updateState({ isInstallable: false });
      return outcome;
    } catch (err) {
      console.error('[PWA] Erreur lors de l\'invite d\'installation :', err);
      return 'unavailable';
    }
  }

  public async calculateStorageSizes(): Promise<{ localStorageKB: number; cacheKB: number }> {
    let localStorageKB = 0;
    let cacheKB = 0;

    // Calculate localStorage size
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        let total = 0;
        for (const x in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, x)) {
            total += (localStorage[x].length + x.length) * 2;
          }
        }
        localStorageKB = Math.round(total / 1024);
      } catch (e) {
        console.warn('Erreur calcul localStorage', e);
      }
    }

    // Calculate Cache Storage size if available
    if (typeof window !== 'undefined' && 'caches' in window && 'navigator' in window && 'storage' in navigator && navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          cacheKB = Math.round(estimate.usage / 1024);
        }
      } catch (e) {
        console.warn('Erreur calcul cache storage', e);
      }
    }

    this.updateState({
      localStorageSizeKB: localStorageKB,
      cacheStorageSizeKB: cacheKB
    });

    return { localStorageKB, cacheKB };
  }

  public async forceRefreshCache(): Promise<void> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }
        await this.registerServiceWorker();
        window.location.reload();
      } catch (err) {
        console.error('Erreur rafraîchissement cache', err);
      }
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();
