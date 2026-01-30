import { resolve } from 'node:path'
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({
    rollupTypes: true,
  })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "LestrPlugin",
      fileName: 'lestr-plugin',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
});