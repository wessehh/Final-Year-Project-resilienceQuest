import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useTelemetry } from '@/hooks/useTelemetry';
import { HeaderBlock } from '@/components/dashboard/HeaderBlock';
import { QuestCard } from '@/components/dashboard/QuestCard';
import { TelemetryCard } from '@/components/dashboard/TelemetryCard';

export default function App() {
  // Consume shared state and functions from AppContext
  const { xp, tasks, toggleTask, isHydrated } = useApp();
  
  // Custom hook fetching GPS coordinates and background location tracking status
  const { currentLocation, trackingStatus, reSyncTelemetry } = useTelemetry();

  // Loading Gate: Block UI rendering until local storage hydration completes
  if (!isHydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3182ce" />
      </View>
    );
  }

  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        {/* Visual XP level progress indicator */}
        <HeaderBlock xp={xp} />

        {/* Interactive preparedness task checklist */}
        <QuestCard tasks={tasks} onTaskToggle={toggleTask} />

        {/* Real-time telemetry monitoring component */}
        <TelemetryCard
          trackingStatus={trackingStatus}
          currentLocation={currentLocation}
          onReSync={reSyncTelemetry}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  scrollCanvas: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
});