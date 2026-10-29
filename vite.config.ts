import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(() => {
  const analyze = process.env.ANALYZE === "true";

  return {
    plugins: [
      react(),
      tailwindcss(),

      ...(analyze
        ? [
            visualizer({
              filename: "dist/stats.html",
              open: true,
              gzipSize: true,
              brotliSize: true,
              template: "treemap",
            }),
          ]
        : []),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "lucide-react",
      ],

      exclude: [
        "framer-motion",
        "@supabase/supabase-js",
      ],
    },

    build: {
      sourcemap: false,

      cssCodeSplit: true,

      modulePreload: {
        polyfill: false,
      },

      target: "es2020",

      minify: "esbuild",

      rollupOptions: {
        treeshake: {
          preset: "recommended",
          moduleSideEffects: "no-external",
        },

        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            /*
             * ==================================================
             * REACT CORE
             * ==================================================
             */

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "react-vendor";
            }

            /*
             * ==================================================
             * SUPABASE
             * ==================================================
             *
             * Supabase is kept isolated.
             * It should not be mixed into the normal vendor chunk.
             */

            if (
              id.includes("/@supabase/") ||
              id.includes("/supabase-js/") ||
              id.includes("/auth-js/") ||
              id.includes("/realtime-js/") ||
              id.includes("/postgrest-js/") ||
              id.includes("/storage-js/") ||
              id.includes("/functions-js/")
            ) {
              return "supabase";
            }

            /*
             * ==================================================
             * MOTION
             * ==================================================
             */

            if (
              id.includes("/framer-motion/") ||
              id.includes("/motion/")
            ) {
              return "motion";
            }

            /*
             * ==================================================
             * WAVESURFER
             * ==================================================
             *
             * Project editor dependency.
             * Keeping it isolated prevents it from contaminating
             * the normal vendor chunk.
             */

            if (id.includes("/wavesurfer.js/")) {
              return "wavesurfer";
            }

            /*
             * ==================================================
             * GOOGLE / AI CLIENTS
             * ==================================================
             *
             * These should ideally remain backend-only.
             * If any accidentally reaches the frontend, keeping
             * it isolated makes the problem obvious in the report.
             */

            if (
              id.includes("/@google/genai/") ||
              id.includes("/googleapis/")
            ) {
              return "google-api";
            }

            /*
             * ==================================================
             * STRIPE
             * ==================================================
             */

            if (
              id.includes("/stripe/") ||
              id.includes("/@stripe/")
            ) {
              return "stripe";
            }

            /*
             * ==================================================
             * ICONS
             * ==================================================
             *
             * Keep Lucide separate so it doesn't inflate the
             * generic vendor chunk.
             */

            if (id.includes("/lucide-react/")) {
              return "icons";
            }

            /*
             * ==================================================
             * EVERYTHING ELSE
             * ==================================================
             */

            return "vendor";
          },

          assetFileNames: "assets/[name]-[hash][extname]",

          chunkFileNames: "assets/[name]-[hash].js",

          entryFileNames: "assets/[name]-[hash].js",
        },
      },

      chunkSizeWarningLimit: 350,

      emptyOutDir: true,
    },

    server: {
      port: 5173,

      strictPort: false,

      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },

      hmr: process.env.DISABLE_HMR !== "true",

      watch: {
        ignored: [
          "**/media/**",
          "**/uploads/**",
          "**/tmp/**",
          "**/node_modules/**",
          "**/dist/**",
        ],
      },
    },

    preview: {
      port: 4173,
      strictPort: false,
    },
  };
});