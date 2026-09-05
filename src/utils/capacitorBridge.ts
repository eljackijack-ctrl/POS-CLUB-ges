import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Helper to check runtime environment
 */
export const isCapacitorNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getCapacitorPlatform = (): string => {
  return Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
};

/**
 * Initialize Capacitor runtime features on app mount
 */
export const initCapacitorApp = async (onHardwareBack?: () => void) => {
  if (!isCapacitorNative()) {
    return;
  }

  try {
    // 1. Configure Dark Status Bar for VIP Club UI
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#090b12' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (err) {
    console.debug('[Capacitor] StatusBar init ignored in non-native container:', err);
  }

  try {
    // 2. Hardware back button handling for Android
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (onHardwareBack) {
        onHardwareBack();
      } else if (canGoBack) {
        window.history.back();
      } else {
        // App can minimize or exit
        CapApp.minimizeApp();
      }
    });
  } catch (err) {
    console.debug('[Capacitor] App listeners ignored:', err);
  }
};

/**
 * Native Haptic Feedback with Web Vibration API fallback for loud club environments
 */
export const triggerHapticFeedback = async (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'order_validated' | 'payment_completed' = 'light'
) => {
  // 1. Try Native Capacitor Haptics
  if (isCapacitorNative()) {
    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'order_validated':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          setTimeout(async () => {
            try {
              await Haptics.notification({ type: NotificationType.Success });
            } catch {
              // ignore
            }
          }, 80);
          break;
        case 'payment_completed':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          setTimeout(async () => {
            try {
              await Haptics.notification({ type: NotificationType.Success });
            } catch {
              // ignore
            }
          }, 100);
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
      return;
    } catch (err) {
      console.debug('[Capacitor] Haptics native call failed:', err);
    }
  }

  // 2. Web Vibration API Fallback (Supported on Chrome Mobile, Android PWA, etc.)
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(25);
          break;
        case 'medium':
          navigator.vibrate(45);
          break;
        case 'heavy':
          navigator.vibrate(80);
          break;
        case 'success':
        case 'order_validated':
          // Crisp double pulse for successful order validation in loud nightclub
          navigator.vibrate([60, 40, 90]);
          break;
        case 'payment_completed':
          // Powerful triple pulse for cash/card/mobile encaissement
          navigator.vibrate([90, 40, 90, 40, 140]);
          break;
        case 'warning':
          navigator.vibrate([70, 50, 70]);
          break;
        case 'error':
          navigator.vibrate([100, 50, 100, 50, 100]);
          break;
        default:
          navigator.vibrate(30);
      }
    } catch (err) {
      console.debug('[Haptics] Web vibration fallback ignored:', err);
    }
  }
};

/**
 * Dedicated semantic haptic triggers for nightclub & bar workflow
 */
export const triggerOrderValidatedHaptic = () => triggerHapticFeedback('order_validated');
export const triggerPaymentCompletedHaptic = () => triggerHapticFeedback('payment_completed');
export const triggerSelectionHaptic = () => triggerHapticFeedback('light');
export const triggerActionHaptic = () => triggerHapticFeedback('medium');
export const triggerWarningHaptic = () => triggerHapticFeedback('warning');
export const triggerErrorHaptic = () => triggerHapticFeedback('error');
