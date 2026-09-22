// Standalone developer page
import React from 'react';
import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { HazardSimulationControl } from '@/components/emergency/HazardSimulationControl';

export default function DevScreen() {
  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        <Text style={styles.title}>Developer & Presentation Controls</Text>
        <Text style={styles.subtitle}>
          Use these controls during project demonstrations to manipulate vector state and telemetry.
        </Text>
        
        <HazardSimulationControl />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { 
    flex: 1, 
    backgroundColor: '#f7fafc' 
},
  scrollCanvas: { 
    paddingTop: 60, 
    paddingBottom: 40, 
    paddingHorizontal: 16 
},
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1a202c', 
    marginBottom: 4 
},
  subtitle: { 
    fontSize: 13,
    color: '#718096',
    marginBottom: 16 
},

});