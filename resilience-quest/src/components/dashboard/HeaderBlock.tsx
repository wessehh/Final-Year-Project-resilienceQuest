// XP & Branding Header
//Renders the top branding card and user progress metrics
// calculate dynamic survivor ranks and display an XP level progress bar.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HeaderBlockProps {
  xp: number;
}

/**
 * Calculates user survivor title and level tier based on current XP
 */
function getSurvivorRank(xp:number) {
  if (xp >= 180) return { title: 'Sector Warden', level: 3, nextXp: 180, icon: '👑' };
  if (xp >= 90) return { title: 'Prepared Responder', level: 2, nextXp: 180, icon: '🎖️' };
  return { title: 'Novice Citizen', level: 1, nextXp: 90, icon: '🔰' };
}

export const HeaderBlock: React.FC<HeaderBlockProps> = ({ xp }) => {
  const rank = getSurvivorRank(xp);
  const progressPct = Math.min(100, Math.round((xp /rank.nextXp) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>RESILIENCE QUEST</Text>
          <View style={styles.rankBadge}>
            <Text style={styles.rankIcon}>{rank.icon}</Text>
            <Text style={styles.rankTitle}>{rank.title}</Text>
          </View>
        </View>

        <View style={styles.xpContainer}>
          <Text style={styles.xpValue}>{xp}</Text>
          <Text style={styles.xpLabel}>TOTAL XP</Text>
        </View>
      </View>

      {/* Level Progress Bar */}
      <View style={styles.levelProgressSection}>
        <View style={styles.levelLabelRow}>
          <Text style={styles.levelText}>Level {rank.level} Progress</Text>
          <Text style={styles.progressPercent}>{progressPct}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a202c',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '900',
    color: '#a0aec0',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankIcon: {
    fontSize: 16,
  },
  rankTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  xpContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#2d3748',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a5568',
  },
  xpValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#dd6b20',
  },
  xpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#cbd5e0',
  },
  levelProgressSection: {
    gap: 4,
  },
  levelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelText: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 11,
    color: '#dd6b20',
    fontWeight: '800',
  },
  track: {
    height: 6,
    backgroundColor: '#2d3748',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#dd6b20',
  },
});