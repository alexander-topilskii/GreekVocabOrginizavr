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
    return `
      <div class="col-span-full flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-900/30 p-8 text-center">
        <div>
          <p class="text-base font-medium text-slate-200">No groups yet</p>
          <p class="mt-2 text-sm text-slate-400">Paste your words, choose a target size, and run semantic clustering.</p>
        </div>
      </div>
    `;
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
        <article class="glass rounded-2xl p-4 shadow-[0_10px_35px_-20px_rgba(59,130,246,0.8)] transition hover:-translate-y-0.5 hover:border-indigo-300/30">
          <h3 class="mb-3 flex items-center justify-between gap-2 text-lg font-semibold text-slate-100">
            <span>${group.label}</span>
            <span class="rounded-full border border-white/15 bg-slate-800/70 px-2 py-0.5 text-xs font-medium text-slate-300">${group.items.length}</span>
          </h3>
          <ul class="space-y-1 text-sm text-slate-200">${items}</ul>
        </article>
      `;
    })
    .join('');
}

export function renderLayout(root: HTMLElement): UIRefs {
  root.innerHTML = `
    <main class="mx-auto min-h-screen w-full max-w-7xl p-4 text-slate-100 sm:p-6 lg:p-8">
      <header class="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-900/40 via-slate-900/80 to-emerald-900/30 p-6 shadow-[0_20px_70px_-40px_rgba(99,102,241,0.9)]">
        <p class="inline-flex rounded-full border border-indigo-300/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium tracking-wide text-indigo-200">
          Local AI semantic clustering
        </p>
        <h1 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Greek Vocab Organizavr</h1>
        <p class="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Organize large Greek vocabulary lists into semantic groups fully in the browser, with no server processing.
        </p>
      </header>

      <section class="grid gap-6 xl:grid-cols-[minmax(340px,430px)_1fr]">
        <div class="glass space-y-4 rounded-3xl p-5 sm:p-6">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-semibold text-slate-200" for="words-input">Words list</label>
            <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">one per line</span>
          </div>
          <textarea
            id="words-input"
            class="h-80 w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm leading-relaxed text-slate-100 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/50"
            placeholder="λέξη - word translation"
          ></textarea>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-slate-200" for="group-size">Target group size</label>
              <span id="group-size-value" class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-sm text-slate-200">10</span>
            </div>
            <input id="group-size" type="range" min="5" max="15" step="1" value="10" class="w-full accent-indigo-400" />
            <div class="flex justify-between text-xs text-slate-500">
              <span>5</span>
              <span>15</span>
            </div>
          </div>

          <button
            id="run-button"
            type="button"
            class="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold shadow-[0_12px_25px_-14px_rgba(59,130,246,1)] transition hover:from-indigo-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700"
          >
            Organize words
          </button>

          <div class="space-y-2 pt-1">
            <div class="h-2 overflow-hidden rounded-full bg-slate-800/80">
              <div id="progress-bar" class="h-full w-0 rounded-full bg-emerald-500 transition-all"></div>
            </div>
            <p id="progress-text" class="text-xs text-slate-400">Waiting for input</p>
          </div>

          <p id="error-box" class="hidden rounded-xl border border-red-500/35 bg-red-950/60 p-3 text-sm text-red-200"></p>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <button id="copy-button" type="button" class="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              Copy text
            </button>
            <button id="download-md-button" type="button" class="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              Download .md
            </button>
            <button id="download-csv-button" type="button" class="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              Download .csv
            </button>
            <button id="download-txt-button" type="button" class="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              Download .txt
            </button>
          </div>
        </div>

        <section class="glass rounded-3xl p-5 sm:p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold">Grouped words</h2>
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">semantic blocks</span>
          </div>
          <div id="result-grid" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"></div>
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
