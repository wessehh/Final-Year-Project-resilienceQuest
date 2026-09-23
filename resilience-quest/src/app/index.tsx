import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useTelemetry } from '@/hooks/useTelemetry';
import { HeaderBlock } from '@/components/dashboard/HeaderBlock';
import { QuestCard } from '@/components/dashboard/QuestCard';
import { BadgeGrid } from '@/components/dashboard/BadgeGrid';
import { TelemetryCard } from '@/components/dashboard/TelemetryCard';
import { AreaRiskCard } from '@/components/emergency/AreaRiskCard';

/**
 * Main dashboard Screen
 */
export default function App() {
  const { xp, tasks, toggleTask, isHydrated } = useApp();
  const { currentLocation, trackingStatus, reSyncTelemetry } = useTelemetry();

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
        {/* Core Gamification & Telemetry Dashboard */}
        <HeaderBlock xp={xp} />

        {/* Quest & Tasks */}
        <QuestCard tasks={tasks} onTaskToggle={toggleTask} />
        
        {/* Gamification Achievements & Badge Grid */}
        <BadgeGrid/>

        {/* Offline Area Risk & Vector Indicator */}
        <AreaRiskCard />

        {/* Hardware and Simulated Telemetry */}
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