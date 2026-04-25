import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH lets us swap the production base path per host:
//   - GitHub Pages serves at https://<user>.github.io/covenant-planner/  → '/covenant-planner/' (default)
//   - Replit / custom domains serve at the root                          → set BASE_PATH=/
const productionBase = process.env.BASE_PATH ?? '/covenant-planner/';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? productionBase : '/',
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: './index.html',
    }
  }
}))
