import {defineConfig, devices} from "@playwright/test";
import path from "node:path";
import {fileURLToPath} from "node:url";
import dotenv from "dotenv";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..");

dotenv.config({path: path.join(e2eDir, ".env")});
dotenv.config({path: path.join(repoRoot, "apps/backend/.env")});

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const isCi = Boolean(process.env.CI);

export default defineConfig({
    testDir: path.join(e2eDir, "tests"),
    fullyParallel: true,
    forbidOnly: isCi,
    retries: isCi ? 2 : 0,
    workers: isCi ? 1 : undefined,
    reporter: [["list"], ["html", {open: "never"}]],
    outputDir: path.join(e2eDir, "test-results"),
    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],
    webServer: [
        {
            command: "pnpm dev:backend",
            url: "http://localhost:3001/health",
            cwd: repoRoot,
            reuseExistingServer: !isCi,
            timeout: 120_000,
        },
        {
            command: "pnpm -C apps/web dev",
            url: baseURL,
            cwd: repoRoot,
            reuseExistingServer: !isCi,
            timeout: 120_000,
        },
    ],
});
