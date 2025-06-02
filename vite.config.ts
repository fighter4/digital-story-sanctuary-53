// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Assuming this is for dev only
// The copyPdfWorker plugin is likely no longer needed with the `?url` import strategy for the worker.
// import { copyFileSync, mkdirSync } from "fs"; 

// const copyPdfWorker = () => {
//   return {
//     name: 'copy-pdf-worker',
//     buildStart() {
//       try {
//         mkdirSync('public', { recursive: true });
//         const workerPath = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.js');
//         const publicWorkerPath = path.resolve('public/pdf.worker.min.js');
//         copyFileSync(workerPath, publicWorkerPath);
//         console.log('PDF.js worker copied to public directory (vite.config.ts)');
//       } catch (error) {
//         console.warn('Failed to copy PDF.js worker (vite.config.ts):', error);
//       }
//     }
//   };
// };

export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Allows access from network
    port: 8080,
  },
  plugins: [
    react(),
    // copyPdfWorker(), // Commented out or remove if `?url` import in main.tsx works
    // mode === 'development' && componentTagger(), 
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Vite should handle assets imported with `?url` correctly.
  // If you face issues with the worker in the build, you might need to explore
  // build.rollupOptions.output.manualChunks or other worker-specific Vite options.
  // However, `?url` is usually sufficient.
}));
