import React from 'react';
import { StyleSheet, SafeAreaView, View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';
import { NavigationProvider, useNavigation } from './src/navigation/NavigationContext';
import { TabBar } from './src/components/TabBar';

import { VoxScreen } from './src/screens/VoxScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { UpcomingEventsScreen } from './src/screens/UpcomingEventsScreen';
import { ChatScreen } from './src/screens/ChatScreen';

function MainApp() {
  const { currentTab } = useNavigation();

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'vox':
        return <VoxScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'events':
        return <UpcomingEventsScreen />;
      case 'chat':
        return <ChatScreen />;
      default:
        return <VoxScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#05070a" />
      <View style={styles.screenContainer}>
        {renderActiveScreen()}
      </View>
      <TabBar />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <MainApp />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#05070a',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#05070a',
  },
});
