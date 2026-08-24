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

    /**
     * Vite dependency pre-bundling
     *
     * Keep this list small.
     * Over-including dependencies can increase dev startup work.
     */
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "lucide-react",
      ],

      exclude: [
        "framer-motion",
      ],
    },

    build: {
      /**
       * Don't generate production source maps.
       * This keeps the final build smaller.
       */
      sourcemap: false,

      /**
       * Keep CSS split between async chunks.
       */
      cssCodeSplit: true,

      /**
       * Modern browsers don't need the preload polyfill.
       * Removing it saves a small amount of JS.
       */
      modulePreload: {
        polyfill: false,
      },

      /**
       * Production target.
       *
       * If you need very old browsers, use "es2019".
       */
      target: "es2020",

      /**
       * Minification.
       */
      minify: "esbuild",

      /**
       * Better tree-shaking.
       */
      rollupOptions: {
        treeshake: {
          preset: "recommended",
          moduleSideEffects: "no-external",
        },

        output: {
          /**
           * Stable and predictable chunking.
           */
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            /**
             * ------------------------------------------------
             * React
             * ------------------------------------------------
             */
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "react-vendor";
            }

            /**
             * ------------------------------------------------
             * Supabase
             * ------------------------------------------------
             *
             * Keep Supabase isolated because it is relatively
             * large and shouldn't block unrelated UI chunks.
             */
            if (
              id.includes("@supabase/") ||
              id.includes("/supabase-js/") ||
              id.includes("/auth-js/") ||
              id.includes("/realtime-js/") ||
              id.includes("/postgrest-js/") ||
              id.includes("/storage-js/") ||
              id.includes("/functions-js/")
            ) {
              return "supabase";
            }

            /**
             * ------------------------------------------------
             * Lucide
             * ------------------------------------------------
             */
            if (id.includes("/lucide-react/")) {
              return "icons";
            }

            /**
             * ------------------------------------------------
             * Motion
             * ------------------------------------------------
             */
            if (
              id.includes("/framer-motion/") ||
              id.includes("/motion/")
            ) {
              return "motion";
            }

            /**
             * ------------------------------------------------
             * Stripe
             * ------------------------------------------------
             */
            if (
              id.includes("/stripe/") ||
              id.includes("@stripe/")
            ) {
              return "stripe";
            }

            /**
             * ------------------------------------------------
             * Everything else
             * ------------------------------------------------
             *
             * Don't create hundreds of tiny chunks.
             */
            return "vendor";
          },

          /**
           * More readable asset names.
           */
          assetFileNames: "assets/[name]-[hash][extname]",

          /**
           * JS chunks.
           */
          chunkFileNames: "assets/[name]-[hash].js",

          /**
           * Entry files.
           */
          entryFileNames: "assets/[name]-[hash].js",
        },
      },

      /**
       * Only warn when a chunk gets really large.
       */
      chunkSizeWarningLimit: 350,

      /**
       * Clean output directory before every build.
       */
      emptyOutDir: true,
    },

    /**
     * Development server.
     */
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

      /**
       * HMR can be disabled with:
       *
       * $env:DISABLE_HMR="true"
       */
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

    /**
     * Preview server.
     */
    preview: {
      port: 4173,
      strictPort: false,
    },
  };
});