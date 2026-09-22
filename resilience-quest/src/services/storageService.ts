import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuestTask {
  id: string;
  title: string;
  xpValue: number;
  completed: boolean;
}

const STORAGE_KEYS = {
  XP: '@resilience_quest_xp',
  TASKS: '@resilience_quest_tasks',
};

// Default initial tasks if local storage is empty
const DEFAULT_TASKS: QuestTask[] = [
  {
    id: 'task_001',
    title: 'Store 3 Liters of Clean Drinking Water',
    xpValue: 50,
    completed: false,
  },
  {
    id: 'task_002',
    title: 'Assemble Emergency First-Aid Kit',
    xpValue: 40,
    completed: false,
  },
  {
    id: 'task_003',
    title: 'Identify Local Safe Evacuation Center',
    xpValue: 30,
    completed: false,
  },
  {
    id: 'task_004',
    title: 'Prepare 72-Hour Non-Perishable Food Supply',
    xpValue: 60,
    completed: false,
  },
];

/**
 * storageService
 * Handles offline key-value persistence for gamification XP and quest progress.
 */
export const storageService = {
  /**
   * Retrieves persistent XP from AsyncStorage
   */
  async getXP(): Promise<number> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.XP);
      return value !== null ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Failed to load XP from AsyncStorage:', error);
      return 0;
    }
  },

  /**
   * Saves updated XP to AsyncStorage
   */
  async saveXP(xp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.XP, xp.toString());
    } catch (error) {
      console.error('Failed to save XP to AsyncStorage:', error);
    }
  },

  /**
   * Retrieves persistent quest tasks array from AsyncStorage
   */
  async getTasks(): Promise<QuestTask[]> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (value !== null) {
        return JSON.parse(value);
      }
      // If no stored tasks exist, return defaults and write them to storage
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
      return DEFAULT_TASKS;
    } catch (error) {
      console.error('Failed to load tasks from AsyncStorage:', error);
      return DEFAULT_TASKS;
    }
  },

  /**
   * Saves updated quest task states to AsyncStorage
   */
  async saveTasks(tasks: QuestTask[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save tasks to AsyncStorage:', error);
    }
  },
};