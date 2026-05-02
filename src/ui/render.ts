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
  createEmptyGroupButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  downloadMdButton: HTMLButtonElement;
  downloadCsvButton: HTMLButtonElement;
  downloadTxtButton: HTMLButtonElement;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderDropSlot(groupId: string, index: number): string {
  return `
    <li
      class="drop-slot"
      data-drop-group-id="${groupId}"
      data-drop-index="${index}"
    >
      <span class="drop-slot-line"></span>
    </li>
  `;
}

function renderGroupCards(groups: WordGroup[]): string {
  if (groups.length === 0) {
    return `
      <div class="empty-state">
        <div>
          <p class="empty-state-title">No groups yet</p>
          <p class="empty-state-text">Paste your words, choose a target size, and run semantic clustering.</p>
        </div>
      </div>
    `;
  }

  return groups
    .map((group, index) => {
      const rows: string[] = [renderDropSlot(group.id, 0)];
      group.items.forEach((item, itemIndex) => {
        const textMarkup = item.translation.length > 0
          ? `<span class="group-word">${item.word}</span> <span class="group-translation">- ${item.translation}</span>`
          : `<span class="group-word">${item.word}</span>`;

        rows.push(`
          <li
            class="group-item"
            draggable="true"
            data-drag-group-id="${group.id}"
            data-drag-item-id="${item.id}"
          >
            <span class="drag-handle" aria-hidden="true">⋮⋮</span>
            <span class="group-item-text">${textMarkup}</span>
            <button
              class="item-delete-btn"
              type="button"
              data-remove-group-id="${group.id}"
              data-remove-item-id="${item.id}"
            >
              Удалить
            </button>
          </li>
        `);
        rows.push(renderDropSlot(group.id, itemIndex + 1));
      });

      return `
        <article class="group-card card-enter" data-group-card-id="${group.id}" style="animation-delay: ${Math.min(index * 45, 250)}ms">
          <h3 class="group-title">
            <button
              class="group-drag-handle"
              type="button"
              draggable="true"
              data-drag-group-card-id="${group.id}"
              aria-label="Перетащить список"
            >
              ⠿
            </button>
            <input
              class="group-name-input"
              type="text"
              value="${escapeHtmlAttribute(group.label)}"
              data-rename-group-id="${group.id}"
              aria-label="Название группы"
            />
            <div class="group-title-actions">
              <span class="group-count">${group.items.length}</span>
              <button class="card-delete-group-btn" type="button" data-remove-whole-group-id="${group.id}">
                Удалить список
              </button>
              <button class="card-copy-btn" type="button" data-copy-group-id="${group.id}">
                Copy
              </button>
            </div>
          </h3>
          <ul class="group-list" data-group-list-id="${group.id}">
            ${rows.join('')}
            ${group.items.length === 0 ? '<li class="empty-group-note">Пустой список — перетащите слово сюда</li>' : ''}
          </ul>
        </article>
      `;
    })
    .join('');
}

function renderLoadingSkeleton(): string {
  return Array.from({ length: 6 })
    .map((_, index) => `
      <article class="group-card card-skeleton card-enter" style="animation-delay: ${Math.min(index * 40, 220)}ms">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-short"></div>
      </article>
    `)
    .join('');
}

export function renderLayout(root: HTMLElement): UIRefs {
  root.innerHTML = `
    <main class="app-shell">
      <header class="hero">
        <p class="hero-badge">
          Local AI semantic clustering
        </p>
        <h1 class="hero-title">Greek Vocab Organizavr</h1>
        <p class="hero-description">
          Organize large Greek vocabulary lists into semantic groups fully in the browser, with no server processing.
        </p>
      </header>

      <section class="content-grid">
        <div class="panel panel-left">
          <div class="field-header">
            <label class="field-label" for="words-input">Words list</label>
            <span class="field-hint">one per line</span>
          </div>
          <textarea
            id="words-input"
            class="words-input"
            placeholder="λέξη - word translation"
          ></textarea>

          <div class="range-block">
            <div class="range-top">
              <label class="field-label" for="group-size">Target group size</label>
              <span id="group-size-value" class="range-value">10</span>
            </div>
            <input id="group-size" type="range" min="5" max="15" step="1" value="10" class="range-input" />
            <div class="range-min-max">
              <span>5</span>
              <span>15</span>
            </div>
          </div>

          <button
            id="run-button"
            type="button"
            class="btn btn-primary"
          >
            Organize words
          </button>

          <div class="progress-area">
            <div class="progress-track">
              <div id="progress-bar" class="progress-bar"></div>
            </div>
            <p id="progress-text" class="progress-text">Waiting for input</p>
          </div>

          <p id="error-box" class="error-box is-hidden"></p>

          <div class="actions-grid">
            <button id="copy-button" type="button" class="btn btn-secondary">
              Copy text
            </button>
            <button id="download-md-button" type="button" class="btn btn-secondary">
              Download .md
            </button>
            <button id="download-csv-button" type="button" class="btn btn-secondary">
              Download .csv
            </button>
            <button id="download-txt-button" type="button" class="btn btn-secondary">
              Download .txt
            </button>
          </div>
        </div>

        <section class="panel panel-right">
          <div class="results-top">
            <h2 class="results-title">Grouped words</h2>
            <div class="results-actions">
              <button id="create-empty-group-button" type="button" class="btn btn-secondary btn-create-empty">
                Создать пустой список
              </button>
              <span class="field-hint">semantic blocks</span>
            </div>
          </div>
          <div id="result-grid" class="results-grid"></div>
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
  const createEmptyGroupButton = root.querySelector<HTMLButtonElement>('#create-empty-group-button');
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
    || !createEmptyGroupButton
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
    createEmptyGroupButton,
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
  ui.progressBar.classList.toggle('progress-bar-active', state.isRunning);
  ui.progressText.textContent = state.progressStatus;
  ui.runButton.disabled = state.isRunning;
  ui.runButton.textContent = state.isRunning ? 'Organizing...' : 'Organize words';

  const hasResults = state.groups.length > 0;
  ui.copyButton.disabled = !hasResults || state.isRunning;
  ui.downloadMdButton.disabled = !hasResults || state.isRunning;
  ui.downloadCsvButton.disabled = !hasResults || state.isRunning;
  ui.downloadTxtButton.disabled = !hasResults || state.isRunning;
  ui.createEmptyGroupButton.disabled = state.isRunning;

  if (state.error) {
    ui.errorBox.textContent = state.error;
    ui.errorBox.classList.remove('is-hidden');
  } else {
    ui.errorBox.textContent = '';
    ui.errorBox.classList.add('is-hidden');
  }

  const nextGridMarkup = state.isRunning
    ? renderLoadingSkeleton()
    : renderGroupCards(state.groups);
  if (ui.resultGrid.innerHTML !== nextGridMarkup) {
    ui.resultGrid.innerHTML = nextGridMarkup;
  }
}
