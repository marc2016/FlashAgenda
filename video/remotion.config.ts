import { Config } from "@remotion/cli/config";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Render with Playwright's headless shell (already installed) instead of downloading a separate browser.
const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), "Library", "Caches", "ms-playwright");
const shell = existsSync(cache)
  ? readdirSync(cache).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse()
      .map((d) => join(cache, d, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"))
      .find((p) => existsSync(p))
  : undefined;
if (shell) Config.setBrowserExecutable(shell);
