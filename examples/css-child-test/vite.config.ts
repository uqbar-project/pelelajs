import { defineConfig } from 'vite'
import { pelelajsPlugin } from 'vite-plugin-pelelajs'

export default defineConfig({
  plugins: [pelelajsPlugin()],
  build: {
    assetsInlineLimit: (filePath: string) => {
      if (filePath.endsWith('.css')) {
        return false
      }
    },
  },
})
