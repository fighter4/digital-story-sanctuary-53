
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, mkdirSync } from "fs";

// Copy PDF.js worker to public directory
const copyPdfWorker = () => {
  return {
    name: 'copy-pdf-worker',
    buildStart() {
      try {
        // Ensure public directory exists
        mkdirSync('public', { recursive: true });
        
        // Copy the worker file
        const workerPath = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.js');
        const publicWorkerPath = path.resolve('public/pdf.worker.min.js');
        copyFileSync(workerPath, publicWorkerPath);
        console.log('PDF.js worker copied to public directory');
      } catch (error) {
        console.warn('Failed to copy PDF.js worker:', error);
      }
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    copyPdfWorker(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
