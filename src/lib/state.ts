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

function cloneGroups(groups: WordGroup[]): WordGroup[] {
  return groups.map((group) => ({
    ...group,
    items: [...group.items],
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function removeItemFromGroup(groups: WordGroup[], groupId: string, itemId: number): WordGroup[] {
  const nextGroups = cloneGroups(groups);
  const group = nextGroups.find((item) => item.id === groupId);
  if (!group) {
    return groups;
  }

  const itemIndex = group.items.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) {
    return groups;
  }

  group.items.splice(itemIndex, 1);
  return nextGroups;
}

export function removeGroup(groups: WordGroup[], groupId: string): WordGroup[] {
  const groupExists = groups.some((group) => group.id === groupId);
  if (!groupExists) {
    return groups;
  }

  return groups.filter((group) => group.id !== groupId);
}

export function moveItem(
  groups: WordGroup[],
  sourceGroupId: string,
  itemId: number,
  targetGroupId: string,
  targetIndex: number,
): WordGroup[] {
  const sourceGroupIndex = groups.findIndex((group) => group.id === sourceGroupId);
  const targetGroupIndex = groups.findIndex((group) => group.id === targetGroupId);
  if (sourceGroupIndex < 0 || targetGroupIndex < 0) {
    return groups;
  }

  const sourceItemIndex = groups[sourceGroupIndex].items.findIndex((item) => item.id === itemId);
  if (sourceItemIndex < 0) {
    return groups;
  }

  const nextGroups = cloneGroups(groups);
  const sourceGroup = nextGroups[sourceGroupIndex];
  const targetGroup = nextGroups[targetGroupIndex];
  const [movingItem] = sourceGroup.items.splice(sourceItemIndex, 1);
  if (!movingItem) {
    return groups;
  }

  let safeTargetIndex = clamp(targetIndex, 0, targetGroup.items.length);
  if (sourceGroupId === targetGroupId && sourceItemIndex < safeTargetIndex) {
    safeTargetIndex -= 1;
  }

  targetGroup.items.splice(safeTargetIndex, 0, movingItem);
  return nextGroups;
}

export function moveGroup(
  groups: WordGroup[],
  sourceGroupId: string,
  targetGroupId: string,
): WordGroup[] {
  if (sourceGroupId === targetGroupId) {
    return groups;
  }

  const sourceIndex = groups.findIndex((group) => group.id === sourceGroupId);
  const targetIndex = groups.findIndex((group) => group.id === targetGroupId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return groups;
  }

  const nextGroups = cloneGroups(groups);
  const [movingGroup] = nextGroups.splice(sourceIndex, 1);
  if (!movingGroup) {
    return groups;
  }

  nextGroups.splice(targetIndex, 0, movingGroup);
  return nextGroups;
}

export function createEmptyGroup(groups: WordGroup[]): WordGroup[] {
  const usedIds = new Set(groups.map((group) => group.id));
  let idCounter = 1;
  while (usedIds.has(`g-${idCounter}`)) {
    idCounter += 1;
  }

  const EMPTY_GROUP_PREFIX = 'Новый список';
  const existingLabels = new Set(groups.map((group) => group.label.trim()));
  let nextLabel = EMPTY_GROUP_PREFIX;
  let suffix = 2;
  while (existingLabels.has(nextLabel)) {
    nextLabel = `${EMPTY_GROUP_PREFIX} ${suffix}`;
    suffix += 1;
  }

  const nextGroup: WordGroup = {
    id: `g-${idCounter}`,
    label: nextLabel,
    items: [],
  };

  return [...groups, nextGroup];
}

export function renameGroup(groups: WordGroup[], groupId: string, newLabel: string): WordGroup[] {
  const normalizedLabel = newLabel.trim();
  if (normalizedLabel.length === 0) {
    return groups;
  }

  const groupIndex = groups.findIndex((group) => group.id === groupId);
  if (groupIndex < 0 || groups[groupIndex].label === normalizedLabel) {
    return groups;
  }

  const nextGroups = cloneGroups(groups);
  nextGroups[groupIndex].label = normalizedLabel;
  return nextGroups;
}
