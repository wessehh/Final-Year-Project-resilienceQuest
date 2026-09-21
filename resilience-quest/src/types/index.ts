// Golbal Typescript Interfaces 
// centralise task and telemetry interfaces

export interface Task {
  id: number;
  text: string;
  completed: boolean;
  xpReward: number;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export type TrackingStatus = 
  | 'Initialising sensors...' 
  | 'Active' 
  | 'Active (Approximate)' 
  | 'Disabled' 
  | 'Unauthorised' 
  | 'Syncing...' 
  | 'Error';