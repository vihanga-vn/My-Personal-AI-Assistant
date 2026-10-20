import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

/**
 * Centralized Backend API Configuration for Personal AI Assistant
 * ================================================================
 *
 * Target Device Configuration Guide:
 *
 * 1. Physical Android or iOS Device (via Expo Go):
 *    - Automatically discovers your computer's IP using Expo Constants and
 *      Metro bundler URL. Adapts dynamically if your computer IP changes.
 *    - Falls back to DEV_LAN_IP if auto-discovery is unavailable.
 *    - CURRENT MACHINE IP: '192.168.1.2'
 *
 * 2. Android Emulator (Android Studio):
 *    - In an emulator, localhost (127.0.0.1) refers to the virtual device itself.
 *    - Set `USE_ANDROID_EMULATOR = true` below to route traffic to 'http://10.0.2.2:5000'
 *      (the special Android emulator loopback alias for your host machine).
 *
 * 3. Web or iOS Simulator:
 *    - Connects directly to 'http://localhost:5000'.
 *
 * How to update if your laptop's Wi-Fi / LAN IP changes:
 *    1. Open PowerShell or Command Prompt and run: `ipconfig`
 *    2. Note the "IPv4 Address" (e.g. 192.168.1.x) under your active Wi-Fi or Ethernet adapter.
 *    3. Update `DEV_LAN_IP` below with your new IP.
 */

// Port on which the Express backend server is listening
export const BACKEND_PORT = 5000;

// Your computer's current LAN IPv4 address (fallback)
export const DEV_LAN_IP = '192.168.1.2';

// Set to true ONLY when running on an Android Studio Emulator
export const USE_ANDROID_EMULATOR = false;

/**
 * Extracts the host IP dynamically from Expo packager / Metro bundler.
 * In Expo Go, this automatically grabs your computer's IP without manual edits.
 *
 * @returns {string|null} Detected host IP or hostname
 */
export const getDetectedMetroHost = () => {
  try {
    // 1. Check Expo Constants hostUri (standard in modern Expo SDKs)
    const hostUri = Constants?.expoConfig?.hostUri
      || Constants?.manifest?.debuggerHost
      || Constants?.manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }

    // 2. Check NativeModules SourceCode scriptURL
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^(?:https?|exp):\/\/([^:/]+)/i);
      if (match && match[1]) {
        const detected = match[1];
        if (detected !== 'localhost' && detected !== '127.0.0.1') {
          return detected;
        }
      }
    }
  } catch (_) {
    // Ignore runtime inspection errors
  }
  return null;
};

/**
 * Resolves the backend base URL based on platform and development environment.
 * Single source of truth for the entire mobile app.
 *
 * @returns {string} Fully qualified backend base URL (e.g. 'http://192.168.1.3:5000')
 */
export const getApiBaseUrl = () => {
  // Web browser
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}`;
  }

  // Android Emulator explicitly enabled
  if (Platform.OS === 'android' && USE_ANDROID_EMULATOR) {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }

  // Auto-detect from Metro bundler (works seamlessly for Expo Go on physical phones)
  const detectedHost = getDetectedMetroHost();
  if (detectedHost) {
    return `http://${detectedHost}:${BACKEND_PORT}`;
  }

  // Physical Android or iOS device: fallback to configured LAN IP
  if (DEV_LAN_IP) {
    return `http://${DEV_LAN_IP}:${BACKEND_PORT}`;
  }

  // Fallback defaults
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

// Export LAN_HOST_URL for backward compatibility
export const LAN_HOST_URL = `http://${DEV_LAN_IP}:${BACKEND_PORT}`;

