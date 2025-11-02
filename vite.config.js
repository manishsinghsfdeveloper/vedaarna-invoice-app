import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Update the "base" to match your GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/vedaarna-invoice-app/',
})
