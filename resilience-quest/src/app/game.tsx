import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { ProtocolSequencer } from '@/components/gamification/ProtocolSequencer';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';

export default function GameScreen() {
  const { addXp, xp, isCrisisMode } = useApp();
  const router = useRouter();

  const handleXPGranted = (xpAmount: number) => {
    addXp(xpAmount);
  };

  if (isCrisisMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.crisisContainer}>
          <Text style={styles.alertIcon}>🚨</Text>
          <Text style={styles.crisisTitle}>Emergency Mode Active</Text>
          <Text style={styles.crisisSubtitle}>
            The Preparedness Arcade is temporarily unavailable during an active emergency threat.
          </Text>
          <TouchableOpacity
            style={styles.safetyButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.safetyButtonText}>Return to Safety Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Stats / Level Summary */}
        <View style={styles.statsCard}>
          <View>
            <Text style={styles.statsTitle}>Emergency Preparedness Arcade</Text>
            <Text style={styles.statsSubtitle}>Master emergency protocols & earn XP</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>⚡ {xp} XP</Text>
          </View>
        </View>

        {/* CPR / AED Protocol Sequencer Challenge */}
        <ProtocolSequencer onSuccessXP={handleXPGranted} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  statsSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  xpText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  crisisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff5f5',
  },
  alertIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  crisisTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e53e3e',
    marginBottom: 8,
    textAlign: 'center',
  },
  crisisSubtitle: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  safetyButton: {
    backgroundColor: '#e53e3e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  safetyButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});