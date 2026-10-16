import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Helper to test connection to our local Express backend
  // Note: On Android emulator use 'http://10.0.2.2:5000/api/health', on physical device use your PC's LAN IP
  const checkBackendHealth = async () => {
    setLoading(true);
    setBackendStatus(null);
    try {
      // In web/emulator localhost works; on physical device Expo will reach via LAN IP
      const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const response = await fetch(`http://${host}:5000/api/health`);
      const data = await response.json();
      setBackendStatus({ success: true, message: data.message, timestamp: data.timestamp });
    } catch (err) {
      setBackendStatus({
        success: false,
        message: 'Could not connect to backend. Ensure backend is running (port 5000) and use your PC LAN IP if testing on physical phone.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Personal AI Assistant</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Milestone 1: Setup Verified</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Architecture & Security</Text>
          <Text style={styles.cardItem}>📱 Frontend: React Native with Expo (Ready)</Text>
          <Text style={styles.cardItem}>⚙️ Backend: Node.js + Express (Ready)</Text>
          <Text style={styles.cardItem}>🤖 AI Engine: Gemini API Free Tier (Backend only)</Text>
          <Text style={styles.cardItem}>🗄️ Database: MongoDB Atlas (Backend only)</Text>
          <View style={styles.securityNote}>
            <Text style={styles.securityText}>
              🔒 Security guarantee: Zero API keys or database credentials are stored on the mobile app.
            </Text>
          </View>
        </View>

        {/* Backend Connection Check */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Backend Connectivity Test</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={checkBackendHealth} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Test Backend Connection</Text>
            )}
          </TouchableOpacity>

          {backendStatus && (
            <View style={[styles.statusBox, backendStatus.success ? styles.statusSuccess : styles.statusError]}>
              <Text style={styles.statusBoxTitle}>
                {backendStatus.success ? '✅ Backend Connected' : '⚠️ Connection Info'}
              </Text>
              <Text style={styles.statusBoxText}>{backendStatus.message}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>Next: Milestone 2 — MongoDB Atlas Setup</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  cardItem: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  securityNote: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  securityText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusBoxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  statusBoxText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  footer: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
  },
});
