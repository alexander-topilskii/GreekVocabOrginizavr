/// <reference lib="webworker" />
import { pipeline } from '@xenova/transformers';

import { clusterEntries } from '../lib/clustering';
import type {
  ModelProgressPayload,
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  WordEntry,
} from '../lib/types';

const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

type FeatureExtractor = Awaited<ReturnType<typeof pipeline>>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

function postMessageToUI(message: WorkerOutgoingMessage): void {
  self.postMessage(message);
}

function toProgressPayload(progressEvent: unknown): ModelProgressPayload {
  if (typeof progressEvent !== 'object' || progressEvent === null) {
    return {
      status: 'Downloading model...',
      progress: 0,
    };
  }

  const event = progressEvent as Record<string, unknown>;
  const progress = typeof event.progress === 'number' ? Math.round(event.progress * 100) : 0;
  const loaded = typeof event.loaded === 'number' ? event.loaded : undefined;
  const total = typeof event.total === 'number' ? event.total : undefined;
  const file = typeof event.file === 'string' ? event.file : undefined;
  const status = typeof event.status === 'string' ? event.status : 'Downloading model...';

  return {
    status,
    progress: Math.max(0, Math.min(100, progress)),
    loaded,
    total,
    file,
  };
}

async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      progress_callback: (event: unknown) => {
        const payload = toProgressPayload(event);
        postMessageToUI({
          type: 'model-progress',
          payload,
        });
      },
    });
  }

  return extractorPromise;
}

async function createEmbedding(extractor: FeatureExtractor, entry: WordEntry): Promise<number[]> {
  const featureExtractor = extractor as unknown as (
    input: string,
    options: { pooling: 'mean' },
  ) => Promise<{ data: ArrayLike<number> }>;
  const output = await featureExtractor(entry.word, {
    pooling: 'mean',
  });
  const outputData = output.data;
  const embedding = Array.from(outputData);
  const norm = Math.sqrt(embedding.reduce((sum, value) => sum + (value * value), 0));
  if (norm === 0) {
    return embedding;
  }
  return embedding.map((value) => value / norm);
}

async function runProcessing(entries: WordEntry[], targetGroupSize: number): Promise<void> {
  postMessageToUI({
    type: 'status',
    payload: { message: 'Loading model...' },
  });
  const extractor = await getExtractor();

  postMessageToUI({
    type: 'status',
    payload: { message: `Generating embeddings for ${entries.length} words...` },
  });

  const embeddings: number[][] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const embedding = await createEmbedding(extractor, entries[index]);
    embeddings.push(embedding);
  }

  postMessageToUI({
    type: 'status',
    payload: { message: 'Clustering words...' },
  });

  const groups = clusterEntries(entries, embeddings, targetGroupSize);
  postMessageToUI({
    type: 'status',
    payload: { message: `Done. ${groups.length} groups created.` },
  });
  postMessageToUI({
    type: 'result',
    payload: { groups },
  });
}

self.onmessage = async (event: MessageEvent<WorkerIncomingMessage>) => {
  if (event.data.type !== 'process') {
    return;
  }

  try {
    await runProcessing(event.data.payload.entries, event.data.payload.targetGroupSize);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error.';
    postMessageToUI({
      type: 'error',
      payload: { message },
    });
  }
};

export {};
