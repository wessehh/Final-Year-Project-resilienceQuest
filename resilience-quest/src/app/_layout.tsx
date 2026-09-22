import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppProvider, useApp } from '@/context/AppContext';
import { HazardAlertModal } from '@/components/emergency/HazardAlertModal';

/**
 * Sticky alert banner visible across all tabs during an active emergency state.
 */
function GlobalCrisisBanner() {
  const { isEmergencyActive } = useApp();

  if (!isEmergencyActive) return null;

  return (
    <View style={styles.bannerContainer}>
      <Text style={styles.bannerIcon}>🚨</Text>
      <View style={styles.bannerTextContainer}>
        <Text style={styles.bannerTitle}>CRISIS MODE ACTIVE</Text>
        <Text style={styles.bannerSubtitle}>
          Offline hazard alerts & emergency routing priority engaged.
        </Text>
      </View>
    </View>
  );
}

/**
 * Inner layout wrapper consuming AppContext and ThemeProvider
 */
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Cold boot animated splash screen */}
      <AnimatedSplashOverlay />

      {/* Persistent Crisis Banner rendered directly above navigation */}
      <GlobalCrisisBanner />

      {/* Primary tab navigation layout */}
      <AppTabs />

      {/* Global Hazard Alert Modal */}
      <HazardAlertModal />
    </ThemeProvider>
  );
}

/**
 * Root Layout Component
 * Top-level wrapper providing global AppContext across Expo Router.
 */
export default function TabLayout() {
  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#c53030',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#9b2c2c',
    zIndex: 9999,
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: '#fed7d7',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});