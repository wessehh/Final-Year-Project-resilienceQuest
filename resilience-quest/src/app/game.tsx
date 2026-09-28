import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView } from 'react-native';
import { ProtocolSequencer } from '@/components/gamification/ProtocolSequencer';
import { useApp } from '@/context/AppContext';

export default function GameScreen() {
  const { addXp, xp } = useApp();

  const handleXPGranted = (xpAmount: number) => {
    addXp(xpAmount);
  };

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
});