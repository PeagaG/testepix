// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  root: "public", // ou "sitephp", se for essa a pasta do index.html
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  preview: {
    port: parseInt(process.env.PORT || "4173"),
    host: true,
    allowedHosts: ["meus-sites-sitephp.qkqaln.easypanel.host"]
  }
});
