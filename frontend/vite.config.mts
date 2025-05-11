import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    NodeGlobalsPolyfillPlugin({
      buffer: true,
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
  },
});
