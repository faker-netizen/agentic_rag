import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import * as path from "node:path";
// https://vite.dev/config/
export default defineConfig(({mode}) => {
    const isDev = mode === 'development';

    return {
        plugins: [react(), tsconfigPaths()],
        resolve:
            {
                alias:  {
                    '@d2c/components':
                        path.resolve(
                            __dirname,
                            '../../packages/components/src/index.tsx'
                        )
                }
            }
    }
})
