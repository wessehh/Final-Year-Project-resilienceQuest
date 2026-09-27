// This uses an up/down reorder UI that is touch friendly,
// and avoids gesture-handler native crashes on device builds

import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';

interface ProtocolStep {
  id: string;
  label: string;
  correctOrder: number;
}

const INITIAL_STEPS: ProtocolStep[] = [
  { id: 's3', label: '3. Call 995 for SCDF Ambulance and retrieve nearest AED', correctOrder: 2 },
  { id: 's1', label: '1. Check scene for danger & verify responsiveness', correctOrder: 0 },
  { id: 's4', label: '4. Apply AED pads and begin 30 chest compressions to 2 rescue breaths', correctOrder: 3 },
  { id: 's2', label: '2. Check for normal breathing for 10 seconds', correctOrder: 1 },
];

interface Props {
  onSuccessXP?: (xp: number) => void;
}

export const ProtocolSequencer: React.FC<Props> = ({ onSuccessXP }) => {
  const [steps, setSteps] = useState<ProtocolStep[]>(INITIAL_STEPS);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const moveStep = (index: number, direction: 'UP' | 'DOWN') => {
    if (isCompleted) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const updated = [...steps];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);
    setSteps(updated);
  };

  const handleVerifyOrder = () => {
    const isCorrect = steps.every((step, index) => step.correctOrder === index);

    if (isCorrect) {
      setIsCompleted(true);
      Alert.alert('🏆 Perfect Protocol Sequence!', 'You earned +250 XP for CPR/AED protocol mastery.');
      if (onSuccessXP) onSuccessXP(250);
    } else {
      Alert.alert('⚠️ Incorrect Sequence', 'Review emergency guidelines and rearrange the steps in correct order.');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🧩 Emergency Protocol Sequencer</Text>
        <Text style={styles.subtitle}>
          Arrange the Cardiac Arrest CPR/AED survival steps in exact order:
        </Text>
      </View>

      <View style={styles.listContainer}>
        {steps.map((item, index) => (
          <View key={item.id} style={[styles.stepItem, isCompleted && styles.stepItemSuccess]}>
            <Text style={styles.stepText}>{item.label}</Text>
            
            {!isCompleted && (
              <View style={styles.reorderControls}>
                <TouchableOpacity
                  disabled={index === 0}
                  style={[styles.arrowBtn, index === 0 && styles.disabledBtn]}
                  onPress={() => moveStep(index, 'UP')}
                >
                  <Text style={styles.arrowText}>▲</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={index === steps.length - 1}
                  style={[styles.arrowBtn, index === steps.length - 1 && styles.disabledBtn]}
                  onPress={() => moveStep(index, 'DOWN')}
                >
                  <Text style={styles.arrowText}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {!isCompleted ? (
        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOrder} activeOpacity={0.8}>
          <Text style={styles.verifyBtnText}>Check Sequence Order</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>✅ Protocol Mastered (+250 XP)</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 10,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a365d',
  },
  subtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  listContainer: {
    gap: 8,
  },
  stepItem: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItemSuccess: {
    backgroundColor: '#f0fff4',
    borderColor: '#68d391',
  },
  stepText: {
    fontSize: 12,
    color: '#2d3748',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  reorderControls: {
    flexDirection: 'column',
    gap: 4,
  },
  arrowBtn: {
    backgroundColor: '#ebf8ff',
    borderColor: '#3182ce',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 10,
    color: '#2b6cb0',
    fontWeight: '800',
  },
  verifyBtn: {
    backgroundColor: '#3182ce',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  successBadge: {
    backgroundColor: '#c6f6d5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  successBadgeText: {
    color: '#22543d',
    fontSize: 13,
    fontWeight: '800',
  },
});
