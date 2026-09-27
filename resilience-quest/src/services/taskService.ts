// rotate active user quests weekly based on the current ISO calendaor week number
// services/taskService.ts

export interface Task {
  id: string;
  title: string;
  description?: string;
  xpReward: number;
  isCompleted?: boolean;
}

/**
 * Weekly Emergency Preparedness Quest Pool
 * Tasks rotate dynamically or scale based on ISO week number.
 */
const QUEST_POOL: Omit<Task, 'isCompleted'>[] = [
  {
    id: 'q1',
    title: 'Locate Your Nearest SCDF Shelter',
    description: 'Use the Explore map to check the nearest public shelter to your home.',
    xpReward: 50,
  },
  {
    id: 'q2',
    title: 'Check Home First Aid Kit Supplies',
    description: 'Verify bandages, antiseptic wipes, and essential meds are unexpired.',
    xpReward: 30,
  },
  {
    id: 'q3',
    title: 'Review Nearest AED Locations',
    description: 'Find at least 2 public AED locations in your neighbourhood.',
    xpReward: 40,
  },
  {
    id: 'q4',
    title: 'Prepare Emergency Grab Bag',
    description: 'Pack key documents, power banks, torchlight, and clean water bottles.',
    xpReward: 60,
  },
  {
    id: 'q5',
    title: 'Save Emergency Contact Numbers',
    description: 'Store SCDF (995), Police (999), and family emergency numbers.',
    xpReward: 25,
  },
];

/**
 * Calculates current ISO Week number (1 to 52/53)
 */
function getISOWeekNumber(date: Date = new Date()): number {
  const tmpDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = tmpDate.getUTCDay() || 7;
  tmpDate.setUTCDate(tmpDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(tmpDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmpDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const taskService = {
  /**
   * Returns active weekly tasks formatted with completion status.
   * Rotates task selection deterministically based on the current calendar week.
   */
  getWeeklyTasks(completedTaskIds: string[] = []): Task[] {
    const currentWeek = getISOWeekNumber();
    
    // Pick 3 tasks deterministically based on current week number
    const startIndex = (currentWeek * 3) % QUEST_POOL.length;
    const selectedTasks: Task[] = [];

    for (let i = 0; i < 3; i++) {
      const taskIndex = (startIndex + i) % QUEST_POOL.length;
      const task = QUEST_POOL[taskIndex];
      
      selectedTasks.push({
        ...task,
        isCompleted: completedTaskIds.includes(task.id),
      });
    }

    return selectedTasks;
  },

  /**
   * Returns formatted ISO week title label for UI headers.
   */
  getCurrentWeekLabel(): string {
    const weekNum = getISOWeekNumber();
    return `Week ${weekNum} Challenge Set`;
  },
};