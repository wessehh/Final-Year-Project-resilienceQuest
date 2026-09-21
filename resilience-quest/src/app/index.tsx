// clean route

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Task } from '@/types';
import { loadSaveProgress, saveProgressToDisk } from '@/services/storageService';
import { useTelemetry } from '@/hooks/useTelemetry';
import { HeaderBlock } from '@/components/HeaderBlock';
import { QuestCard } from '@/components/QuestCard';
import { TelemetryCard } from '@/components/TelemetryCard';

const INITIAL_TASKS: Task[] = [
  { id: 1, text: 'Pack 3 litres of fresh drinking water', completed: false, xpReward: 30 },
  { id: 2, text: 'Prepare non-perishable emergency rations', completed: false, xpReward: 30 },
  { id: 3, text: 'Secure an offline AM/FM pocket radio', completed: false, xpReward: 40 },
];

export default function App() {
  const [xp, setXp] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const { currentLocation, trackingStatus, reSyncTelemetry } = useTelemetry();

  useEffect(() => {
    const initData = async () => {
      const { xp: savedXp, tasks: savedTasks } = await loadSaveProgress();
      if (savedXp !== null) setXp(savedXp);
      if (savedTasks !== null) setTasks(savedTasks);
    };
    initData();
  }, []);

  const handleTaskToggle = (id: number) => {
    let xpChange = 0;

    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        const nextState = !task.completed;
        xpChange = nextState ? task.xpReward : -task.xpReward;
        return { ...task, completed: nextState };
      }
      return task;
    });

    const newXp = Math.max(0, xp + xpChange);
    setTasks(updatedTasks);
    setXp(newXp);
    saveProgressToDisk(newXp, updatedTasks);
  };

  return (
    <View style={styles.viewport}>
      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        <HeaderBlock xp={xp} />
        <QuestCard tasks={tasks} onTaskToggle={handleTaskToggle} />
        <TelemetryCard
          trackingStatus={trackingStatus}
          currentLocation={currentLocation}
          onReSync={reSyncTelemetry}
        />
      </ScrollView>
    </View>
  );
}

// --------style------------
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