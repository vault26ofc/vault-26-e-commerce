import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: true },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Source files: group all admin code together
          if (!id.includes("node_modules")) {
            if (
              id.includes("/pages/admin/") ||
              id.includes("/components/admin/")
            )
              return "admin";
            return undefined;
          }

          // npm packages: each key domain as its own cacheable chunk
          if (id.includes("recharts") || id.includes("/d3-"))
            return "charts";
          if (id.includes("framer-motion")) return "animations";
          if (id.includes("@supabase/")) return "supabase";
          if (
            id.includes("@radix-ui/") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("embla-carousel") ||
            id.includes("input-otp") ||
            id.includes("react-resizable-panels") ||
            id.includes("react-day-picker")
          )
            return "ui";
          if (id.includes("lucide-react")) return "icons";
          if (
            id.includes("react-router-dom") ||
            id.includes("react-router/")
          )
            return "router";
          if (id.includes("@tanstack/")) return "query";
          if (
            id.includes("zustand") ||
            id.includes("zod") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform/")
          )
            return "state";
          if (id.includes("date-fns")) return "datefns";
          return "vendor";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "framer-motion",
      "zustand",
      "@supabase/supabase-js",
    ],
  },
}));
