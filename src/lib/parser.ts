import type { WordEntry } from './types';

const SEPARATOR_PATTERN = /\s+-\s+/;

export function parseInput(input: string): WordEntry[] {
  const parsed = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const [wordPart, ...translationParts] = line.split(SEPARATOR_PATTERN);
      const word = (wordPart ?? '').trim();
      const translation = translationParts.join(' - ').trim();

      return {
        id: index,
        word,
        translation,
        raw: line,
      };
    })
    .filter((entry) => entry.word.length > 0);

  const seenWords = new Set<string>();
  const uniqueEntries: WordEntry[] = [];

  for (const entry of parsed) {
    const normalizedWord = entry.word.trim().toLocaleLowerCase();
    if (seenWords.has(normalizedWord)) {
      continue;
    }

    seenWords.add(normalizedWord);
    uniqueEntries.push(entry);
  }

  return uniqueEntries.map((entry, index) => ({
    ...entry,
    id: index,
  }));
}
