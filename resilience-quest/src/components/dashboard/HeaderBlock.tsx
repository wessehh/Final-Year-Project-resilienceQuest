// XP & Branding Header
//Renders the top branding card and user progress metrics
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HeaderBlockProps {
  xp: number;
}

export const HeaderBlock: React.FC<HeaderBlockProps> = ({ xp }) => {
  return (
    <View style={styles.headerBlock}>
      <Text style={styles.brandTitle}>ResilienceQuest</Text>
      <Text style={styles.subTitle}>Empowering Localised Disaster Response</Text>
      <Text style={styles.xpReadout}>
        Progress: <Text style={styles.xpHighlight}>{xp} XP</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a365d',
  },
  subTitle: {
    fontSize: 14,
    color: '#0080ff',
    marginTop: 4,
  },
  xpReadout: {
    fontSize: 15,
    marginTop: 6,
    color: '#4a5568',
    fontWeight: '500',
  },
  xpHighlight: {
    color: '#3182ce',
    fontWeight: '700',
  },
});