// Gamified Checklist UI
// Renders the peacetime preparation checklist and handles interactive item toggles
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { QuestTask } from '@/context/AppContext';

interface QuestCardProps {
  tasks: QuestTask[];
  onTaskToggle: (id: string) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({ tasks, onTaskToggle }) => {
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Preparedness Quests</Text>
        <Text style={styles.progress}>
          {completedCount}/{tasks.length} Completed
        </Text>
      </View>

      <View style={styles.taskList}>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskRow, task.completed && styles.taskCompleted]}
            onPress={() => onTaskToggle(task.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
              {task.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
              {task.title}
            </Text>
            <Text style={styles.xpBadge}>+{task.xpValue} XP</Text>
          </TouchableOpacity>
        ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2d3748',
  },
  progress: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3182ce',
  },
  taskList: {
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  taskCompleted: {
    backgroundColor: '#f0fff4',
    borderColor: '#c6f6d5',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#38a169',
    borderColor: '#38a169',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#a0aec0',
  },
  xpBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dd6b20',
    backgroundColor: '#feebc8',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
});