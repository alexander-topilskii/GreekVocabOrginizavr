import { kmeans } from 'ml-kmeans';

import type { WordEntry, WordGroup } from './types';

const MIN_GROUP_SIZE = 5;
const MAX_GROUP_SIZE = 15;
const KMEANS_SEED = 42;

interface GroupDraft {
  label: string;
  items: WordEntry[];
  sortIndex: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function createWordGroupsFromLabels(entries: WordEntry[], labels: number[]): GroupDraft[] {
  const grouped = new Map<number, WordEntry[]>();
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const bucket = grouped.get(label) ?? [];
    bucket.push(entries[index]);
    grouped.set(label, bucket);
  }

  const drafts: GroupDraft[] = [];
  const sortedLabelPairs = Array.from(grouped.entries())
    .map(([label, items]) => ({
      label,
      items: [...items].sort((left, right) => left.id - right.id),
    }))
    .sort((left, right) => left.items[0].id - right.items[0].id);

  sortedLabelPairs.forEach((pair, index) => {
    drafts.push({
      label: `Group ${index + 1}`,
      items: pair.items,
      sortIndex: pair.items[0]?.id ?? Number.MAX_SAFE_INTEGER,
    });
  });

  return drafts;
}

function postProcessGroups(initialGroups: GroupDraft[]): WordGroup[] {
  const result: GroupDraft[] = [];
  const otherItems: WordEntry[] = [];

  for (const group of initialGroups) {
    if (group.items.length < MIN_GROUP_SIZE) {
      otherItems.push(...group.items);
      continue;
    }

    if (group.items.length > MAX_GROUP_SIZE) {
      const chunks = chunk(group.items, MAX_GROUP_SIZE);
      chunks.forEach((items, chunkIndex) => {
        result.push({
          label: `${group.label}.${chunkIndex + 1}`,
          items,
          sortIndex: items[0]?.id ?? Number.MAX_SAFE_INTEGER,
        });
      });
      continue;
    }

    result.push(group);
  }

  if (otherItems.length > 0) {
    const sortedOtherItems = [...otherItems].sort((left, right) => left.id - right.id);
    result.push({
      label: 'other',
      items: sortedOtherItems,
      sortIndex: sortedOtherItems[0]?.id ?? Number.MAX_SAFE_INTEGER,
    });
  }

  return result
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map((group, index) => ({
      id: `g-${index + 1}`,
      label: group.label,
      items: group.items,
    }));
}

function calcClusterCount(size: number, targetGroupSize: number): number {
  const normalizedTarget = Math.min(MAX_GROUP_SIZE, Math.max(MIN_GROUP_SIZE, targetGroupSize));
  return Math.max(1, Math.round(size / normalizedTarget));
}

export function clusterEntries(
  entries: WordEntry[],
  embeddings: number[][],
  targetGroupSize: number,
): WordGroup[] {
  if (entries.length === 0) {
    return [];
  }

  if (entries.length !== embeddings.length) {
    throw new Error('Embeddings count does not match entries count.');
  }

  if (entries.length <= MAX_GROUP_SIZE) {
    return [{
      id: 'g-1',
      label: entries.length < MIN_GROUP_SIZE ? 'other' : 'Group 1',
      items: [...entries].sort((left, right) => left.id - right.id),
    }];
  }

  const clusterCount = Math.min(entries.length, calcClusterCount(entries.length, targetGroupSize));
  const kmeansResult = kmeans(embeddings, clusterCount, {
    seed: KMEANS_SEED,
    initialization: 'kmeans++',
  });
  const initialGroups = createWordGroupsFromLabels(entries, kmeansResult.clusters);

  return postProcessGroups(initialGroups);
}
