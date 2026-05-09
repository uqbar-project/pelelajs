import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'tsup'

const cliEntry = path.resolve(__dirname, '../../tools/pelela-cli/src/index.ts')
const templatesDir = path.resolve(__dirname, '../../tools/pelela-cli/templates')

// Fail fast if external dependencies are missing
if (!fs.existsSync(cliEntry)) {
  throw new Error(`CLI entry point not found at: ${cliEntry}`)
}
if (!fs.existsSync(templatesDir)) {
  throw new Error(`CLI templates directory not found at: ${templatesDir}`)
}

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'esnext',
    outDir: 'dist',
    external: ['i18next'],
  },
  {
    entry: {
      cli: cliEntry,
    },
    format: ['cjs'],
    target: 'node22',
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
    noExternal: ['chalk', 'cli-box', 'commander', 'semver', 'i18next'],
    publicDir: templatesDir,
    onSuccess: async () => {
      try {
        const distPath = path.resolve(__dirname, 'dist')
        const entries = fs.readdirSync(distPath, { recursive: true, withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name === 'node_modules') {
            const fullPath = path.join(entry.parentPath, entry.name)
            fs.rmSync(fullPath, { recursive: true, force: true })
          }
        }
      } catch (error) {
        console.error('Failed to clean node_modules from dist:', error)
      }
    },
  },
])
