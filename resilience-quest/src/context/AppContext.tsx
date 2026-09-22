import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task } from '@/types';
import { loadSaveProgress, saveProgressToDisk } from '@/services/storageService';

// define the shape of the shared global application context state and actions
interface AppContextType {

    xp: number; // total user experience points accumulated
    tasks: Task[]; // List of active preparedness quest tasks 
    isEmergencyActive: boolean; // Flag to toggle crisis vs peacetime UI modes
    isHydrated: boolean; // sotrage hydration guard flag
    toggleTask: (id:number) => void; // handler to task task completion and calculate XP 
    toggleEmergencyMode: (active:boolean) => void; //handler to trigger emergency mode switch

}

// fallback initial task checklist if no saved progress exists on disk
const INITIAL_TASKS: Task[] = [

    { id: 1, text: 'Pack 3 litres of fresh drinking water', completed:false, xpReward:30 },
    { id: 2, text: 'Prepare non-perishable emergency rations', completed: false, xpReward: 30 },
    { id: 3, text: 'Secure an offline AM/FM pocket radio', completed: false, xpReward: 40 },

];

// create the context object
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global State Hooks
  const [xp, setXp] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);
  
  // Hydration state prevents rendering UI with stale or zeroed state on app launch
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // On mount, load persisted XP and quest progress from AsyncStorage
  useEffect(() => {
    const hydrateStorage = async () => {
      const { xp: savedXp, tasks: savedTasks } = await loadSaveProgress();
      
      // Only override default state if saved values exist on the device
      if (savedXp !== null) setXp(savedXp);
      if (savedTasks !== null) setTasks(savedTasks);
      
      // Release the splash/loading guard once storage reading completes
      setIsHydrated(true);
    };

    hydrateStorage();
  }, []);

  // Updates task completion status and recalculates total user XP
  const toggleTask = (id: number) => {
    let xpChange = 0;

    // Immutably map over tasks to toggle completion status and extract XP delta
    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        const nextState = !task.completed;
        // Grant XP if completed; revoke XP if user unchecks the task
        xpChange = nextState ? task.xpReward : -task.xpReward;
        return { ...task, completed: nextState };
      }
      return task;
    });

    // Ensure XP never drops below zero
    const newXp = Math.max(0, xp + xpChange);

    // Commit state updates to React state
    setTasks(updatedTasks);
    setXp(newXp);

    // Persist new state directly to local storage to maintain offline state consistency
    saveProgressToDisk(newXp, updatedTasks);
  };

  // Toggle crisis override mode across the app
  const toggleEmergencyMode = (active: boolean) => {
    setIsEmergencyActive(active);
  };

  return (
    <AppContext.Provider
      value={{
        xp,
        tasks,
        isEmergencyActive,
        isHydrated,
        toggleTask,
        toggleEmergencyMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Custom hook providing type-safe consumption of the global AppContext
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};