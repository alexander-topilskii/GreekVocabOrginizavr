import type { UIRefs } from './render';

export interface UIHandlers {
  onRun: () => void;
  onGroupSizeChange: (value: number) => void;
  onCopy: () => void;
  onDownloadMd: () => void;
  onDownloadCsv: () => void;
  onDownloadTxt: () => void;
}

export function bindUIEvents(ui: UIRefs, handlers: UIHandlers): void {
  ui.runButton.addEventListener('click', handlers.onRun);
  ui.groupSizeInput.addEventListener('input', () => {
    const value = Number(ui.groupSizeInput.value);
    handlers.onGroupSizeChange(value);
  });
  ui.copyButton.addEventListener('click', handlers.onCopy);
  ui.downloadMdButton.addEventListener('click', handlers.onDownloadMd);
  ui.downloadCsvButton.addEventListener('click', handlers.onDownloadCsv);
  ui.downloadTxtButton.addEventListener('click', handlers.onDownloadTxt);
}
