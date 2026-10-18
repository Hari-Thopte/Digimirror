# DigiMirror — complete project with updated frontend

This archive contains the complete original DigiMirror project, including the unchanged backend, original environment files, original frontend source and dependencies present in the supplied ZIP, plus the latest frontend in `frontend/`.

## Run the updated frontend

Use Node.js 22.18+ or 24. From the extracted `DigiMirror` folder:

```powershell
npm --prefix frontend ci
npm run dev -- --port 5175 --strictPort
```

The root dev/build/preview/check/test commands delegate to the updated frontend. The original frontend is retained in `src/`, and its launch commands remain available as dev:legacy/build:legacy/preview:legacy. Original root package and README are retained as package.original.json and README.original.md.

```powershell
npm run build
npm run check
npm test
```

## Backend and environment files

- `backend/` is copied unchanged from the original supplied archive.
- The original root `.env`, `.env.example` and `backend/.env` are included unchanged.
- `frontend/.env` is included. It contains comments only because the updated mock frontend needs no environment variables.
- The original `dev:backend` command is preserved. Backend setup instructions are in `README.original.md`.

The updated frontend remains the requested local, sample-data prototype. Packaging the backend does not connect it to this mock UI. No backend code or real service settings were changed or tested during this packaging step.

For UI changes and validation, see `frontend/IMPROVEMENT-REPORT.md` and `frontend/VALIDATION.md`.