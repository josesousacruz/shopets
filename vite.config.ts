import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
            buildDirectory: 'build', // 👈 força saída em public/build
        }),
        react(),
    ],
    build: {
        outDir: 'public/build', // 👈 garante compatibilidade com Laravel em produção
        manifest: true,
        emptyOutDir: true,
    },
    esbuild: {
        jsx: 'automatic',
    },
});
