// A structured offline accessible guid for crisis scenarios 
// e.g. CPR instructions, water purification, flood safety
// integrated into a new dedicated screen

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation for smooth expanding/collapsing on Android devices
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// TypeScript schema for offline survival and first-aid guides
export interface SurvivalGuide {
  id: string;
  title: string;
  category: 'First Aid' | 'Water & Sanitation' | 'Extreme Weather' | 'Structural';
  icon: string;
  summary: string;
  steps: string[];
}

// Cached offline survival guide dataset available during complete network blackout
const OFFLINE_GUIDES: SurvivalGuide[] = [
  {
    id: 'guide_001',
    title: 'Emergency Water Purification',
    category: 'Water & Sanitation',
    icon: '💧',
    summary: 'Essential techniques to make unpotable flood or rain water safe for drinking.',
    steps: [
      'Filter out large debris using clean cloth, coffee filters, or dense fabric.',
      'Bring water to a rolling boil for at least 1 full minute (3 minutes at high altitude).',
      'If boiling is impossible, add 2 drops of unscented liquid household bleach (5-6%) per liter of water.',
      'Stir thoroughly and let the treated water stand for at least 30 minutes before drinking.',
    ],
  },
  {
    id: 'guide_002',
    title: 'CPR & Airway Management',
    category: 'First Aid',
    icon: '🫀',
    summary: 'Hands-only Cardiopulmonary Resuscitation for non-breathing adult casualties.',
    steps: [
      'Check the immediate surroundings for hazards before approaching the victim.',
      'Call for emergency medical services (995 / 911 / 112) or dispatch an SOS signal.',
      'Place heel of your hand on the center of the chest with your other hand interlocked on top.',
      'Compress chest firmly at a rate of 100-120 beats per minute (to the rhythm of "Staying Alive").',
      'Continue uninterrupted compressions until emergency personnel arrive or victim recovers.',
    ],
  },
  {
    id: 'guide_003',
    title: 'Flash Flood & Rapid Evacuation',
    category: 'Extreme Weather',
    icon: '🌊',
    summary: 'Critical safety steps when trapped by rapidly rising floodwaters.',
    steps: [
      'Move immediately to high ground or the roof of a sturdy building.',
      'Never walk through moving water deeper than ankle height (6 inches can knock you down).',
      'Do not attempt to drive through flooded roads—vehicles float in as little as 12 inches of water.',
      'Disconnect main electrical switches if safe to do so before water enters the premises.',
    ],
  },
  {
    id: 'guide_004',
    title: 'Earthquake & Structural Collapse',
    category: 'Structural',
    icon: '🏚️',
    summary: 'Drop, Cover, and Hold On protocols during active tremors or building collapse.',
    steps: [
      'DROP down onto your hands and knees to prevent being knocked over.',
      'COVER your head and neck under a sturdy table, desk, or against an interior wall.',
      'HOLD ON to your shelter until all shaking completely stops.',
      'If trapped under debris, cover your face with clothing and tap on pipes/walls to signal rescuers.',
    ],
  },
];

/**
 * SurvivalGuides Component
 * Expandable offline instructional library providing step-by-step guidance 
 * for emergency response, first aid, and survival tactics.
 */
export const SurvivalGuides: React.FC = () => {
  // Local state tracking which guide card is currently expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search filter state for real-time offline keyword lookup
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * Toggles expansion state of a guide card with smooth layout animation.
   */
  const handleToggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter guides based on title, category, or summary text
  const filteredGuides = OFFLINE_GUIDES.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.cardContainer}>
      {/* Component Title Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>📖 OFFLINE KNOWLEDGE BASE</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>Emergency Survival Guides</Text>
      <Text style={styles.cardSubtitle}>
        Actionable first-aid protocols and disaster procedures cached locally.
      </Text>

      {/* Offline Search Filter Bar */}
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search guides (e.g., CPR, Water, Flood)..."
        placeholderTextColor="#a0aec0"
      />

      {/* Guide Cards Accordion List */}
      {filteredGuides.map((guide) => {
        const isExpanded = expandedId === guide.id;

        return (
          <View key={guide.id} style={styles.guideCard}>
            <TouchableOpacity
              style={styles.guideHeader}
              onPress={() => handleToggleExpand(guide.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.guideIcon}>{guide.icon}</Text>
              <View style={styles.titleWrapper}>
                <Text style={styles.guideTitle}>{guide.title}</Text>
                <Text style={styles.guideCategory}>{guide.category}</Text>
              </View>
              <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <Text style={styles.guideSummary}>{guide.summary}</Text>

            {/* Expanded Step-by-Step Instructions */}
            {isExpanded && (
              <View style={styles.stepsContainer}>
                <View style={styles.divider} />
                <Text style={styles.stepsHeading}>Actionable Steps:</Text>
                {guide.steps.map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeContainer: {
    backgroundColor: '#ebf8ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a202c',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#edf2f7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1a202c',
    marginBottom: 14,
  },
  guideCard: {
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  titleWrapper: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
  },
  guideCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3182ce',
    marginTop: 1,
  },
  expandChevron: {
    fontSize: 12,
    color: '#718096',
    paddingLeft: 8,
  },
  guideSummary: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 6,
    lineHeight: 16,
  },
  stepsContainer: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e0',
    marginVertical: 8,
  },
  stepsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumberBadge: {
    backgroundColor: '#3182ce',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 12,
    color: '#2d3748',
    flex: 1,
    lineHeight: 18,
  },
});
