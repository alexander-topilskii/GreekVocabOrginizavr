export interface WordEntry {
  id: number;
  word: string;
  translation: string;
  raw: string;
}

export interface WordGroup {
  id: string;
  label: string;
  items: WordEntry[];
}

export interface ProcessPayload {
  entries: WordEntry[];
  targetGroupSize: number;
}

export interface ModelProgressPayload {
  status: string;
  progress: number;
  loaded?: number;
  total?: number;
  file?: string;
}

export interface StatusPayload {
  message: string;
}

export interface ResultPayload {
  groups: WordGroup[];
}

export interface ErrorPayload {
  message: string;
}

export type WorkerIncomingMessage =
  | { type: 'process'; payload: ProcessPayload };

export type WorkerOutgoingMessage =
  | { type: 'model-progress'; payload: ModelProgressPayload }
  | { type: 'status'; payload: StatusPayload }
  | { type: 'result'; payload: ResultPayload }
  | { type: 'error'; payload: ErrorPayload };
