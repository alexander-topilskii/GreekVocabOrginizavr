# Greek Vocab Organizavr



Semantic Greek Word Organizavr (SPA) for clustering large vocabulary lists directly in the browser.

## What It Does

- Takes a list of Greek words (`word` or `word - translation`, one per line)
- Builds local embeddings with `Xenova/paraphrase-multilingual-MiniLM-L12-v2`
- Clusters words semantically with deterministic `k-means`
- Lets you edit results interactively:
  - rename groups
  - delete words or whole groups
  - drag and drop words between groups
  - reorder groups by drag and drop
  - create empty groups manually
- Exports results as `.md`, `.csv`, and `.txt`

## Why It Is Useful

- Works fully in-browser (no server-side processing of your list)
- Handles large input lists (300+ words)
- Produces editable, Quizlet-friendly grouped output

## Quick Start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Input Format

Use one entry per line:

```text
λέξη
λέξη - translation
```

Duplicates are removed automatically by Greek word (case-insensitive).

## Tech Stack

- TypeScript
- Vite
- Tailwind CSS
- Web Workers
- `@xenova/transformers`
- `ml-kmeans`

## Export Formats

- **Markdown (`.md`)**: grouped sections with headings
- **CSV (`.csv`)**: `Слово, Перевод, ID группы`
- **Text (`.txt`)**: grouped word blocks

## Deployment

GitHub Pages workflow is included at:

- `.github/workflows/deploy.yml`
