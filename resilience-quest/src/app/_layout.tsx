import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppProvider } from '@/context/AppContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    // Top-level AppProvider ensures global state is accessible across all route screens
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Animated splash overlay for smooth startup transition */}
        <AnimatedSplashOverlay />
        
        {/* Main Expo Router tab navigation tree */}
        <AppTabs />
      </ThemeProvider>
    </AppProvider>
  );
}
