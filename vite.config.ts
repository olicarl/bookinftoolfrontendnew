import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    preact(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '"VITE_SUPABASE_URL_PLACEHOLDER"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '"VITE_SUPABASE_ANON_KEY_PLACEHOLDER"'
  }
}); 