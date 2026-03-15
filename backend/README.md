# Backend

Express + TypeScript API server that handles image processing, AI-powered spec extraction, CAD generation, and PDF assembly.

## Setup

```bash
npm install
cp .env.example .env
# Add your service-account.json to this directory
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SERVICE_ACCOUNT_KEY_PATH` | Path to Google Cloud service account JSON key |
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_LOCATION` | Vertex AI region (default: `us-central1`) |
| `PORT` | Server port (default: `3001`) |

## API Endpoints

### Upload
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload a single image |
| `POST` | `/api/upload/multiple` | Upload multiple images |

### Tech Pack
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/techpack/generate` | Start tech pack generation |
| `GET` | `/api/techpack/status/:jobId` | Poll job status and progress |
| `GET` | `/api/techpack/specs/:jobId` | Get extracted specifications |
| `POST` | `/api/techpack/regenerate/:jobId` | Regenerate PDF with edited specs |
| `POST` | `/api/techpack/chat/:jobId` | AI chat to revise specs |
| `GET` | `/api/techpack/images/:jobId/:type` | Serve CAD images (front, back, annotated-front, etc.) |
| `GET` | `/api/techpack/originals/:jobId/:index` | Serve uploaded reference images |
| `GET` | `/api/techpack/download/:pdfId` | Download generated PDF |

## Services

| File | Purpose |
|------|---------|
| `vertexai.service.ts` | Google Vertex AI client initialization |
| `specs.service.ts` | Garment specification extraction via Gemini |
| `cad.service.ts` | CAD flat drawing generation via Gemini image model |
| `classifier.service.ts` | Multi-image classification (selects best front/back) |
| `chat.service.ts` | AI-powered spec revision from natural language |
| `pdf.service.ts` | Multi-page PDF generation with PDFKit |
| `queue.service.ts` | Rate-limited concurrency queue for API calls |

## Scripts

- `npm run dev` — Start dev server with hot reload (tsx watch)
- `npm run build` — Compile TypeScript
- `npm start` — Run compiled output
