// created a new screen dedicated to the 
// survival guides (e.g. CPR, Water purification etc)
// from src/components/emergency/SurvivalGuides


import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SurvivalGuides } from '@/components/emergency/SurvivalGuides';

/**
 * GuidesScreen
 * Dedicated route for offline emergency survival manuals, first-aid protocols,
 * and disaster response instructional guides.
 */
export default function GuidesScreen() {
  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        {/* Full-width offline instructional guide module */}
        <SurvivalGuides />
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
});