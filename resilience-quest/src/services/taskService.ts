// rotate active user quests weekly based on the current ISO calendaor week number
export interface WeeklyQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  category: 'PREPAREDNESS' | 'EQUIPMENT' | 'TRAINING';
  isCompleted: boolean;
}

const MASTER_QUEST_POOL: Omit<WeeklyQuest, 'isCompleted'>[] = [
  { id: 'q1', title: 'Locate Nearest SCDF Shelter', description: 'Open Explore tab and identify your nearest emergency shelter.', xpReward: 150, category: 'PREPAREDNESS' },
  { id: 'q2', title: 'Emergency Bag Inspection', description: 'Check expiry dates on canned food and water in your SG Ready Bag.', xpReward: 200, category: 'EQUIPMENT' },
  { id: 'q3', title: 'Find Nearby AED', description: 'Check AED directory and note down the nearest defibrillator in your sector.', xpReward: 100, category: 'PREPAREDNESS' },
  { id: 'q4', title: 'AED & CPR Protocol Review', description: 'Complete the drag-and-drop emergency sequencer game.', xpReward: 250, category: 'TRAINING' },
  { id: 'q5', title: 'Hazard Radius Test', description: 'Use Dev Suite to trigger a simulated flood alert and verify threat distance.', xpReward: 180, category: 'PREPAREDNESS' },
  { id: 'q6', title: 'First-Aid Kit Audit', description: 'Verify sterile bandages, antiseptic, and tourniquets in home kit.', xpReward: 120, category: 'EQUIPMENT' },
  { id: 'q7', title: 'Family Evacuation Route', description: 'Map out 2 clear exit paths from your residence to ground floor.', xpReward: 200, category: 'TRAINING' },
];

/**
 * Calculates ISO Week Number to deterministically seed weekly tasks
 */
function getISOWeekNumber(date: Date = new Date()): number {
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
}

export const taskService = {
  /**
   * Returns 3 tasks deterministically selected based on week of the year
   */
  getWeeklyTasks(completedTaskIds: string[] = []): WeeklyQuest[] {
    const weekNum = getISOWeekNumber();
    const totalQuests = MASTER_QUEST_POOL.length;

    // Pick 3 offsets based on week number
    const idx1 = weekNum % totalQuests;
    const idx2 = (weekNum + 2) % totalQuests;
    const idx3 = (weekNum + 4) % totalQuests;

    const selected = [
      MASTER_QUEST_POOL[idx1],
      MASTER_QUEST_POOL[idx2],
      MASTER_QUEST_POOL[idx3],
    ];

    return selected.map((q) => ({
      ...q,
      isCompleted: completedTaskIds.includes(q.id),
    }));
  },

  getCurrentWeekLabel(): string {
    return `Week ${getISOWeekNumber()} Challenge Set`;
  },
};
