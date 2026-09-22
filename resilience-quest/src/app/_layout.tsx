import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppProvider } from '@/context/AppContext';
import { HazardAlertModal } from '@/components/emergency/HazardAlertModal';

/**
 * Root Layout Component
 * Serves as the top-level app wrapper providing state, thematic context, 
 * animated splash screens, and global overlay components across Expo Router.
 */
export default function TabLayout() {
  // System color scheme hook for automatic light/dark theme switching
  const colorScheme = useColorScheme();

  return (
    // AppProvider grants global context access (XP, tasks, emergency mode) to all routes
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Animated splash overlay shown on cold boot initialization */}
        <AnimatedSplashOverlay />

        {/* Core tab navigation layout (Dashboard index & Explore screen) */}
        <AppTabs />

        {/* Global Hazard Alert Modal rendered at root level to display over all active screens */}
        <HazardAlertModal />
      </ThemeProvider>
    </AppProvider>
  );
}