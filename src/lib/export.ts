import type { WordGroup } from './types';

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function toMarkdown(groups: WordGroup[]): string {
  return groups
    .map((group) => {
      const lines = group.items.map((item) => (
        item.translation.length > 0
          ? `- ${item.word} - ${item.translation}`
          : `- ${item.word}`
      ));
      return `## ${group.label}\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

export function toCsv(groups: WordGroup[]): string {
  const header = 'Слово,Перевод,ID группы';
  const rows = groups.flatMap((group) => (
    group.items.map((item) => (
      `${escapeCsv(item.word)},${escapeCsv(item.translation)},${escapeCsv(group.label)}`
    ))
  ));
  return [header, ...rows].join('\n');
}

export function toPlainText(groups: WordGroup[]): string {
  return groups
    .map((group) => {
      const words = group.items.map((item) => item.word).join('\n');
      return `${group.label}\n${words}`;
    })
    .join('\n\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
