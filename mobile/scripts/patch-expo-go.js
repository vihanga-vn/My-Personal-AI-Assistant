const fs = require('fs');
const path = require('path');

console.log('[patch-expo-go] Checking for Expo Go compatibility patches...');

// 1. Patch TopicSubscriptionModule.android.js in expo-notifications
const topicSubscriptionPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

if (fs.existsSync(topicSubscriptionPath)) {
  const content = fs.readFileSync(topicSubscriptionPath, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    const patchedContent = `import { requireOptionalNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
} catch (_) {}
export default mod || {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
//# sourceMappingURL=TopicSubscriptionModule.android.js.map
`;
    fs.writeFileSync(topicSubscriptionPath, patchedContent, 'utf8');
    console.log('[patch-expo-go] Successfully patched TopicSubscriptionModule.android.js for Expo Go.');
  } else {
    console.log('[patch-expo-go] TopicSubscriptionModule.android.js already patched.');
  }
}

// 2. Patch ExpoSpeechRecognitionModule.js in expo-speech-recognition
const speechRecognitionPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-speech-recognition',
  'build',
  'ExpoSpeechRecognitionModule.js'
);

if (fs.existsSync(speechRecognitionPath)) {
  const content = fs.readFileSync(speechRecognitionPath, 'utf8');
  if (content.includes('requireNativeModule("ExpoSpeechRecognition")') && !content.includes('requireOptionalNativeModule')) {
    const patchedContent = `import { requireOptionalNativeModule } from "expo";
let mod = null;
try {
  mod = requireOptionalNativeModule("ExpoSpeechRecognition");
} catch (_) {}
export const ExpoSpeechRecognitionModule = mod || {
  isRecognitionAvailable: async () => false,
  requestPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
  start: () => {},
  stop: () => {},
  abort: () => {},
  addListener: () => ({ remove: () => {} }),
};
const stop = ExpoSpeechRecognitionModule.stop ? ExpoSpeechRecognitionModule.stop.bind(ExpoSpeechRecognitionModule) : () => {};
const abort = ExpoSpeechRecognitionModule.abort ? ExpoSpeechRecognitionModule.abort.bind(ExpoSpeechRecognitionModule) : () => {};
ExpoSpeechRecognitionModule.abort = () => abort();
ExpoSpeechRecognitionModule.stop = () => stop();
//# sourceMappingURL=ExpoSpeechRecognitionModule.js.map
`;
    fs.writeFileSync(speechRecognitionPath, patchedContent, 'utf8');
    console.log('[patch-expo-go] Successfully patched ExpoSpeechRecognitionModule.js for Expo Go.');
  } else {
    console.log('[patch-expo-go] ExpoSpeechRecognitionModule.js already patched.');
  }
}
