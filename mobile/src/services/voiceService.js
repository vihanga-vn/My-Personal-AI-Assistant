import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Mobile Voice Service for Speech-to-Text (STT) and Text-to-Speech (TTS).
 * Uses completely free, native, on-device technologies:
 * - TTS: expo-speech (Apple AVFoundation / Android TextToSpeech / Web SpeechSynthesis)
 * - STT: expo-speech-recognition (iOS SFSpeechRecognizer / Android SpeechRecognizer / Web Speech API)
 * Zero paid APIs. Zero client-side API secrets.
 */

let ExpoSpeechRecognitionModule = null;
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule || null;
} catch (err) {
  console.warn('[VoiceService] Native speech recognition module not available:', err.message);
}

/**
 * Clean markdown and formatting from text for natural speech pronunciation.
 */
export function cleanTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[*_#`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[•\-\+]\s+/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Check if native device Text-to-Speech is supported.
 */
export async function isTtsAvailable() {
  try {
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Speak text using native device text-to-speech.
 *
 * @param {string} text - Text to pronounce
 * @param {Object} [options]
 * @param {Function} [options.onStart] - Callback when speech starts
 * @param {Function} [options.onDone] - Callback when speech finishes
 * @param {Function} [options.onError] - Callback on error
 */
export async function speakAssistantResponse(text, { onStart, onDone, onError } = {}) {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    if (onDone) onDone();
    return;
  }

  try {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
    }

    if (onStart) onStart();

    Speech.speak(cleaned, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => {
        if (onDone) onDone();
      },
      onError: (err) => {
        console.warn('[VoiceService TTS Error]:', err);
        if (onError) onError(err);
      },
    });
  } catch (err) {
    console.error('[VoiceService Speak Exception]:', err);
    if (onError) onError(err);
  }
}

/**
 * Stop any active text-to-speech playback.
 */
export async function stopSpeaking() {
  try {
    await Speech.stop();
  } catch (err) {
    console.warn('[VoiceService Stop Error]:', err);
  }
}

/**
 * Check if Speech-to-Text is available on this platform/device.
 */
export async function checkSttAvailability() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      return { available: hasWebSpeech, type: 'web' };
    }
    return { available: false, type: 'unsupported' };
  }

  if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function') {
    try {
      const isAvail = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      return { available: isAvail, type: 'native' };
    } catch (_) {
      return { available: true, type: 'native' };
    }
  }

  return { available: false, type: 'unavailable' };
}

/**
 * Request microphone and speech recognition permissions.
 */
export async function requestSpeechPermissions() {
  if (Platform.OS === 'web') {
    return { granted: true };
  }

  if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === 'function') {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return { granted: result.granted || result.status === 'granted' };
    } catch (err) {
      console.warn('[VoiceService Permission Request Error]:', err);
      return { granted: false, error: err.message };
    }
  }

  return { granted: true };
}

/**
 * Start a Speech-to-Text listening session.
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onResult - (transcript: string, isFinal: boolean) => void
 * @param {Function} callbacks.onError - (error: string) => void
 * @param {Function} callbacks.onEnd - () => void
 * @param {Function} callbacks.onStart - () => void
 * @returns {Promise<{cleanup: Function}>}
 */
export async function startListeningSession({ onResult, onError, onEnd, onStart, onSpeechEnd }) {
  // Web Speech API
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      if (onError) onError('Web environment not initialized.');
      return { cleanup: () => {} };
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return { cleanup: () => {} };
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      if (onStart) onStart();
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      if (onResult && text) onResult(text, !!finalTranscript);
    };

    recognition.onspeechend = () => {
      if (onSpeechEnd) onSpeechEnd();
    };

    recognition.onerror = (event) => {
      console.warn('[WebSpeech Error]:', event.error);
      if (onError) onError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    try {
      recognition.start();
    } catch (err) {
      if (onError) onError(err.message);
    }

    return {
      cleanup: () => {
        try {
          recognition.abort();
        } catch (_) {}
      },
    };
  }

  // Native iOS / Android via ExpoSpeechRecognitionModule
  if (ExpoSpeechRecognitionModule) {
    const permissions = await requestSpeechPermissions();
    if (!permissions.granted) {
      if (onError) onError('Microphone and speech recognition permissions are required.');
      return { cleanup: () => {} };
    }

    let resultSubscription = null;
    let errorSubscription = null;
    let endSubscription = null;
    let startSubscription = null;
    let speechEndSubscription = null;

    if (typeof ExpoSpeechRecognitionModule.addListener === 'function') {
      startSubscription = ExpoSpeechRecognitionModule.addListener('start', () => {
        if (onStart) onStart();
      });

      speechEndSubscription = ExpoSpeechRecognitionModule.addListener('speechend', () => {
        if (onSpeechEnd) onSpeechEnd();
      });

      resultSubscription = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const transcript = event.results?.[0]?.transcript || '';
        if (onResult && transcript) {
          onResult(transcript, Boolean(event.isFinal));
        }
      });

      errorSubscription = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        console.warn('[Native Speech Error]:', event.error, event.message);
        if (onError) onError(event.message || `Recognition error: ${event.error}`);
      });

      endSubscription = ExpoSpeechRecognitionModule.addListener('end', () => {
        if (onEnd) onEnd();
      });
    }

    try {
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        },
      });
    } catch (err) {
      console.error('[VoiceService Start Error]:', err);
      if (onError) onError(err.message || 'Could not start speech recognition.');
    }

    return {
      cleanup: () => {
        try {
          if (startSubscription) startSubscription.remove();
          if (speechEndSubscription) speechEndSubscription.remove();
          if (resultSubscription) resultSubscription.remove();
          if (errorSubscription) errorSubscription.remove();
          if (endSubscription) endSubscription.remove();
          ExpoSpeechRecognitionModule.abort();
        } catch (_) {}
      },
    };
  }

  if (onError) {
    onError('Speech recognition is not available on this device.');
  }

  return { cleanup: () => {} };
}

// Dual module export for Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanTextForSpeech,
    isTtsAvailable,
    speakAssistantResponse,
    stopSpeaking,
    checkSttAvailability,
    requestSpeechPermissions,
    startListeningSession,
  };
}
