import './styles.css';

import { downloadTextFile, toCsv, toMarkdown, toPlainText } from './lib/export';
import { parseInput } from './lib/parser';
import {
  createEmptyGroup,
  createState,
  moveGroup,
  moveItem,
  removeGroup,
  removeItemFromGroup,
  renameGroup,
} from './lib/state';
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
type ActiveDragPayload =
  | { kind: 'item'; sourceGroupId: string; itemId: number }
  | { kind: 'group'; groupId: string };

let activeDragPayload: ActiveDragPayload | null = null;

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

function clearDropSlotHighlight(): void {
  ui.resultGrid.querySelectorAll('.drop-slot-active').forEach((element) => {
    element.classList.remove('drop-slot-active');
  });
}

function clearGroupDropHighlight(): void {
  ui.resultGrid.querySelectorAll('.group-card-drop-active').forEach((element) => {
    element.classList.remove('group-card-drop-active');
  });
}

function parseDropTarget(target: HTMLElement | null): { groupId: string; index: number } | null {
  const dropSlot = target?.closest<HTMLElement>('[data-drop-group-id][data-drop-index]');
  if (!dropSlot) {
    return null;
  }

  const groupId = dropSlot.dataset.dropGroupId;
  const indexRaw = dropSlot.dataset.dropIndex;
  const index = Number(indexRaw);
  if (!groupId || !Number.isInteger(index) || index < 0) {
    return null;
  }

  return { groupId, index };
}

function parseGroupDropTarget(target: HTMLElement | null): { groupId: string } | null {
  const groupCard = target?.closest<HTMLElement>('[data-group-card-id]');
  const groupId = groupCard?.dataset.groupCardId;
  if (!groupId) {
    return null;
  }

  return { groupId };
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

ui.createEmptyGroupButton.addEventListener('click', () => {
  state.groups = createEmptyGroup(state.groups);
  setError(null);
  updateState();
});

ui.resultGrid.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const removeGroupButton = target?.closest<HTMLButtonElement>('[data-remove-whole-group-id]');
  if (removeGroupButton) {
    const groupId = removeGroupButton.dataset.removeWholeGroupId;
    if (groupId) {
      state.groups = removeGroup(state.groups, groupId);
      setError(null);
      updateState();
    }
    return;
  }

  const removeButton = target?.closest<HTMLButtonElement>('[data-remove-group-id][data-remove-item-id]');
  if (removeButton) {
    const groupId = removeButton.dataset.removeGroupId;
    const itemIdRaw = removeButton.dataset.removeItemId;
    const itemId = Number(itemIdRaw);
    if (groupId && Number.isInteger(itemId)) {
      state.groups = removeItemFromGroup(state.groups, groupId, itemId);
      setError(null);
      updateState();
    }
    return;
  }

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

ui.resultGrid.addEventListener('change', (event) => {
  const target = event.target as HTMLElement | null;
  const input = target?.closest<HTMLInputElement>('[data-rename-group-id]');
  if (!input) {
    return;
  }

  const groupId = input.dataset.renameGroupId;
  if (!groupId) {
    return;
  }

  const previousLabel = state.groups.find((group) => group.id === groupId)?.label ?? '';
  const trimmedLabel = input.value.trim();
  if (trimmedLabel.length === 0) {
    input.value = previousLabel;
    return;
  }

  state.groups = renameGroup(state.groups, groupId, trimmedLabel);
  setError(null);
  updateState();
});

ui.resultGrid.addEventListener('dragstart', (event) => {
  if (state.isRunning) {
    return;
  }

  const target = event.target as HTMLElement | null;
  const groupHandle = target?.closest<HTMLElement>('[data-drag-group-card-id]');
  if (groupHandle) {
    const groupId = groupHandle.dataset.dragGroupCardId;
    if (!groupId) {
      return;
    }

    activeDragPayload = { kind: 'group', groupId };
    groupHandle.closest<HTMLElement>('[data-group-card-id]')?.classList.add('group-card-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', groupId);
    }
    return;
  }

  const dragItem = target?.closest<HTMLElement>('[data-drag-group-id][data-drag-item-id]');
  if (!dragItem) {
    return;
  }

  const sourceGroupId = dragItem.dataset.dragGroupId;
  const itemIdRaw = dragItem.dataset.dragItemId;
  const itemId = Number(itemIdRaw);
  if (!sourceGroupId || !Number.isInteger(itemId)) {
    return;
  }

  activeDragPayload = { kind: 'item', sourceGroupId, itemId };
  dragItem.classList.add('group-item-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${sourceGroupId}:${itemId}`);
  }
});

ui.resultGrid.addEventListener('dragover', (event) => {
  if (!activeDragPayload) {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (activeDragPayload.kind === 'group') {
    const dropTarget = parseGroupDropTarget(target);
    if (!dropTarget || dropTarget.groupId === activeDragPayload.groupId) {
      return;
    }

    event.preventDefault();
    clearGroupDropHighlight();
    target?.closest<HTMLElement>('[data-group-card-id]')?.classList.add('group-card-drop-active');
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    return;
  }

  const itemDropTarget = parseDropTarget(target);
  if (!itemDropTarget) {
    return;
  }

  event.preventDefault();
  clearDropSlotHighlight();
  const slot = target?.closest<HTMLElement>('[data-drop-group-id][data-drop-index]');
  slot?.classList.add('drop-slot-active');
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
});

ui.resultGrid.addEventListener('drop', (event) => {
  if (!activeDragPayload) {
    return;
  }

  event.preventDefault();
  const target = event.target as HTMLElement | null;
  clearDropSlotHighlight();
  clearGroupDropHighlight();

  if (activeDragPayload.kind === 'group') {
    const groupDropTarget = parseGroupDropTarget(target);
    if (!groupDropTarget) {
      return;
    }

    state.groups = moveGroup(
      state.groups,
      activeDragPayload.groupId,
      groupDropTarget.groupId,
    );
    setError(null);
    updateState();
    return;
  }

  const dropTarget = parseDropTarget(target);
  if (!dropTarget) {
    return;
  }

  state.groups = moveItem(
    state.groups,
    activeDragPayload.sourceGroupId,
    activeDragPayload.itemId,
    dropTarget.groupId,
    dropTarget.index,
  );
  setError(null);
  updateState();
});

ui.resultGrid.addEventListener('dragend', () => {
  activeDragPayload = null;
  clearDropSlotHighlight();
  clearGroupDropHighlight();
  ui.resultGrid.querySelectorAll('.group-item-dragging').forEach((element) => {
    element.classList.remove('group-item-dragging');
  });
  ui.resultGrid.querySelectorAll('.group-card-dragging').forEach((element) => {
    element.classList.remove('group-card-dragging');
  });
});

updateState();
