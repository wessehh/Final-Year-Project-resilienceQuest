import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '@/services/storageService';

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
  tasks: QuestTask[];
  isEmergencyActive: boolean;
  isHydrated: boolean;
  // Location simulation state for demo suite overrides
  simulatedLocation: LocationCoords | null;
  toggleTask: (id: string) => void;
  toggleEmergencyMode: (active: boolean) => void;
  setSimulatedLocation: (location: LocationCoords | null) => void;
  // Bulk actions for developer suite and reset features
  completeAllTasks: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [xp, setXp] = useState<number>(0);
  const [tasks, setTasks] = useState<QuestTask[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  // Stores override coordinates dispatched from the Dev Demo Suite
  const [simulatedLocation, setSimulatedLocation] = useState<LocationCoords | null>(null);

  useEffect(() => {
    const loadState = async () => {
      const savedXp = await storageService.getXP();
      const savedTasks = await storageService.getTasks();
      setXp(savedXp);
      setTasks(savedTasks);
      setIsHydrated(true);
    };
    loadState();
  }, []);

  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        const nextState = !task.completed;
        const xpDelta = nextState ? task.xpValue : -task.xpValue;
        const newXp = Math.max(0, xp + xpDelta);
        setXp(newXp);
        storageService.saveXP(newXp);
        return { ...task, completed: nextState };
      }
      return task;
    });

    setTasks(updatedTasks);
    await storageService.saveTasks(updatedTasks);
  };

  const toggleEmergencyMode = (active: boolean) => {
    setIsEmergencyActive(active);
  };

  /** 
   * Bulk completes all tasks and calculates total XP in a single atomic update.
   */
  const completeAllTasks = async () => {
    const updatedTasks =  tasks.map((t) => ({ ...t, completed: true}));
    const totalXp = updatedTasks.reduce((sum, t) => sum + t.xpValue, 0);

    setTasks(updatedTasks);
    setXp(totalXp);
    await storageService.saveTasks(updatedTasks);
    await storageService.saveXP(totalXp);

  };

  /**
   * Resets all tasks to imcomplete and clears stored XP back to zero
   */
  const resetAllData = async () => {
    const updatedTasks = tasks.map((t) => ({ ...t, completed:false }));

    setTasks(updatedTasks);
    setXp(0);
    await storageService.saveTasks(updatedTasks);
    await storageService.saveXP(0);
  };


  return (
    <AppContext.Provider
      value={{
        xp,
        tasks,
        isEmergencyActive,
        isHydrated,
        simulatedLocation,
        toggleTask,
        toggleEmergencyMode,
        setSimulatedLocation,
        completeAllTasks,
        resetAllData,
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