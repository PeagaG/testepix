import { defineConfig } from "vite";

export default defineConfig({
  root: "public", // aqui está seu index.html
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
