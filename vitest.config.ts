import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const shared = {
  globals: false as const,
  setupFiles: ["./vitest.setup.ts"],
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { "@": path.resolve(__dirname, ".") },
          tsconfigPaths: true,
        },
        test: {
          ...shared,
          name: "unit",
          environment: "node",
          include: ["tests/logic/**/*.test.ts", "tests/lib/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: { "@": path.resolve(__dirname, ".") },
          tsconfigPaths: true,
        },
        test: {
          ...shared,
          name: "component",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
        },
      },
    ],
  },
})
