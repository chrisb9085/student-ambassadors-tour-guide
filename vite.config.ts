/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // mapbox-gl alone is about 1.9 MB minified (about 560 kB gzipped). The map is the first screen,
    // so splitting it out wouldn't speed up first load. Revisit if the app's own code grows large.
    chunkSizeWarningLimit: 2500,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
