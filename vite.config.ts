import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
// import commonjs from '@rollup/plugin-commonjs'
// import { nodeResolve } from '@rollup/plugin-node-resolve'
// https://vitejs.dev/config/
console.log(process.versions)
export default defineConfig({

    plugins: [vue(), electron([{
        entry: 'electron/main.ts'
    },
    {
        entry: 'electron/preload.ts',
        onstart(options) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete,
            // instead of restarting the entire Electron App.
            options.reload()
        },
    }]
    ), renderer()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // rollupOptions: {
        //     plugins: [
        //         nodeResolve(),
        //         commonjs({
        //             dynamicRequireTargets: [
        //                 'node_modules/@nut-tree/nut-js/**',
        //                 'node_modules/@nut-tree/libnut/**'
        //             ],
        //             ignoreDynamicRequires: false
        //         })
        //     ]
        // }
    }
})
