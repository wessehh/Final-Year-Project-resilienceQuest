// badgeGrid.tsv converts earned XP into visual milestone
// badges, rank progress tracks, and unlocked tier status

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useApp } from '@/context/AppContext';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredXp: number;
}

const BADGES: Badge[] = [
  {
    id: 'badge_water',
    title: 'Hydro Shield',
    description: '3L clean drinking water secured.',
    icon: '💧',
    requiredXp: 50,
  },
  {
    id: 'badge_firstaid',
    title: 'First Responder',
    description: 'Complete emergency first-aid kit compiled.',
    icon: '🩹',
    requiredXp: 90,
  },
  {
    id: 'badge_food',
    title: 'Ration Master',
    description: '72-hour non-perishable food supply stocked.',
    icon: '🥫',
    requiredXp: 150,
  },
  {
    id: 'badge_legend',
    title: 'Sector Warden',
    description: 'Achieved maximum readiness milestone.',
    icon: '🛡️',
    requiredXp: 180,
  },
];

export const BadgeGrid: React.FC = () => {
  const { xp } = useApp();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🏆 Preparedness Badges</Text>
        <Text style={styles.countText}>
          {BADGES.filter((b) => xp >= b.requiredXp).length}/{BADGES.length} Unlocked
        </Text>
      </View>

      <View style={styles.grid}>
        {BADGES.map((badge) => {
          const isUnlocked = xp >= badge.requiredXp;
          const progressPct = Math.min(100, Math.round((xp / badge.requiredXp) * 100));

          return (
            <View
              key={badge.id}
              style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}
            >
              <View style={[styles.iconWrapper, isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
                <Text style={styles.icon}>{isUnlocked ? badge.icon : '🔒'}</Text>
              </View>

              <Text style={[styles.badgeTitle, !isUnlocked && styles.textLocked]}>
                {badge.title}
              </Text>
              <Text style={styles.badgeDescription} numberOfLines={2}>
                {badge.description}
              </Text>

              {/* Progress Track */}
              <View style={styles.trackBackground}>
                <View
                  style={[
                    styles.trackFill,
                    {
                      width: `${progressPct}%`,
                      backgroundColor: isUnlocked ? '#38a169' : '#dd6b20',
                    },
                  ]}
                />
              </View>

              <Text style={styles.xpStatus}>
                {isUnlocked ? 'UNLOCKED' : `${xp}/${badge.requiredXp} XP`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2d3748',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3182ce',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    alignItems: 'center',
  },
  badgeCardLocked: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.85,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconUnlocked: {
    backgroundColor: '#feebc8',
  },
  iconLocked: {
    backgroundColor: '#edf2f7',
  },
  icon: {
    fontSize: 22,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 2,
    textAlign: 'center',
  },
  textLocked: {
    color: '#a0aec0',
  },
  badgeDescription: {
    fontSize: 10,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 8,
    height: 26,
    lineHeight: 13,
  },
  trackBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  trackFill: {
    height: '100%',
  },
  xpStatus: {
    fontSize: 9,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 0.5,
  },
});