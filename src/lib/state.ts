import type { WordGroup } from './types';

export interface AppState {
  isRunning: boolean;
  progress: number;
  progressStatus: string;
  error: string | null;
  groups: WordGroup[];
  groupSize: number;
}

export const initialState: AppState = {
  isRunning: false,
  progress: 0,
  progressStatus: 'Waiting for input',
  error: null,
  groups: [],
  groupSize: 10,
};

export function createState(): AppState {
  return { ...initialState };
}
