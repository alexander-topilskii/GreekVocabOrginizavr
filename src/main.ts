import './styles.css';

import { downloadTextFile, toCsv, toMarkdown, toPlainText } from './lib/export';
import { parseInput } from './lib/parser';
import { createState } from './lib/state';
import type { WorkerOutgoingMessage } from './lib/types';
import { bindUIEvents } from './ui/events';
import { renderLayout, renderState } from './ui/render';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Cannot find app root.');
}

const state = createState();
const ui = renderLayout(app);
const worker = new Worker(new URL('./worker/worker.ts', import.meta.url), { type: 'module' });

function updateState(): void {
  renderState(ui, state);
}

function setError(message: string | null): void {
  state.error = message;
}

function setRunning(value: boolean): void {
  state.isRunning = value;
}

function setProgress(progress: number, status: string): void {
  state.progress = progress;
  state.progressStatus = status;
}

async function copyResults(): Promise<void> {
  if (state.groups.length === 0) {
    return;
  }

  const text = toPlainText(state.groups);
  await navigator.clipboard.writeText(text);
  state.progressStatus = 'Copied grouped text to clipboard.';
  updateState();
}

function formatGroupForQuizlet(groupId: string): string | null {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) {
    return null;
  }

  return group.items
    .map((item) => (
      item.translation.length > 0
        ? `${item.word}\t${item.translation}`
        : item.word
    ))
    .join('\n');
}

function startProcessing(): void {
  const entries = parseInput(ui.textarea.value);
  if (entries.length === 0) {
    setError('Please paste at least one Greek word.');
    updateState();
    return;
  }

  if (entries.length < 5) {
    setError('Please provide at least 5 words for meaningful grouping.');
    updateState();
    return;
  }

  setError(null);
  setRunning(true);
  setProgress(1, `Starting processing (${entries.length} words)...`);
  updateState();

  worker.postMessage({
    type: 'process',
    payload: {
      entries,
      targetGroupSize: state.groupSize,
    },
  });
}

worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
  const { data } = event;

  if (data.type === 'model-progress') {
    const suffix = data.payload.file ? ` (${data.payload.file})` : '';
    setProgress(
      data.payload.progress,
      `${data.payload.status}${suffix}`,
    );
  }

  if (data.type === 'status') {
    state.progressStatus = data.payload.message;
  }

  if (data.type === 'result') {
    state.groups = data.payload.groups;
    setRunning(false);
    setProgress(100, `Done. ${state.groups.length} groups ready.`);
  }

  if (data.type === 'error') {
    setRunning(false);
    setProgress(0, 'Failed.');
    setError(data.payload.message);
  }

  updateState();
};

bindUIEvents(ui, {
  onRun: startProcessing,
  onGroupSizeChange: (value) => {
    state.groupSize = value;
    updateState();
  },
  onCopy: () => {
    copyResults().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Copy failed.';
      setError(message);
      updateState();
    });
  },
  onDownloadMd: () => {
    if (state.groups.length === 0) {
      return;
    }
    downloadTextFile('greek-groups.md', toMarkdown(state.groups));
  },
  onDownloadCsv: () => {
    if (state.groups.length === 0) {
      return;
    }
    downloadTextFile('greek-groups.csv', toCsv(state.groups));
  },
  onDownloadTxt: () => {
    if (state.groups.length === 0) {
      return;
    }
    downloadTextFile('greek-groups.txt', toPlainText(state.groups));
  },
});

ui.resultGrid.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('[data-copy-group-id]');
  if (!button) {
    return;
  }

  const groupId = button.dataset.copyGroupId;
  if (!groupId) {
    return;
  }

  const quizletText = formatGroupForQuizlet(groupId);
  if (!quizletText) {
    return;
  }

  navigator.clipboard.writeText(quizletText)
    .then(() => {
      state.progressStatus = 'Group copied in Quizlet format.';
      setError(null);
      updateState();
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Group copy failed.';
      setError(message);
      updateState();
    });
});

updateState();
