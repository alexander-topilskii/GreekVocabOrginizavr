import type { WordEntry } from './types';

const SEPARATOR_PATTERN = /\s+-\s+/;

export function parseInput(input: string): WordEntry[] {
  return input
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
}
