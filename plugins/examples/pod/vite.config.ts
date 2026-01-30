import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz'
    })
  ],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'Pod',
      fileName: 'pod',
      formats: ['es']
    },
    minify: 'terser',
    terserOptions: {
      // compress: { pure_funcs: ['console.info', 'console.debug', 'console.log'] },
      format: { comments: false }
    },
    target: 'esnext',
    rollupOptions: {
      // external: ['react', 'react-dom'],
      // output: {
      //   globals: {
      //     react: 'React',
      //     'react-dom': 'ReactDOM'
      //   },
      //   // manualChunks(id) {
      //   //   if (id.includes('node_modules')) return 'vendor';
      //   // }
      // }
    }
  }
})
