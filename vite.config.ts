import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH
  ?? (process.env.GITHUB_ACTIONS ? '/GreekVocabOrginizavr/' : '/');

export default defineConfig({
  base,
});
