import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: false,
      minify: 'terser',
      emptyOutDir: true,
      outDir: 'dist',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.info', 'console.debug', 'console.warn'],
          passes: 3,
          toplevel: true,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
          beautify: false,
          ascii_only: true,
        },
        keep_fnames: false,
      },
      chunkSizeWarningLimit: 500,
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    logLevel: 'info',
  }
})
