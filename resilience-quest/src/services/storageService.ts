// AsyncStorage Reader/Writer
// handles offline data persistence via @react-native-async-storage/async-storage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '@/types';

const STORAGE_KEYS = {
  XP: '@RQ_USER_XP',
  TASKS: '@RQ_TASK_STATE',
};

export const saveProgressToDisk = async (xp: number, tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.XP, xp.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error('AsyncStorage write collision:', error);
  }
};

export const loadSaveProgress = async (): Promise<{ xp: number | null; tasks: Task[] | null }> => {
  try {
    const storedXp = await AsyncStorage.getItem(STORAGE_KEYS.XP);
    const storedTasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);

    return {
      xp: storedXp !== null ? parseInt(storedXp, 10) : null,
      tasks: storedTasks !== null ? JSON.parse(storedTasks) : null,
    };
  } catch (error) {
    console.error('Failed parsing local storage matrix:', error);
    return { xp: null, tasks: null };
  }
};