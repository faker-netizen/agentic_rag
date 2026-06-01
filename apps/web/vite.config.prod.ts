import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import {routeManualChunks} from "./vite/routeChunks";

// https://vite.dev/config/
export default defineConfig(() => {
    return {
        plugins: [react(), tsconfigPaths()],
        resolve: {},
        build: {
            rollupOptions: {
                output: {
                    entryFileNames: "assets/entry/[name]-[hash].js",
                    chunkFileNames: "assets/routes/[name]-[hash].js",
                    assetFileNames: "assets/static/[name]-[hash][extname]",
                    manualChunks(id) {
                        return routeManualChunks(id);
                    },
                },
            },
            chunkSizeWarningLimit: 800,
        },
        preview: {
            port: 4173,
            proxy: {
                "/api": {
                    target: "http://localhost:3001",
                    changeOrigin: true,
                },
            },
        },
    };
});
