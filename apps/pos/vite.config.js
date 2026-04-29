import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    base: './',
    plugins: [
        react(),
        VitePWA({
            // injectManifest: src/sw.ts ni olib, __WB_MANIFEST inject qiladi
            // Output: dist/sw.js  →  /sw.js sifatida serve qilinadi
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            registerType: 'autoUpdate',
            injectRegister: null, // sync.service.ts o'zi register qiladi
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
                globIgnores: ['**/node_modules/**', '**/sw.js', '**/workbox-*.js'],
            },
            manifest: {
                name: 'Oshxona POS',
                short_name: 'OshxonaPOS',
                description: 'Restoran kassa va boshqaruv tizimi',
                theme_color: '#1a1a2e',
                background_color: '#1a1a2e',
                display: 'standalone',
                orientation: 'any',
                scope: '/',
                start_url: '/',
                id: 'uz.oshxona.pos',
                icons: [
                    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                ],
            },
            devOptions: {
                enabled: true,
                type: 'module',
                navigateFallback: 'index.html',
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://localhost:3002',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3002',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    query: ['@tanstack/react-query'],
                    ui: ['lucide-react', 'clsx', 'tailwind-merge'],
                    socket: ['socket.io-client'],
                },
            },
        },
    },
});
