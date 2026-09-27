/**
 *  Gamified Checklist UI
 *  Renders the peacetime preparation checklist, integrates taskService, and handles interactive item toggles
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useApp, QuestTask } from '@/context/AppContext';
import { taskService, Task } from '@/services/taskService';

interface QuestCardProps {
  tasks?: QuestTask[];
  onTaskToggle?: (id: string) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({ tasks: propsTasks, onTaskToggle }) => {
  const { completedTaskIds = [], toggleTask, simulatedWeekOffset = 0 } = useApp();
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [weekLabel, setWeekLabel] = useState<string>('');

  useEffect(() => {
    if (!propsTasks) {
      const currentTasks = taskService.getWeeklyTasks(completedTaskIds, simulatedWeekOffset);
      const label = taskService.getCurrentWeekLabel(simulatedWeekOffset);
      setWeeklyTasks(currentTasks);
      setWeekLabel(label);
    }
  }, [completedTaskIds, propsTasks, simulatedWeekOffset]);

  const displayTasks = propsTasks
    ? propsTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: undefined,
        isCompleted: t.completed,
        xpReward: t.xpValue,
      }))
    : weeklyTasks;

  const completedCount = displayTasks.filter((t) => t.isCompleted).length;
  const totalCount = displayTasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = async (taskId: string, xpReward: number) => {
    if (onTaskToggle) {
      onTaskToggle(taskId);
      return;
    }

    if (toggleTask) {
      await toggleTask(taskId, xpReward);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {weekLabel ? <Text style={styles.badge}>{weekLabel.toUpperCase()}</Text> : null}
          <Text style={styles.title}>Emergency Preparedness Quests</Text>
        </View>
        <Text style={styles.progress}>
          {completedCount}/{totalCount} Completed
        </Text>
      </View>

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Task List */}
      <View style={styles.taskList}>
        {displayTasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskRow, task.isCompleted && styles.taskCompleted]}
            onPress={() => handleToggle(task.id, task.xpReward)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, task.isCompleted && styles.checkboxChecked]}>
              {task.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>

            <View style={styles.taskTextContent}>
              <Text style={[styles.taskTitle, task.isCompleted && styles.taskTitleDone]}>
                {task.title}
              </Text>
              {task.description ? (
                <Text style={styles.taskDescription} numberOfLines={1}>
                  {task.description}
                </Text>
              ) : null}
            </View>

            <Text style={[styles.xpBadge, task.isCompleted && styles.xpBadgeDone]}>
              +{task.xpReward} XP
            </Text>
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3182ce',
    letterSpacing: 0.5,
    marginBottom: 2,
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
  progressTrack: {
    height: 6,
    backgroundColor: '#edf2f7',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3182ce',
    borderRadius: 3,
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
  taskTextContent: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#a0aec0',
  },
  taskDescription: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
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
  xpBadgeDone: {
    color: '#22543d',
    backgroundColor: '#c6f6d5',
  },
});