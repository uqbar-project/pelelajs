import { defineConfig } from 'tsup'

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
      cli: '../../tools/pelela-cli/src/index.ts',
    },
    format: ['esm'],
    target: 'node22',
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
    noExternal: ['chalk', 'cli-box', 'commander', 'semver', 'i18next'],
    publicDir: '../../tools/pelela-cli/templates',
  },
])
