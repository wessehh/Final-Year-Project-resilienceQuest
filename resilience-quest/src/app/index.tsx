import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import { useTelemetry } from '@/hooks/useTelemetry';
import { HeaderBlock } from '@/components/dashboard/HeaderBlock';
import { QuestCard } from '@/components/dashboard/QuestCard';
import { BadgeGrid } from '@/components/dashboard/BadgeGrid';
import { TelemetryCard } from '@/components/dashboard/TelemetryCard';
import { AreaRiskCard } from '@/components/emergency/AreaRiskCard';

/**
 * Main Dashboard Screen
 * Suppresses gamification by default during Crisis Mode while offering
 * a collapsible toggle for on-demand task and checklist access.
 */
export default function App() {
  const { xp, tasks, toggleTask, isHydrated, isEmergencyActive } = useApp();
  const { currentLocation, trackingStatus, reSyncTelemetry } = useTelemetry();

  // Local state to control collapsible access to gamification during emergencies
  const [showGamificationInCrisis, setShowGamificationInCrisis] = useState<boolean>(false);

  if (!isHydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3182ce" />
      </View>
    );
  }

  // Gamification is visible in peacetime OR when explicitly toggled on during a crisis
  const isGamificationVisible = !isEmergencyActive || showGamificationInCrisis;

  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        
        {/* CRISIS MODE: Priority Emergency Focus Card + Collapsible Toggle */}
        {isEmergencyActive && (
          <View style={styles.crisisFocusCard}>
            <View style={styles.crisisFocusHeader}>
              <Text style={styles.crisisFocusTitle}>⚠️ EMERGENCY FOCUS ACTIVE</Text>
              <Text style={styles.crisisFocusSub}>
                Gamification modules are suppressed during active threats to prioritize emergency routing.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.toggleGamificationBtn}
              onPress={() => setShowGamificationInCrisis(!showGamificationInCrisis)}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleGamificationBtnText}>
                {showGamificationInCrisis ? '🙈 Hide Gamification Elements' : '👁️ Show Preparedness Quests & XP'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Elevated Risk Card during Crisis */}
        {isEmergencyActive && <AreaRiskCard />}

        {/* GAMIFICATION MODULES */}
        {isGamificationVisible && (
          <>
            <HeaderBlock xp={xp} />
            <QuestCard tasks={tasks} onTaskToggle={toggleTask} />
            <BadgeGrid />
          </>
        )}

        {/* PEACETIME MODE: Standard position for Area Risk Card */}
        {!isEmergencyActive && <AreaRiskCard />}

        {/* Telemetry Status */}
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
  crisisFocusCard: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  crisisFocusHeader: {
    marginBottom: 10,
  },
  crisisFocusTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#c53030',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  crisisFocusSub: {
    fontSize: 11,
    color: '#742a2a',
    lineHeight: 15,
  },
  toggleGamificationBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleGamificationBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2d3748',
  },
});