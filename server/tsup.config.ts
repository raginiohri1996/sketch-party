import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  // The shared package is TypeScript source, so bundle it in; keep real npm deps external.
  noExternal: ["@sketch/shared"],
});
