import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '@/services/storageService';
import { shelterService } from '@/services/shelterService';

export interface QuestTask {
  id: string;
  title: string;
  xpValue: number;
  completed: boolean;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface AppContextType {
  xp: number;
  userXp: number; // Alias for xp compatibility
  tasks: QuestTask[];
  completedTaskIds: string[]; // List of completed task IDs
  isEmergencyActive: boolean;
  isHydrated: boolean;
  
  // Location simulation state for demo suite overrides
  simulatedLocation: LocationCoords | null;
  
  // Task & XP actions
  toggleTask: (id: string) => void;
  completeTask: (id: string) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  toggleEmergencyMode: (active: boolean) => void;
  setSimulatedLocation: (location: LocationCoords | null) => void;
  
  // Bulk actions for developer suite and reset features
  completeAllTasks: () => void;
  resetAllData: () => void;

  // task cycling weekly
  simulatedWeekOffset: number;
  setSimulatedWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [xp, setXp] = useState<number>(0);
  const [tasks, setTasks] = useState<QuestTask[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  // task cycle weekly
  const [simulatedWeekOffset, setSimulatedWeekOffset] = useState<number>(0);

  // Stores override coordinates dispatched from the Dev Demo Suite
  const [simulatedLocation, setSimulatedLocation] = useState<LocationCoords | null>(null);

  // Derive completedTaskIds automatically from active task list state
  const completedTaskIds = tasks.filter((t) => t.completed).map((t) => t.id);

  useEffect(() => {
    const loadState = async () => {
      try {
        // 1. Hydrate core user state from storage
        const savedXp = await storageService.getXP();
        const savedTasks = await storageService.getTasks();
        setXp(savedXp);
        setTasks(savedTasks);

        // 2. Trigger SCDF shelter cache check (only fetches if stale or missing)
        shelterService.loadShelters().catch((err) => {
          console.warn('Background shelter sync deferred:', err);
        });

      } catch (error) {
        console.warn('Error during app hydration:', error);
      } finally {
        setIsHydrated(true);
      }
    };
    
    loadState();
  }, []);

  const addXp = async (amount: number) => {
    const newXp = Math.max(0, xp + amount);
    setXp(newXp);
    await storageService.saveXP(newXp);
  };

  const toggleTask = async (id: string, xpRewardOverride?: number) => {
    const existing = tasks.find((t) => t.id === id);
    let updatedTasks: QuestTask[];
    let xpDelta = 0;

    if (existing) {
      const nextState = !existing.completed;
      const taskXp = existing.xpValue || xpRewardOverride || 30;
      xpDelta = nextState ? taskXp : -taskXp;
      updatedTasks = tasks.map((t) =>
        t.id === id ? { ...t, completed: nextState } : t
      );
    } else {
      // First time completing this task
      const taskXp = xpRewardOverride || 30;
      xpDelta = taskXp;
      updatedTasks = [...tasks, { id, title: 'Quest Task', xpValue: taskXp, completed: true }];
    }

    const newXp = Math.max(0, xp + xpDelta);
    setXp(newXp);
    setTasks(updatedTasks);
    await storageService.saveXP(newXp);
    await storageService.saveTasks(updatedTasks);
  };

  const completeTask = async (id: string) => {
    const existingTask = tasks.find((t) => t.id === id);
    if (!existingTask || !existingTask.completed) {
      await toggleTask(id);
    }
  };

  const toggleEmergencyMode = (active: boolean) => {
    setIsEmergencyActive(active);
  };

  /** 
   * Bulk completes all tasks and calculates total XP in a single atomic update.
   */
  const completeAllTasks = async () => {
    // Standard default task IDs for demo fallback
    const defaultIds = ['q1', 'q2', 'q3', 'q4', 'q5'];
    
    let updatedTasks = tasks.map((t) => ({ ...t, completed: true }));
    
    // Ensure standard quest IDs are included if tasks array is empty
    defaultIds.forEach((id) => {
      if (!updatedTasks.some((t) => t.id === id)) {
        updatedTasks.push({ id, title: `Quest ${id}`, xpValue: 50, completed: true });
      }
    });

    const totalXp = updatedTasks.reduce((sum, t) => sum + t.xpValue, 0);

    setTasks(updatedTasks);
    setXp(totalXp);
    await storageService.saveTasks(updatedTasks);
    await storageService.saveXP(totalXp);
  };

  /**
   * Resets all tasks to incomplete and clears stored XP back to zero
   */
  const resetAllData = async () => {
    const updatedTasks = tasks.map((t) => ({ ...t, completed: false }));

    setTasks(updatedTasks);
    setXp(0);
    await storageService.saveTasks(updatedTasks);
    await storageService.saveXP(0);
  };

  return (
    <AppContext.Provider
      value={{
        xp,
        userXp: xp, // Alias for backwards compatibility
        tasks,
        completedTaskIds,
        isEmergencyActive,
        isHydrated,
        simulatedLocation,
        toggleTask,
        completeTask,
        addXp,
        toggleEmergencyMode,
        setSimulatedLocation,
        completeAllTasks,
        resetAllData,
        simulatedWeekOffset,
        setSimulatedWeekOffset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};