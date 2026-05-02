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

function dotProduct(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let result = 0;
  for (let index = 0; index < length; index += 1) {
    result += left[index] * right[index];
  }
  return result;
}

function vectorNorm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0));
}

function cosineSimilarity(left: number[], right: number[]): number {
  const leftNorm = vectorNorm(left);
  const rightNorm = vectorNorm(right);
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dotProduct(left, right) / (leftNorm * rightNorm);
}

function buildMeaningfulLabel(items: WordEntry[], fallback: string): string {
  const uniqueWords: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const word = item.word.trim();
    if (word.length === 0) {
      continue;
    }

    const normalized = word.toLocaleLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    uniqueWords.push(word);
  }

  if (uniqueWords.length === 0) {
    return fallback;
  }

  if (uniqueWords.length === 1) {
    return uniqueWords[0];
  }

  return uniqueWords.slice(0, 3).join(', ');
}

function buildThemeLabelFromCentroid(
  entries: WordEntry[],
  embeddings: number[][],
  itemIndexes: number[],
  centroid: number[] | undefined,
  fallback: string,
): string {
  if (!centroid || itemIndexes.length === 0) {
    return fallback;
  }

  const rankedIndexes = [...itemIndexes]
    .map((entryIndex) => ({
      entryIndex,
      similarity: cosineSimilarity(embeddings[entryIndex], centroid),
    }))
    .sort((left, right) => right.similarity - left.similarity);

  const terms: string[] = [];
  const seen = new Set<string>();
  for (const row of rankedIndexes) {
    const word = entries[row.entryIndex]?.word?.trim();
    if (!word) {
      continue;
    }

    const normalized = word.toLocaleLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    terms.push(word);
    if (terms.length === 3) {
      break;
    }
  }

  if (terms.length === 0) {
    return fallback;
  }

  return `Тема: ${terms.join(', ')}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function createWordGroupsFromLabels(
  entries: WordEntry[],
  embeddings: number[][],
  labels: number[],
  centroids: number[][],
): GroupDraft[] {
  const grouped = new Map<number, { entryIndexes: number[]; items: WordEntry[] }>();
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const bucket = grouped.get(label) ?? { entryIndexes: [], items: [] };
    bucket.entryIndexes.push(index);
    bucket.items.push(entries[index]);
    grouped.set(label, bucket);
  }

  const drafts: GroupDraft[] = [];
  const sortedLabelPairs = Array.from(grouped.entries())
    .map(([label, groupData]) => ({
      label,
      entryIndexes: groupData.entryIndexes,
      items: [...groupData.items].sort((left, right) => left.id - right.id),
    }))
    .sort((left, right) => left.items[0].id - right.items[0].id);

  sortedLabelPairs.forEach((pair, index) => {
    drafts.push({
      label: buildThemeLabelFromCentroid(
        entries,
        embeddings,
        pair.entryIndexes,
        centroids[pair.label],
        buildMeaningfulLabel(pair.items, `Group ${index + 1}`),
      ),
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
          label: buildMeaningfulLabel(items, `${group.label}.${chunkIndex + 1}`),
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
      label: entries.length < MIN_GROUP_SIZE ? 'other' : buildMeaningfulLabel(entries, 'Group 1'),
      items: [...entries].sort((left, right) => left.id - right.id),
    }];
  }

  const clusterCount = Math.min(entries.length, calcClusterCount(entries.length, targetGroupSize));
  const kmeansResult = kmeans(embeddings, clusterCount, {
    seed: KMEANS_SEED,
    initialization: 'kmeans++',
  });
  const initialGroups = createWordGroupsFromLabels(
    entries,
    embeddings,
    kmeansResult.clusters,
    kmeansResult.centroids,
  );

  return postProcessGroups(initialGroups);
}
