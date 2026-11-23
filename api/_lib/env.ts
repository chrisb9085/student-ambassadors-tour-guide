import type { Deps } from "./handlers.js";

/** Server-only settings from Vercel's environment variables (never VITE_-prefixed, so never sent to browsers). */
export const deps = (): Deps => ({
  env: {
    EDITOR_PASSWORD: process.env.EDITOR_PASSWORD,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_REPO: process.env.GITHUB_REPO,
    GITHUB_BRANCH: process.env.GITHUB_BRANCH,
  },
});
