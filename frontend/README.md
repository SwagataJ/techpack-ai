# Frontend

React + TypeScript + Vite UI for the TechPack AI generator.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Structure

| File | Purpose |
|------|---------|
| `App.tsx` | Main application — sidebar, file upload, parameters, progress bar, chat panel |
| `App.css` | Global styles, sidebar, toolbar, progress stages, chat |
| `TechSheet.tsx` | 3-page HTML tech sheet with inline editing (Overview, Technical Comments, Sample Size) |
| `TechSheet.css` | Tech sheet layout, page headers, tables, CAD image containers, edit cells |

## Key Components

### App
- File upload with drag-and-drop (up to 10 images)
- Parameter sidebar: season, department, designer, vendor, notes
- Construction-stages progress bar (Cutting → Stitching → Detailing → Fitting → Tech Pack)
- Toolbar with Edit toggle, Undo, Update PDF, Download
- AI chat panel for natural language spec revisions

### TechSheet
- **Page 1 — Overview**: Front/back CAD views, colors, materials, image reference, swatch section
- **Page 2 — Technical Comments**: Annotated front/back views, construction details table (front & back columns)
- **Page 3 — Sample Size**: Measurements table, front/back measurement diagrams

### Inline Editing
- Click any value to edit when Edit mode is active
- Blue dashed outline on hover with "click to edit" tooltip
- Yellow highlight on changed fields
- Save/Cancel buttons per field
- Add/delete rows for all list sections

## Scripts

- `npm run dev` — Start Vite dev server
- `npm run build` — Type-check and build for production
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build
