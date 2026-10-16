import React from 'react';
import { StyleSheet, SafeAreaView, View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';
import { NavigationProvider, useNavigation } from './src/navigation/NavigationContext';
import { TabBar } from './src/components/TabBar';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { MemoriesScreen } from './src/screens/MemoriesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

function MainApp() {
  const { currentTab } = useNavigation();

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'chat':
        return <ChatScreen />;
      case 'tasks':
        return <TasksScreen />;
      case 'memories':
        return <MemoriesScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={colors.background} />
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
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
