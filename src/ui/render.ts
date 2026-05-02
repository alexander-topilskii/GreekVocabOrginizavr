import type { AppState } from '../lib/state';
import type { WordGroup } from '../lib/types';

export interface UIRefs {
  textarea: HTMLTextAreaElement;
  groupSizeInput: HTMLInputElement;
  groupSizeValue: HTMLElement;
  runButton: HTMLButtonElement;
  progressBar: HTMLElement;
  progressText: HTMLElement;
  errorBox: HTMLElement;
  resultGrid: HTMLElement;
  copyButton: HTMLButtonElement;
  downloadMdButton: HTMLButtonElement;
  downloadCsvButton: HTMLButtonElement;
  downloadTxtButton: HTMLButtonElement;
}

function renderGroupCards(groups: WordGroup[]): string {
  if (groups.length === 0) {
    return '<p class="text-sm text-slate-400">No groups yet.</p>';
  }

  return groups
    .map((group) => {
      const items = group.items
        .map((item) => (
          item.translation.length > 0
            ? `<li><span class="font-medium">${item.word}</span> <span class="text-slate-400">- ${item.translation}</span></li>`
            : `<li><span class="font-medium">${item.word}</span></li>`
        ))
        .join('');

      return `
        <article class="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-sm">
          <h3 class="mb-3 text-lg font-semibold text-slate-100">${group.label} (${group.items.length})</h3>
          <ul class="space-y-1 text-sm text-slate-200">${items}</ul>
        </article>
      `;
    })
    .join('');
}

export function renderLayout(root: HTMLElement): UIRefs {
  root.innerHTML = `
    <main class="mx-auto min-h-screen w-full max-w-7xl p-6 text-slate-100">
      <header class="mb-6">
        <h1 class="text-3xl font-bold">Greek Vocab Organizavr</h1>
        <p class="mt-2 text-sm text-slate-400">
          Paste Greek words and group them semantically in your browser.
        </p>
      </header>

      <section class="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div class="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <label class="block text-sm font-semibold" for="words-input">Words list</label>
          <textarea
            id="words-input"
            class="h-72 w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500"
            placeholder="λέξη - word translation"
          ></textarea>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold" for="group-size">Target group size</label>
              <span id="group-size-value" class="text-sm text-slate-300">10</span>
            </div>
            <input id="group-size" type="range" min="5" max="15" step="1" value="10" class="w-full" />
          </div>

          <button
            id="run-button"
            type="button"
            class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Organize words
          </button>

          <div class="space-y-2">
            <div class="h-2 overflow-hidden rounded-full bg-slate-800">
              <div id="progress-bar" class="h-full w-0 rounded-full bg-emerald-500 transition-all"></div>
            </div>
            <p id="progress-text" class="text-xs text-slate-400">Waiting for input</p>
          </div>

          <p id="error-box" class="hidden rounded-md border border-red-600/40 bg-red-900/30 p-2 text-sm text-red-200"></p>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <button id="copy-button" type="button" class="rounded-md border border-slate-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
              Copy text
            </button>
            <button id="download-md-button" type="button" class="rounded-md border border-slate-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
              Download .md
            </button>
            <button id="download-csv-button" type="button" class="rounded-md border border-slate-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
              Download .csv
            </button>
            <button id="download-txt-button" type="button" class="rounded-md border border-slate-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
              Download .txt
            </button>
          </div>
        </div>

        <section class="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 class="mb-4 text-xl font-semibold">Grouped words</h2>
          <div id="result-grid" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"></div>
        </section>
      </section>
    </main>
  `;

  const textarea = root.querySelector<HTMLTextAreaElement>('#words-input');
  const groupSizeInput = root.querySelector<HTMLInputElement>('#group-size');
  const groupSizeValue = root.querySelector<HTMLElement>('#group-size-value');
  const runButton = root.querySelector<HTMLButtonElement>('#run-button');
  const progressBar = root.querySelector<HTMLElement>('#progress-bar');
  const progressText = root.querySelector<HTMLElement>('#progress-text');
  const errorBox = root.querySelector<HTMLElement>('#error-box');
  const resultGrid = root.querySelector<HTMLElement>('#result-grid');
  const copyButton = root.querySelector<HTMLButtonElement>('#copy-button');
  const downloadMdButton = root.querySelector<HTMLButtonElement>('#download-md-button');
  const downloadCsvButton = root.querySelector<HTMLButtonElement>('#download-csv-button');
  const downloadTxtButton = root.querySelector<HTMLButtonElement>('#download-txt-button');

  if (
    !textarea
    || !groupSizeInput
    || !groupSizeValue
    || !runButton
    || !progressBar
    || !progressText
    || !errorBox
    || !resultGrid
    || !copyButton
    || !downloadMdButton
    || !downloadCsvButton
    || !downloadTxtButton
  ) {
    throw new Error('Failed to initialize UI.');
  }

  return {
    textarea,
    groupSizeInput,
    groupSizeValue,
    runButton,
    progressBar,
    progressText,
    errorBox,
    resultGrid,
    copyButton,
    downloadMdButton,
    downloadCsvButton,
    downloadTxtButton,
  };
}

export function renderState(ui: UIRefs, state: AppState): void {
  ui.groupSizeInput.value = String(state.groupSize);
  ui.groupSizeValue.textContent = String(state.groupSize);
  ui.progressBar.style.width = `${Math.max(0, Math.min(100, state.progress))}%`;
  ui.progressText.textContent = state.progressStatus;
  ui.runButton.disabled = state.isRunning;

  const hasResults = state.groups.length > 0;
  ui.copyButton.disabled = !hasResults || state.isRunning;
  ui.downloadMdButton.disabled = !hasResults || state.isRunning;
  ui.downloadCsvButton.disabled = !hasResults || state.isRunning;
  ui.downloadTxtButton.disabled = !hasResults || state.isRunning;

  if (state.error) {
    ui.errorBox.textContent = state.error;
    ui.errorBox.classList.remove('hidden');
  } else {
    ui.errorBox.textContent = '';
    ui.errorBox.classList.add('hidden');
  }

  ui.resultGrid.innerHTML = renderGroupCards(state.groups);
}
