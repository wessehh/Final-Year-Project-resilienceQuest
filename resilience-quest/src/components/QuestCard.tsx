// Gamified Checklist UI
// Renders the peacetime preparation checklist and handles interactive item toggles
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Task } from '@/types';

interface QuestCardProps {
  tasks: Task[];
  onTaskToggle: (id: number) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({ tasks, onTaskToggle }) => {
  return (
    <View style={styles.componentCard}>
      <Text style={styles.sectionHeading}>Active Quests: Peacetime Prep</Text>
      <Text style={styles.bodyDescription}>
        Complete physical preparation objectives to earn XP!
      </Text>

      {tasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          style={[styles.taskItem, task.completed && styles.taskItemChecked]}
          onPress={() => onTaskToggle(task.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxMetric, task.completed && styles.checkboxActive]}>
            {task.completed && <Text style={styles.checkmarkText}>✓</Text>}
          </View>

          <Text style={[styles.taskLabel, task.completed && styles.taskLabelCrossed]}>
            {task.text} (+{task.xpReward} XP)
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  componentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3f3e3f',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  bodyDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  taskItemChecked: {
    backgroundColor: '#f0fff4',
    borderColor: '#c6f6d5',
  },
  checkboxMetric: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#38a169',
    borderColor: '#38a169',
  },
  taskLabel: {
    fontSize: 13,
    color: '#4a5568',
    fontWeight: '500',
    flex: 1,
  },
  taskLabelCrossed: {
    textDecorationLine: 'line-through',
    color: '#a0aec0',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
  },
});
