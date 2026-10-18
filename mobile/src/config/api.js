import { Platform, NativeModules } from 'react-native';

/**
 * Centralized Backend API Configuration for Personal AI Assistant
 * ================================================================
 *
 * Target Device Configuration Guide:
 *
 * 1. Physical Android or iOS Device (via Expo Go):
 *    - The device connects to your computer over Wi-Fi / Local Area Network.
 *    - The app will automatically extract your computer's IP from the Metro
 *      bundler connection (NativeModules.SourceCode.scriptURL).
 *    - If auto-detection cannot resolve, it falls back to DEV_LAN_IP below.
 *    - CURRENT MACHINE IP: '192.168.1.3'
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

// Your computer's current LAN IPv4 address.
// Automatically updated to match current Ethernet/Wi-Fi adapter IP (192.168.1.3).
export const DEV_LAN_IP = '192.168.1.3';

// Set to true ONLY when running on an Android Studio Emulator
export const USE_ANDROID_EMULATOR = false;

/**
 * Extracts the host IP from React Native's Metro bundler script URL.
 * In Expo Go development mode, the JavaScript bundle is fetched from your computer's IP (e.g. 192.168.1.3:8081).
 *
 * @returns {string|null} Detected host IP or hostname
 */
export const getDetectedMetroHost = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      // Matches http://192.168.1.3:8081/... or exp://192.168.1.3:8081/...
      const match = scriptURL.match(/^(?:https?|exp):\/\/([^:/]+)/i);
      if (match && match[1]) {
        const detected = match[1];
        // Ensure it's not a loopback address
        if (detected !== 'localhost' && detected !== '127.0.0.1') {
          return detected;
        }
      }
    }
  } catch (_) {
    // NativeModules.SourceCode might not be available in non-standard runtimes
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

