import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("tesseract.js") || id.includes("tesseract.js-core")) return "ocr-engine";
          if (id.includes("mammoth") || id.includes("jszip") || id.includes("xmldom")) return "docx-engine";
          if (id.includes("pdfjs-dist")) return "pdf-engine";
          if (id.includes("exifr")) return "metadata-engine";
          return undefined;
        },
      },
    },
  },
});
